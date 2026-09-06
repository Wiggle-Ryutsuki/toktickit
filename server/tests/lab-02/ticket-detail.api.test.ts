import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("API-07: GET /api/tickets/:id (Ticket Detail API)", () => {
  const prisma = getPrisma();
  let ticketOwner1Id: number;
  let ticketOwner2Id: number;

  beforeAll(async () => {
    // Seed isolated test tickets for Requester 1 (Jennifer) and Requester 2 (Sarah)
    const user1 = await prisma.user.findFirst({ where: { id: 1 } });
    const user2 = await prisma.user.findFirst({ where: { id: 2 } });
    const category = await prisma.category.findFirst({ where: { name: "Hardware" } });
    const system = await prisma.relatedSystem.findFirst({ where: { name: "Corporate Laptop" } });

    if (!user1 || !user2 || !category || !system) {
      throw new Error("Seed data missing for API-07 tests.");
    }

    const t1 = await prisma.ticket.upsert({
      where: { ticketNo: "TKT-2026-80001" },
      update: {},
      create: {
        ticketNo: "TKT-2026-80001",
        title: "Detail Test Ticket - Jennifer Owner",
        description: "Comprehensive hardware diagnostics for laptop battery failure.",
        requesterId: user1.id,
        categoryId: category.id,
        relatedSystemId: system.id,
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        status: "NEW",
      },
    });
    ticketOwner1Id = t1.id;

    // Seed one active and one soft-removed attachment for Ticket 1
    await prisma.attachment.create({
      data: {
        ticketId: t1.id,
        uploadedById: user1.id,
        originalFilename: "active_spec.pdf",
        storedFilename: "active_spec_123.pdf",
        mimeType: "application/pdf",
        sizeBytes: 2048,
        storagePath: "uploads/active_spec_123.pdf",
        deletedAt: null,
      },
    });

    await prisma.attachment.create({
      data: {
        ticketId: t1.id,
        uploadedById: user1.id,
        originalFilename: "tombstone_spec.pdf",
        storedFilename: "tombstone_spec_456.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        storagePath: "uploads/tombstone_spec_456.pdf",
        deletedAt: new Date(),
        deletedById: user1.id,
        removalReason: "Obsolete document superseded by active spec",
      },
    });

    const t2 = await prisma.ticket.upsert({
      where: { ticketNo: "TKT-2026-80002" },
      update: {},
      create: {
        ticketNo: "TKT-2026-80002",
        title: "Detail Test Ticket - Sarah Owner",
        description: "Software license activation issue.",
        requesterId: user2.id,
        categoryId: category.id,
        relatedSystemId: system.id,
        requestedPriority: "LOW",
        itPriority: "LOW",
        status: "NEW",
      },
    });
    ticketOwner2Id = t2.id;
  });

  afterAll(async () => {
    await prisma.attachment.deleteMany({
      where: { ticketId: { in: [ticketOwner1Id, ticketOwner2Id] } },
    });
    await prisma.ticket.deleteMany({
      where: { id: { in: [ticketOwner1Id, ticketOwner2Id] } },
    });
  });

  it("API-07.1: returns HTTP 200 with full ticket details for the ticket owner", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketOwner1Id}`)
      .set("X-Requester-Id", "1");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", ticketOwner1Id);
    expect(res.body).toHaveProperty("ticketNo", "TKT-2026-80001");
    expect(res.body).toHaveProperty("summary", "Detail Test Ticket - Jennifer Owner");
    expect(res.body).toHaveProperty("description", "Comprehensive hardware diagnostics for laptop battery failure.");
    expect(res.body).toHaveProperty("status", "NEW");
    expect(res.body).toHaveProperty("requestedPriority", "HIGH");
    expect(res.body).toHaveProperty("itPriority", "HIGH");
    expect(res.body).toHaveProperty("ticketOwner", null);
    expect(res.body).toHaveProperty("resolutionSummary", null);
    expect(res.body.requester).toHaveProperty("id", 1);
    expect(res.body.requester).toHaveProperty("email", "jennifer.anderson@kmutt.ac.th");
    expect(res.body.category).toHaveProperty("name", "Hardware");
    expect(res.body.relatedSystem).toHaveProperty("name", "Corporate Laptop");
    expect(Array.isArray(res.body.attachments)).toBe(true);
    expect(res.body.attachments.length).toBe(2);

    const activeAtt = res.body.attachments.find((a: any) => a.originalFilename === "active_spec.pdf");
    expect(activeAtt).toBeTruthy();
    expect(activeAtt.isDeleted).toBe(false);
    expect(activeAtt.storagePath).toBeUndefined();
    expect(activeAtt.storedFilename).toBeUndefined();

    const removedAtt = res.body.attachments.find((a: any) => a.originalFilename === "tombstone_spec.pdf");
    expect(removedAtt).toBeTruthy();
    expect(removedAtt.isDeleted).toBe(true);
    expect(removedAtt.removalReason).toBe("Obsolete document superseded by active spec");
    expect(removedAtt.storagePath).toBeUndefined();
    expect(removedAtt.storedFilename).toBeUndefined();

    expect(res.body).toHaveProperty("createdAt");
    expect(res.body).toHaveProperty("updatedAt");
  });

  it("API-07.2: returns HTTP 403 Forbidden when a different requester attempts to view the ticket", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketOwner1Id}`)
      .set("X-Requester-Id", "2"); // Sarah attempting to view Jennifer's ticket

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("FORBIDDEN");
    // Ensure no sensitive ticket metadata is leaked in the error payload
    expect(res.body.summary).toBeUndefined();
    expect(res.body.ticketNo).toBeUndefined();
    expect(res.body.description).toBeUndefined();
    expect(res.body.attachments).toBeUndefined();
  });

  it("API-07.3: returns HTTP 404 Not Found for a non-existent ticket ID", async () => {
    const res = await request(app)
      .get("/api/tickets/999999")
      .set("X-Requester-Id", "1");

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
  });

  it("API-07.4: returns HTTP 400 Bad Request when X-Requester-Id header is missing", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketOwner1Id}`);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("API-07.5: returns HTTP 400 Bad Request for non-numeric ticket ID", async () => {
    const res = await request(app)
      .get("/api/tickets/invalid-id")
      .set("X-Requester-Id", "1");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("API-07.6: returns HTTP 400 Bad Request for negative ticket ID", async () => {
    const res = await request(app)
      .get("/api/tickets/-5")
      .set("X-Requester-Id", "1");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });
});
