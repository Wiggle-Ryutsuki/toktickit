import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const prisma = getPrisma();

describe("IT Staff Ticket Detail Operations API Tests (API-18 to API-22, API-26, API-27)", () => {
  let staffCookie: string[];
  let adminCookie: string[];
  let requesterCookie: string[];
  let requester2Cookie: string[];
  let testTicketId: number;
  let testTicketNo: string;

  beforeAll(async () => {
    // 1. Log in as IT Staff Somchai Jaidee
    const staffLogin = await request(app).post("/api/v1/auth/login").send({
      email: "staff.somchai@kmutt.ac.th",
      password: "Password123!",
    });
    expect(staffLogin.status).toBe(200);
    staffCookie = staffLogin.headers["set-cookie"];

    // 2. Log in as Administrator
    const adminLogin = await request(app).post("/api/v1/auth/login").send({
      email: "admin.toktickit@kmutt.ac.th",
      password: "Password123!",
    });
    expect(adminLogin.status).toBe(200);
    adminCookie = adminLogin.headers["set-cookie"];

    // 3. Log in as Requester Jennifer Anderson (User ID 1)
    const reqLogin = await request(app).post("/api/v1/auth/login").send({
      email: "jennifer.anderson@kmutt.ac.th",
      password: "Password123!",
    });
    expect(reqLogin.status).toBe(200);
    requesterCookie = reqLogin.headers["set-cookie"];

    // 4. Log in as Requester Sarah Johnson
    const req2Login = await request(app).post("/api/v1/auth/login").send({
      email: "sarah.johnson@kmutt.ac.th",
      password: "Password123!",
    });
    expect(req2Login.status).toBe(200);
    requester2Cookie = req2Login.headers["set-cookie"];

    // 5. Create a dedicated test ticket owned by Jennifer
    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();
    const jennifer = await prisma.user.findUnique({
      where: { email: "jennifer.anderson@kmutt.ac.th" },
    });

    const ticket = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-TEST-${Date.now()}`,
        title: "Test Laptop Operational Updates Ticket",
        description: "Testing ownership, priority mutations, transitions, and concurrency.",
        requesterId: jennifer!.id,
        categoryId: category!.id,
        relatedSystemId: system!.id,
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        status: "NEW",
        version: 1,
      },
    });

    testTicketId = ticket.id;
    testTicketNo = ticket.ticketNo;
  });

  it("API-18: Retrieve IT Staff Ticket Detail (GET /api/v1/tickets/:id)", async () => {
    // IT Staff retrieves ticket detail
    const res = await request(app)
      .get(`/api/v1/tickets/${testTicketId}`)
      .set("Cookie", staffCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", testTicketId);
    expect(res.body).toHaveProperty("ticketNo", testTicketNo);
    expect(res.body).toHaveProperty("summary");
    expect(res.body).toHaveProperty("description");
    expect(res.body).toHaveProperty("status", "NEW");
    expect(res.body).toHaveProperty("requestedPriority", "MEDIUM");
    expect(res.body).toHaveProperty("itPriority", "MEDIUM");
    expect(res.body).toHaveProperty("version", 1);
    expect(res.body).toHaveProperty("category");
    expect(res.body).toHaveProperty("relatedSystem");
    expect(res.body).toHaveProperty("requester");
    expect(res.body).toHaveProperty("attachments");
    expect(res.body).toHaveProperty("comments");
    expect(res.body).toHaveProperty("notes"); // Present for IT Staff
    expect(res.body.requester).not.toHaveProperty("passwordHash");
  });

  it("API-18.1: Requester ticket detail completely omits notes array", async () => {
    // Requester Jennifer views her own ticket
    const res = await request(app)
      .get(`/api/v1/tickets/${testTicketId}`)
      .set("Cookie", requesterCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", testTicketId);
    expect(res.body).toHaveProperty("comments");
    // Notes property must be completely omitted for Requesters
    expect(res.body).not.toHaveProperty("notes");
  });

  it("API-19: IT Staff claims unassigned ticket or reassigns owner", async () => {
    // 1. Discover active staff assignees
    const staffListRes = await request(app)
      .get("/api/v1/users/staff")
      .set("Cookie", staffCookie);

    expect(staffListRes.status).toBe(200);
    expect(Array.isArray(staffListRes.body)).toBe(true);
    expect(staffListRes.body.length).toBeGreaterThanOrEqual(2);
    const somchai = staffListRes.body.find((s: any) => s.email === "staff.somchai@kmutt.ac.th");
    expect(somchai).toBeDefined();

    // 2. Somchai claims ticket (ownerId: somchai.id) with current version 1
    const claimRes = await request(app)
      .patch(`/api/v1/tickets/${testTicketId}`)
      .set("Cookie", staffCookie)
      .send({
        ownerId: somchai.id,
        version: 1,
      });

    expect(claimRes.status).toBe(200);
    expect(claimRes.body.ownerId).toBe(somchai.id);
    expect(claimRes.body.version).toBe(2);

    // 3. Reassign to another IT Staff member (Malee Prasert)
    const malee = staffListRes.body.find((s: any) => s.email === "staff.malee@kmutt.ac.th");
    const reassignRes = await request(app)
      .patch(`/api/v1/tickets/${testTicketId}`)
      .set("Cookie", staffCookie)
      .send({
        ownerId: malee.id,
        version: 2,
      });

    expect(reassignRes.status).toBe(200);
    expect(reassignRes.body.ownerId).toBe(malee.id);
    expect(reassignRes.body.version).toBe(3);

    // 4. Reject reassignment to non-existent user or requester
    const badOwnerRes = await request(app)
      .patch(`/api/v1/tickets/${testTicketId}`)
      .set("Cookie", staffCookie)
      .send({
        ownerId: 99999,
        version: 3,
      });

    expect(badOwnerRes.status).toBe(422);
    expect(badOwnerRes.body.error.code).toBe("INVALID_OWNER");
  });

  it("API-20: IT Staff updates IT Priority while Requested Priority remains unchanged", async () => {
    // Current version is 3 after previous test
    const res = await request(app)
      .patch(`/api/v1/tickets/${testTicketId}`)
      .set("Cookie", staffCookie)
      .send({
        itPriority: "URGENT",
        version: 3,
      });

    expect(res.status).toBe(200);
    expect(res.body.itPriority).toBe("URGENT");
    expect(res.body.version).toBe(4);

    // Verify in database that requestedPriority remained MEDIUM
    const ticketInDb = await prisma.ticket.findUnique({
      where: { id: testTicketId },
    });
    expect(ticketInDb?.itPriority).toBe("URGENT");
    expect(ticketInDb?.requestedPriority).toBe("MEDIUM");
  });

  it("API-21: Status transition matrix validation & resolution summary enforcement", async () => {
    // 1. Valid transition: NEW -> IN_PROGRESS with version 4
    const transRes1 = await request(app)
      .patch(`/api/v1/tickets/${testTicketId}`)
      .set("Cookie", staffCookie)
      .send({
        status: "IN_PROGRESS",
        version: 4,
      });

    expect(transRes1.status).toBe(200);
    expect(transRes1.body.status).toBe("IN_PROGRESS");
    expect(transRes1.body.version).toBe(5);

    // 2. Invalid jump: IN_PROGRESS -> CLOSED is forbidden by BR-08 (must go through RESOLVED)
    const invalidJumpRes = await request(app)
      .patch(`/api/v1/tickets/${testTicketId}`)
      .set("Cookie", staffCookie)
      .send({
        status: "CLOSED",
        resolutionSummary: "Attempting invalid jump",
        version: 5,
      });

    expect(invalidJumpRes.status).toBe(422);
    expect(invalidJumpRes.body.error.code).toBe("INVALID_STATUS_TRANSITION");

    // 3. Transition to RESOLVED without resolutionSummary fails with 422
    const missingSummaryRes = await request(app)
      .patch(`/api/v1/tickets/${testTicketId}`)
      .set("Cookie", staffCookie)
      .send({
        status: "RESOLVED",
        version: 5,
      });

    expect(missingSummaryRes.status).toBe(422);
    expect(missingSummaryRes.body.error.code).toBe("MISSING_RESOLUTION_SUMMARY");

    // 4. Transition to RESOLVED with whitespace-only resolutionSummary fails with 422
    const whitespaceSummaryRes = await request(app)
      .patch(`/api/v1/tickets/${testTicketId}`)
      .set("Cookie", staffCookie)
      .send({
        status: "RESOLVED",
        resolutionSummary: "   \n\t   ",
        version: 5,
      });

    expect(whitespaceSummaryRes.status).toBe(422);
    expect(whitespaceSummaryRes.body.error.code).toBe("MISSING_RESOLUTION_SUMMARY");

    // 5. Transition to RESOLVED with valid resolutionSummary succeeds
    const resolveRes = await request(app)
      .patch(`/api/v1/tickets/${testTicketId}`)
      .set("Cookie", staffCookie)
      .send({
        status: "RESOLVED",
        resolutionSummary: "Replaced battery with fresh replacement unit. Passed diagnostics.",
        version: 5,
      });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.status).toBe("RESOLVED");
    expect(resolveRes.body.resolutionSummary).toContain("Replaced battery");
    expect(resolveRes.body.version).toBe(6);

    // 6. Transition from RESOLVED -> CLOSED requires resolutionSummary (or retains)
    const closeRes = await request(app)
      .patch(`/api/v1/tickets/${testTicketId}`)
      .set("Cookie", staffCookie)
      .send({
        status: "CLOSED",
        resolutionSummary: "Requester confirmed satisfaction. Ticket closed.",
        version: 6,
      });

    expect(closeRes.status).toBe(200);
    expect(closeRes.body.status).toBe("CLOSED");
    expect(closeRes.body.version).toBe(7);

    // 7. Reopen from CLOSED -> IN_PROGRESS
    const reopenRes = await request(app)
      .patch(`/api/v1/tickets/${testTicketId}`)
      .set("Cookie", staffCookie)
      .send({
        status: "IN_PROGRESS",
        version: 7,
      });

    expect(reopenRes.status).toBe(200);
    expect(reopenRes.body.status).toBe("IN_PROGRESS");
    expect(reopenRes.body.version).toBe(8);
  });

  it("API-22: Optimistic concurrency conflict detection (HTTP 409 Conflict)", async () => {
    // Current version is 8.
    // Client 1 updates with version 8
    const client1Res = await request(app)
      .patch(`/api/v1/tickets/${testTicketId}`)
      .set("Cookie", staffCookie)
      .send({
        itPriority: "LOW",
        version: 8,
      });

    expect(client1Res.status).toBe(200);
    expect(client1Res.body.version).toBe(9);

    // Client 2 attempts update with stale version 8 -> 409 Conflict
    const client2Res = await request(app)
      .patch(`/api/v1/tickets/${testTicketId}`)
      .set("Cookie", adminCookie)
      .send({
        itPriority: "HIGH",
        version: 8, // Stale version!
      });

    expect(client2Res.status).toBe(409);
    expect(client2Res.body.error.code).toBe("CONCURRENCY_CONFLICT");

    // Missing version parameter returns HTTP 400
    const missingVersionRes = await request(app)
      .patch(`/api/v1/tickets/${testTicketId}`)
      .set("Cookie", staffCookie)
      .send({
        itPriority: "HIGH",
      });

    expect(missingVersionRes.status).toBe(400);
    expect(missingVersionRes.body.error.code).toBe("BAD_REQUEST");
  });

  it("API-26: Requester submits 'Problem Appears Resolved' indication", async () => {
    // Requester Jennifer indicates resolution on active ticket
    const resolveIndRes = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/resolve-indication`)
      .set("Cookie", requesterCookie)
      .send({});

    expect(resolveIndRes.status).toBe(200);
    expect(resolveIndRes.body.message).toBe("Resolution indication recorded.");
    expect(resolveIndRes.body.requesterResolutionConfirmedAt).toBeDefined();

    // Verify ticket formal status was NOT changed
    const ticketInDb = await prisma.ticket.findUnique({
      where: { id: testTicketId },
    });
    expect(ticketInDb?.status).toBe("IN_PROGRESS");
    expect(ticketInDb?.requesterResolutionConfirmedAt).not.toBeNull();

    // Idempotent: Calling again updates timestamp and returns 200
    const secondRes = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/resolve-indication`)
      .set("Cookie", requesterCookie)
      .send({});
    expect(secondRes.status).toBe(200);

    // Non-owner requester (Sarah) receives 403 Forbidden
    const unauthRes = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/resolve-indication`)
      .set("Cookie", requester2Cookie)
      .send({});
    expect(unauthRes.status).toBe(403);
  });

  it("API-27: Attachment upload and soft-removal continuity on Ticket Detail", async () => {
    // Verify Lab 2 attachment upload continues working on Ticket Detail
    const uploadRes = await request(app)
      .post(`/api/v1/tickets/${testTicketId}/attachments`)
      .set("Cookie", staffCookie)
      .attach("file", Buffer.from("%PDF-1.4 sample pdf content"), {
        filename: "diagnostic_report.pdf",
        contentType: "application/pdf",
      });

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.originalFilename).toBe("diagnostic_report.pdf");
    const attachmentId = uploadRes.body.id;

    // Verify streaming download works
    const downloadRes = await request(app)
      .get(`/api/v1/tickets/${testTicketId}/attachments/${attachmentId}`)
      .set("Cookie", staffCookie);
    expect(downloadRes.status).toBe(200);

    // Verify soft-removal with reason works
    const removeRes = await request(app)
      .delete(`/api/v1/tickets/${testTicketId}/attachments/${attachmentId}`)
      .set("Cookie", staffCookie)
      .send({ removalReason: "Outdated diagnostic logs replaced with newer test results" });
    expect(removeRes.status).toBe(200);
    expect(removeRes.body.isDeleted).toBe(true);
    expect(removeRes.body.removalReason).toBe("Outdated diagnostic logs replaced with newer test results");
  });
});
