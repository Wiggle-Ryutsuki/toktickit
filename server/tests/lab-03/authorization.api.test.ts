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
});
