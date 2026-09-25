import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const prisma = getPrisma();

describe("Public Comments & Internal Notes API Integration Tests (API-23, API-24, API-25)", () => {
  let staffCookie: string[];
  let adminCookie: string[];
  let requesterCookie: string[];
  let otherRequesterCookie: string[];
  let testTicketId: number;

  beforeAll(async () => {
    // 1. Log in as IT Staff Somchai
    const staffLogin = await request(app).post("/api/v1/auth/login").send({
      email: "staff.somchai@kmutt.ac.th",
      password: "Password123!",
    });
    staffCookie = staffLogin.headers["set-cookie"];

    // 2. Log in as Admin
    const adminLogin = await request(app).post("/api/v1/auth/login").send({
      email: "admin.toktickit@kmutt.ac.th",
      password: "Password123!",
    });
    adminCookie = adminLogin.headers["set-cookie"];

    // 3. Log in as Requester Jennifer
    const reqLogin = await request(app).post("/api/v1/auth/login").send({
      email: "jennifer.anderson@kmutt.ac.th",
      password: "Password123!",
    });
    requesterCookie = reqLogin.headers["set-cookie"];

    // 4. Log in as Requester Sarah
    const req2Login = await request(app).post("/api/v1/auth/login").send({
      email: "sarah.johnson@kmutt.ac.th",
      password: "Password123!",
    });
    otherRequesterCookie = req2Login.headers["set-cookie"];

    // 5. Create dedicated test ticket owned by Jennifer
    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();
    const jennifer = await prisma.user.findUnique({
      where: { email: "jennifer.anderson@kmutt.ac.th" },
    });

    const ticket = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-COMM-${Date.now()}`,
        title: "Comments & Notes Verification Ticket",
        description: "Testing public comments thread and internal notes segregation.",
        requesterId: jennifer!.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
        requestedPriority: "LOW",
        itPriority: "LOW",
        status: "IN_PROGRESS",
      },
    });

    testTicketId = ticket.id;
  });

  it("API-23: Post and retrieve Public Comments in chronological order", async () => {
    // 1. Requester Jennifer posts a public comment
    const reqCommentRes = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/comments`)
      .set("Cookie", requesterCookie)
      .send({
        content: "Here are the additional logs from my session.",
      });

    expect(reqCommentRes.status).toBe(201);
    expect(reqCommentRes.body).toHaveProperty("id");
    expect(reqCommentRes.body.content).toBe("Here are the additional logs from my session.");

    // 2. IT Staff Somchai posts a reply
    const staffCommentRes = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/comments`)
      .set("Cookie", staffCookie)
      .send({
        content: "Thank you Jennifer. We have identified the faulty driver.",
      });

    expect(staffCommentRes.status).toBe(201);

    // 3. Retrieve public comments as Requester
    const getRes = await request(app)
      .get(`/api/v1/tickets/${testTicketId}/comments`)
      .set("Cookie", requesterCookie);

    expect(getRes.status).toBe(200);
    expect(Array.isArray(getRes.body)).toBe(true);
    expect(getRes.body.length).toBeGreaterThanOrEqual(2);

    const first = getRes.body[0];
    const second = getRes.body[1];
    expect(first.content).toBe("Here are the additional logs from my session.");
    expect(first.author.displayName).toBe("Jennifer Anderson");
    expect(second.content).toBe("Thank you Jennifer. We have identified the faulty driver.");
    expect(second.author.displayName).toBe("Somchai Prasert");
    expect(second.author.role).toBe("IT_STAFF");
  });

  it("API-24: IT Staff and Administrator post and retrieve Internal Notes", async () => {
    // 1. IT Staff posts an internal note
    const staffNoteRes = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/notes`)
      .set("Cookie", staffCookie)
      .send({
        content: "Escalated ticket to Level 3 network engineer for investigation.",
      });

    expect(staffNoteRes.status).toBe(201);
    expect(staffNoteRes.body).toHaveProperty("id");

    // 2. Administrator posts an internal note
    const adminNoteRes = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/notes`)
      .set("Cookie", adminCookie)
      .send({
        content: "Approved budget for replacement hardware unit.",
      });

    expect(adminNoteRes.status).toBe(201);

    // 3. IT Staff retrieves internal notes
    const getNotesRes = await request(app)
      .get(`/api/v1/tickets/${testTicketId}/notes`)
      .set("Cookie", staffCookie);

    expect(getNotesRes.status).toBe(200);
    expect(Array.isArray(getNotesRes.body)).toBe(true);
    expect(getNotesRes.body.length).toBeGreaterThanOrEqual(2);
    expect(getNotesRes.body[0].content).toContain("Escalated ticket");
    expect(getNotesRes.body[1].content).toContain("Approved budget");

    // 4. Requester Jennifer is strictly forbidden from accessing internal notes
    const reqNoteGetRes = await request(app)
      .get(`/api/v1/tickets/${testTicketId}/notes`)
      .set("Cookie", requesterCookie);

    expect(reqNoteGetRes.status).toBe(403);
    expect(reqNoteGetRes.body.error.code).toBe("FORBIDDEN");

    const reqNotePostRes = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/notes`)
      .set("Cookie", requesterCookie)
      .send({ content: "Requester attempt to post internal note" });

    expect(reqNotePostRes.status).toBe(403);
    expect(reqNotePostRes.body.error.code).toBe("FORBIDDEN");
  });

  it("API-25: Rejects empty, whitespace-only, and >2000 character comments and notes with HTTP 422", async () => {
    // 1. Whitespace-only comment
    const emptyCommentRes = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/comments`)
      .set("Cookie", staffCookie)
      .send({ content: "   \n\t  " });

    expect(emptyCommentRes.status).toBe(422);
    expect(emptyCommentRes.body.error.code).toBe("INVALID_CONTENT");

    // 2. Empty string note
    const emptyNoteRes = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/notes`)
      .set("Cookie", staffCookie)
      .send({ content: "" });

    expect(emptyNoteRes.status).toBe(422);
    expect(emptyNoteRes.body.error.code).toBe("INVALID_CONTENT");

    // 3. >2000 character comment
    const longCommentRes = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/comments`)
      .set("Cookie", staffCookie)
      .send({ content: "Z".repeat(2001) });

    expect(longCommentRes.status).toBe(422);
    expect(longCommentRes.body.error.code).toBe("CONTENT_TOO_LONG");

    // 4. >2000 character note
    const longNoteRes = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/notes`)
      .set("Cookie", staffCookie)
      .send({ content: "Y".repeat(2001) });

    expect(longNoteRes.status).toBe(422);
    expect(longNoteRes.body.error.code).toBe("CONTENT_TOO_LONG");
  });
});
