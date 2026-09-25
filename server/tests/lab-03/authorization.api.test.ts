import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const prisma = getPrisma();

describe("Authorization & Scoping Tests (API-07)", () => {
  it("API-07: Derives requester identity from authenticated session, ignoring client-supplied requesterId spoof", async () => {
    // 1. Log in as Jennifer Anderson (User ID 1)
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "jennifer.anderson@kmutt.ac.th",
        password: "Password123!",
      });

    expect(loginRes.status).toBe(200);
    const cookie = loginRes.headers["set-cookie"];
    const loggedInUserId = loginRes.body.user.id;

    // 2. Attempt to create ticket with spoofed requesterId: 999 (or another user ID)
    const ticketPayload = {
      requesterId: 999, // Attempted spoof
      categoryId: 1,
      relatedSystemId: 1,
      requestedPriority: "HIGH",
      summary: "Security spoof test ticket summary",
      description: "Testing whether server derives requester identity from session.",
    };

    const createRes = await request(app)
      .post("/api/v1/tickets")
      .set("Cookie", cookie)
      .send(ticketPayload);

    expect(createRes.status).toBe(201);
    expect(createRes.body.ticketNo).toBeDefined();

    const createdTicketNo = createRes.body.ticketNo;

    // 3. Inspect persisted database record
    const ticketInDb = await prisma.ticket.findUnique({
      where: { ticketNo: createdTicketNo },
    });

    expect(ticketInDb).toBeDefined();
    // Must be bound to Jennifer Anderson (id: loggedInUserId), NOT 999
    expect(ticketInDb?.requesterId).toBe(loggedInUserId);
  });

  it("API-08: Requester attempts to access IT Staff queue returns HTTP 403 Forbidden (FR-12, AC-13)", async () => {
    // 1. Log in as Jennifer Anderson (Role: REQUESTER)
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "jennifer.anderson@kmutt.ac.th",
        password: "Password123!",
      });

    expect(loginRes.status).toBe(200);
    const cookie = loginRes.headers["set-cookie"];

    // 2. Requester sends GET /api/v1/tickets without authorization to IT Staff Queue
    const res = await request(app)
      .get("/api/v1/tickets")
      .set("Cookie", cookie);

    // 3. Verify HTTP 403 FORBIDDEN and zero ticket records returned
    expect(res.status).toBe(403);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(res.body.tickets).toBeUndefined();
  });

  it("API-09: IT Staff and Administrator can view any ticket detail, while unauthorized Requester receives 403 (FR-13, Role Matrix)", async () => {
    // 1. Ensure a ticket created by Sarah (or non-Jennifer requester) exists
    const user2 = await prisma.user.findFirst({
      where: { role: "REQUESTER", email: { not: "jennifer.anderson@kmutt.ac.th" } },
    });
    expect(user2).toBeDefined();

    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();

    const targetTicket = await prisma.ticket.upsert({
      where: { ticketNo: "TKT-2026-99001" },
      update: {},
      create: {
        ticketNo: "TKT-2026-99001",
        title: "Staff Detail Access Verification Ticket",
        description: "Testing staff and admin access to ticket detail.",
        requesterId: user2!.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        status: "NEW",
      },
    });

    // 2. Log in as IT Staff (Malee Jaidee)
    const staffLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "staff.malee@kmutt.ac.th",
        password: "Password123!",
      });
    expect(staffLogin.status).toBe(200);
    const staffCookie = staffLogin.headers["set-cookie"];

    // IT Staff can view Sarah's ticket
    const staffViewRes = await request(app)
      .get(`/api/v1/tickets/${targetTicket.id}`)
      .set("Cookie", staffCookie);
    expect(staffViewRes.status).toBe(200);
    expect(staffViewRes.body).toHaveProperty("id", targetTicket.id);
    expect(staffViewRes.body).toHaveProperty("summary");

    // 3. Log in as Administrator (Admin TokTickIT)
    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "admin.toktickit@kmutt.ac.th",
        password: "Password123!",
      });
    expect(adminLogin.status).toBe(200);
    const adminCookie = adminLogin.headers["set-cookie"];

    // Administrator can view target ticket
    const adminViewRes = await request(app)
      .get(`/api/v1/tickets/${targetTicket.id}`)
      .set("Cookie", adminCookie);
    expect(adminViewRes.status).toBe(200);
    expect(adminViewRes.body).toHaveProperty("id", targetTicket.id);

    // 4. Log in as a different Requester (Jennifer Anderson)
    const requesterLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "jennifer.anderson@kmutt.ac.th",
        password: "Password123!",
      });
    expect(requesterLogin.status).toBe(200);
    const requesterCookie = requesterLogin.headers["set-cookie"];

    // Jennifer is forbidden from viewing target ticket owned by another requester
    const requesterViewRes = await request(app)
      .get(`/api/v1/tickets/${targetTicket.id}`)
      .set("Cookie", requesterCookie);
    expect(requesterViewRes.status).toBe(403);
    expect(requesterViewRes.body.error.code).toBe("FORBIDDEN");
  });

  it("API-09: Requester attempts to read or post Internal Notes returns HTTP 403 Forbidden (FR-19, BR-04, AC-04)", async () => {
    // 1. Create a ticket owned by Jennifer
    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();
    const jennifer = await prisma.user.findUnique({
      where: { email: "jennifer.anderson@kmutt.ac.th" },
    });

    const ticket = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-NOTE-AUTH-${Date.now()}`,
        title: "Requester Note Guard Ticket",
        description: "Checking that requester cannot access or post internal notes.",
        requesterId: jennifer!.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
        requestedPriority: "LOW",
        itPriority: "LOW",
        status: "IN_PROGRESS",
      },
    });

    const reqLogin = await request(app).post("/api/v1/auth/login").send({
      email: "jennifer.anderson@kmutt.ac.th",
      password: "Password123!",
    });
    const requesterCookie = reqLogin.headers["set-cookie"];

    // Requester GET /notes -> 403
    const getNotesRes = await request(app)
      .get(`/api/v1/tickets/${ticket.id}/notes`)
      .set("Cookie", requesterCookie);
    expect(getNotesRes.status).toBe(403);
    expect(getNotesRes.body.error.code).toBe("FORBIDDEN");

    // Requester POST /notes -> 403
    const postNoteRes = await request(app)
      .post(`/api/v1/tickets/${ticket.id}/notes`)
      .set("Cookie", requesterCookie)
      .send({ content: "Sneaky internal note attempt" });
    expect(postNoteRes.status).toBe(403);
    expect(postNoteRes.body.error.code).toBe("FORBIDDEN");
  });

  it("API-11: Requester attempts to modify IT Priority returns HTTP 403 Forbidden (FR-15)", async () => {
    const jennifer = await prisma.user.findUnique({
      where: { email: "jennifer.anderson@kmutt.ac.th" },
    });
    const ticket = await prisma.ticket.findFirst({
      where: { requesterId: jennifer!.id },
    });

    const reqLogin = await request(app).post("/api/v1/auth/login").send({
      email: "jennifer.anderson@kmutt.ac.th",
      password: "Password123!",
    });
    const requesterCookie = reqLogin.headers["set-cookie"];

    const res = await request(app)
      .patch(`/api/v1/tickets/${ticket!.id}`)
      .set("Cookie", requesterCookie)
      .send({ itPriority: "CRITICAL", version: ticket!.version });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("API-12: Requester attempts to transition status to Resolved/Closed returns HTTP 403 Forbidden (FR-16, BR-05)", async () => {
    const jennifer = await prisma.user.findUnique({
      where: { email: "jennifer.anderson@kmutt.ac.th" },
    });
    const ticket = await prisma.ticket.findFirst({
      where: { requesterId: jennifer!.id },
    });

    const reqLogin = await request(app).post("/api/v1/auth/login").send({
      email: "jennifer.anderson@kmutt.ac.th",
      password: "Password123!",
    });
    const requesterCookie = reqLogin.headers["set-cookie"];

    const resResolved = await request(app)
      .patch(`/api/v1/tickets/${ticket!.id}`)
      .set("Cookie", requesterCookie)
      .send({
        status: "RESOLVED",
        resolutionSummary: "Attempted self resolution by requester",
        version: ticket!.version,
      });

    expect(resResolved.status).toBe(403);
    expect(resResolved.body.error.code).toBe("FORBIDDEN");

    const resClosed = await request(app)
      .patch(`/api/v1/tickets/${ticket!.id}`)
      .set("Cookie", requesterCookie)
      .send({
        status: "CLOSED",
        resolutionSummary: "Attempted direct close by requester",
        version: ticket!.version,
      });

    expect(resClosed.status).toBe(403);
    expect(resClosed.body.error.code).toBe("FORBIDDEN");
  });

  it("API-10: Non-Administrator attempts to access Admin API returns HTTP 403 Forbidden (FR-28, AC-13)", async () => {
    // 1. Unauthenticated access receives 401
    const unauthRes = await request(app).get("/api/v1/admin/users");
    expect(unauthRes.status).toBe(401);
    expect(["UNAUTHORIZED", "UNAUTHENTICATED"]).toContain(unauthRes.body.error.code);

    // 2. Requester access receives 403
    const reqLogin = await request(app).post("/api/v1/auth/login").send({
      email: "jennifer.anderson@kmutt.ac.th",
      password: "Password123!",
    });
    const requesterCookie = reqLogin.headers["set-cookie"];

    const reqGetRes = await request(app)
      .get("/api/v1/admin/users")
      .set("Cookie", requesterCookie);
    expect(reqGetRes.status).toBe(403);
    expect(reqGetRes.body.error.code).toBe("FORBIDDEN");

    const reqPostRes = await request(app)
      .post("/api/v1/admin/users")
      .set("Cookie", requesterCookie)
      .send({
        displayName: "Hacker User",
        email: "hacker@kmutt.ac.th",
        role: "ADMINISTRATOR",
        initialPassword: "Password123!",
      });
    expect(reqPostRes.status).toBe(403);
    expect(reqPostRes.body.error.code).toBe("FORBIDDEN");

    // 3. IT Staff access receives 403
    const staffLogin = await request(app).post("/api/v1/auth/login").send({
      email: "staff.somchai@kmutt.ac.th",
      password: "Password123!",
    });
    const staffCookie = staffLogin.headers["set-cookie"];

    const staffGetRes = await request(app)
      .get("/api/v1/admin/users")
      .set("Cookie", staffCookie);
    expect(staffGetRes.status).toBe(403);
    expect(staffGetRes.body.error.code).toBe("FORBIDDEN");

    const staffPatchRes = await request(app)
      .patch("/api/v1/admin/users/1")
      .set("Cookie", staffCookie)
      .send({ displayName: "Modified By Staff" });
    expect(staffPatchRes.status).toBe(403);
    expect(staffPatchRes.body.error.code).toBe("FORBIDDEN");

    const staffResetRes = await request(app)
      .post("/api/v1/admin/users/1/reset-password")
      .set("Cookie", staffCookie)
      .send({ initialPassword: "Password123!" });
    expect(staffResetRes.status).toBe(403);
    expect(staffResetRes.body.error.code).toBe("FORBIDDEN");
  });
});


