import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("API-08, API-09, API-10: Attachment Management Lifecycle API", () => {
  const prisma = getPrisma();
  let ticketOwner1Id: number;
  let ticketOwner2Id: number;
  let closedTicketId: number;
  const createdAttachmentIds: number[] = [];

  const dummyPdfBuffer = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
  const dummyPngBuffer = Buffer.from("\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4");
  const exeBuffer = Buffer.from("MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00");
  const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024); // 6 MB

  beforeAll(async () => {
    const user1 = await prisma.user.findFirst({ where: { id: 1 } });
    const user2 = await prisma.user.findFirst({ where: { id: 2 } });
    const category = await prisma.category.findFirst({ where: { name: "Hardware" } });
    const system = await prisma.relatedSystem.findFirst({ where: { name: "Corporate Laptop" } });

    if (!user1 || !user2 || !category || !system) {
      throw new Error("Seed data missing for attachments tests.");
    }

    const t1 = await prisma.ticket.upsert({
      where: { ticketNo: "TKT-2026-80011" },
      update: { status: "NEW" },
      create: {
        ticketNo: "TKT-2026-80011",
        title: "Attachment Lifecycle Ticket 1",
        description: "Testing attachment upload, download, and soft removal.",
        requesterId: user1.id,
        categoryId: category.id,
        relatedSystemId: system.id,
        status: "NEW",
      },
    });
    ticketOwner1Id = t1.id;

    const t2 = await prisma.ticket.upsert({
      where: { ticketNo: "TKT-2026-80012" },
      update: { status: "NEW" },
      create: {
        ticketNo: "TKT-2026-80012",
        title: "Attachment Lifecycle Ticket 2 (User 2)",
        description: "Testing authorization boundaries.",
        requesterId: user2.id,
        categoryId: category.id,
        relatedSystemId: system.id,
        status: "NEW",
      },
    });
    ticketOwner2Id = t2.id;

    const tClosed = await prisma.ticket.upsert({
      where: { ticketNo: "TKT-2026-80013" },
      update: { status: "CLOSED" },
      create: {
        ticketNo: "TKT-2026-80013",
        title: "Attachment Closed Ticket",
        description: "Testing immutable status on closed tickets.",
        requesterId: user1.id,
        categoryId: category.id,
        relatedSystemId: system.id,
        status: "CLOSED",
      },
    });
    closedTicketId = tClosed.id;
  });

  afterAll(async () => {
    // Clean up created attachments and tickets
    const allAttachmentRecords = await prisma.attachment.findMany({
      where: { ticketId: { in: [ticketOwner1Id, ticketOwner2Id, closedTicketId] } },
    });

    for (const att of allAttachmentRecords) {
      if (att.storedFilename) {
        const filePath = path.resolve(process.cwd(), "uploads", path.basename(att.storedFilename));
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch {
            // ignore disk cleanup errors
          }
        }
      }
    }

    await prisma.attachment.deleteMany({
      where: { ticketId: { in: [ticketOwner1Id, ticketOwner2Id, closedTicketId] } },
    });

    await prisma.ticket.deleteMany({
      where: { id: { in: [ticketOwner1Id, ticketOwner2Id, closedTicketId] } },
    });
  });

  // ---------------------------------------------------------------------------
  // API-08: POST /api/tickets/:id/attachments (Upload to existing ticket)
  // ---------------------------------------------------------------------------

  it("API-08.1: uploads a valid attachment to an existing owned ticket and returns HTTP 201", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketOwner1Id}/attachments`)
      .set("X-Requester-Id", "1")
      .attach("file", dummyPdfBuffer, {
        filename: "diagnostics.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.ticketId).toBe(ticketOwner1Id);
    expect(res.body.originalFilename).toBe("diagnostics.pdf");
    expect(res.body.mimeType).toBe("application/pdf");
    expect(res.body.sizeBytes).toBe(dummyPdfBuffer.length);
    expect(res.body.uploadedById).toBe(1);
    expect(res.body.isDeleted).toBe(false);
    expect(res.body.isRemoved).toBe(false);
    expect(res.body.deletedAt).toBeNull();
    // Security check: internal filesystem path must NOT be leaked
    expect(res.body.storagePath).toBeUndefined();
    expect(res.body.storedFilename).toBeUndefined();

    createdAttachmentIds.push(res.body.id);
  });

  it("API-08.2: enforces 5 active attachment limit and rejects 6th upload with HTTP 422", async () => {
    // Current ticket already has 1 attachment from API-08.1. Upload 4 more to reach 5.
    for (let i = 2; i <= 5; i++) {
      const res = await request(app)
        .post(`/api/tickets/${ticketOwner1Id}/attachments`)
        .set("X-Requester-Id", "1")
        .attach("file", dummyPngBuffer, {
          filename: `screenshot_${i}.png`,
          contentType: "image/png",
        });
      expect(res.status).toBe(201);
      createdAttachmentIds.push(res.body.id);
    }

    // Now attempt to upload a 6th active attachment
    const res6 = await request(app)
      .post(`/api/tickets/${ticketOwner1Id}/attachments`)
      .set("X-Requester-Id", "1")
      .attach("file", dummyPdfBuffer, {
        filename: "sixth_attachment.pdf",
        contentType: "application/pdf",
      });

    expect(res6.status).toBe(422);
    expect(res6.body).toHaveProperty("error");
    expect(res6.body.error.code).toBe("ATTACHMENT_LIMIT_EXCEEDED");
  });

  it("API-08.3: rejects oversized file (> 5 MB) with HTTP 413 Payload Too Large", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketOwner1Id}/attachments`)
      .set("X-Requester-Id", "1")
      .attach("file", oversizedBuffer, {
        filename: "huge_video.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(413);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("API-08.4: rejects invalid MIME type / extension with HTTP 415 Unsupported Media Type", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketOwner1Id}/attachments`)
      .set("X-Requester-Id", "1")
      .attach("file", exeBuffer, {
        filename: "malware.exe",
        contentType: "application/x-msdownload",
      });

    expect(res.status).toBe(415);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("API-08.5: rejects upload when requester does not own the ticket with HTTP 403 Forbidden", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketOwner2Id}/attachments`)
      .set("X-Requester-Id", "1") // Jennifer trying to upload to Sarah's ticket
      .attach("file", dummyPdfBuffer, {
        filename: "unauthorized.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("API-08.7: rejects upload when no file is included in request with HTTP 400 Bad Request", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketOwner1Id}/attachments`)
      .set("X-Requester-Id", "1");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("FILE_REQUIRED");
  });

  // ---------------------------------------------------------------------------
  // API-09: DELETE /api/tickets/:id/attachments/:attachmentId (Soft Removal)
  // ---------------------------------------------------------------------------

  it("API-09.1: soft-removes an owned attachment with a valid reason and returns HTTP 200", async () => {
    const targetAttachmentId = createdAttachmentIds[0];

    const res = await request(app)
      .delete(`/api/tickets/${ticketOwner1Id}/attachments/${targetAttachmentId}`)
      .set("X-Requester-Id", "1")
      .send({
        removalReason: "Uploaded obsolete system report by mistake",
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", targetAttachmentId);
    expect(res.body.isDeleted).toBe(true);
    expect(res.body.isRemoved).toBe(true);
    expect(res.body.deletedAt).toBeTruthy();
    expect(res.body.removalReason).toBe("Uploaded obsolete system report by mistake");

    // Verify in database that the record is soft-deleted, not hard-deleted
    const dbRecord = await prisma.attachment.findUnique({ where: { id: targetAttachmentId } });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.deletedAt).not.toBeNull();
    expect(dbRecord?.removalReason).toBe("Uploaded obsolete system report by mistake");
    expect(dbRecord?.deletedById).toBe(1);
  });

  it("API-08.6: active slot recovery: allows uploading a new attachment after soft-removing one", async () => {
    // Ticket previously had 5 attachments; 1 was soft-removed in API-09.1, so active count is now 4.
    // Uploading a new attachment should succeed!
    const res = await request(app)
      .post(`/api/tickets/${ticketOwner1Id}/attachments`)
      .set("X-Requester-Id", "1")
      .attach("file", dummyPdfBuffer, {
        filename: "recovered_slot_doc.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(201);
    expect(res.body.originalFilename).toBe("recovered_slot_doc.pdf");
    createdAttachmentIds.push(res.body.id);
  });

  it("API-09.2: rejects soft-removal without reason or with < 3 characters with HTTP 422", async () => {
    const targetAttachmentId = createdAttachmentIds[1];

    const resEmpty = await request(app)
      .delete(`/api/tickets/${ticketOwner1Id}/attachments/${targetAttachmentId}`)
      .set("X-Requester-Id", "1")
      .send({ removalReason: "" });

    expect(resEmpty.status).toBe(422);
    expect(resEmpty.body.error.code).toBe("VALIDATION_ERROR");

    const resShort = await request(app)
      .delete(`/api/tickets/${ticketOwner1Id}/attachments/${targetAttachmentId}`)
      .set("X-Requester-Id", "1")
      .send({ removalReason: "no" });

    expect(resShort.status).toBe(422);
    expect(resShort.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("API-09.3: rejects soft-removal when requested by non-owner with HTTP 403 Forbidden", async () => {
    const targetAttachmentId = createdAttachmentIds[1];

    const res = await request(app)
      .delete(`/api/tickets/${ticketOwner1Id}/attachments/${targetAttachmentId}`)
      .set("X-Requester-Id", "2") // Sarah trying to delete Jennifer's attachment
      .send({ removalReason: "Attempting unauthorized removal" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("API-09.4: prevents double soft-removal of an already removed attachment with HTTP 422", async () => {
    const alreadyRemovedId = createdAttachmentIds[0];

    const res = await request(app)
      .delete(`/api/tickets/${ticketOwner1Id}/attachments/${alreadyRemovedId}`)
      .set("X-Requester-Id", "1")
      .send({ removalReason: "Second removal attempt" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("ALREADY_REMOVED");
  });

  it("API-09.5: rejects soft-removal on closed tickets with HTTP 403 Forbidden", async () => {
    // Create an attachment directly on the closed ticket
    const closedAtt = await prisma.attachment.create({
      data: {
        ticketId: closedTicketId,
        uploadedById: 1,
        originalFilename: "closed_doc.pdf",
        storedFilename: "closed_doc.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        storagePath: "uploads/closed_doc.pdf",
      },
    });

    const res = await request(app)
      .delete(`/api/tickets/${closedTicketId}/attachments/${closedAtt.id}`)
      .set("X-Requester-Id", "1")
      .send({ removalReason: "Removing from closed ticket" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("TICKET_IMMUTABLE");
  });

  it("API-09.6: rejects removal reason longer than 255 characters with HTTP 422", async () => {
    const targetAttachmentId = createdAttachmentIds[1];
    const overlyLongReason = "a".repeat(256);

    const res = await request(app)
      .delete(`/api/tickets/${ticketOwner1Id}/attachments/${targetAttachmentId}`)
      .set("X-Requester-Id", "1")
      .send({ removalReason: overlyLongReason });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("API-09.7: rejects soft-removal of non-existent attachment with HTTP 404 Not Found", async () => {
    const res = await request(app)
      .delete(`/api/tickets/${ticketOwner1Id}/attachments/999999`)
      .set("X-Requester-Id", "1")
      .send({ removalReason: "Attempting to delete non-existent attachment" });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("ATTACHMENT_NOT_FOUND");
  });

  // ---------------------------------------------------------------------------
  // API-10: GET /api/tickets/:id/attachments/:attachmentId (Download)
  // ---------------------------------------------------------------------------

  it("API-10.1: downloads an active attachment with HTTP 200 and proper binary headers", async () => {
    const activeAttachmentId = createdAttachmentIds[1];

    const res = await request(app)
      .get(`/api/tickets/${ticketOwner1Id}/attachments/${activeAttachmentId}`)
      .set("X-Requester-Id", "1");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
    expect(res.headers["content-disposition"]).toContain("attachment");
    expect(res.headers["content-disposition"]).toContain("screenshot_2.png");
    expect(res.body).toBeTruthy();
  });

  it("API-10.2: rejects download of soft-removed attachment with HTTP 410 Gone", async () => {
    const softRemovedId = createdAttachmentIds[0];

    const res = await request(app)
      .get(`/api/tickets/${ticketOwner1Id}/attachments/${softRemovedId}`)
      .set("X-Requester-Id", "1");

    expect(res.status).toBe(410);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("ATTACHMENT_REMOVED");
    expect(res.body.error).toHaveProperty("removedAt");
    expect(res.body.error).toHaveProperty("removalReason");
  });

  it("API-10.3: rejects download by a different requester with HTTP 403 Forbidden", async () => {
    const activeAttachmentId = createdAttachmentIds[1];

    const res = await request(app)
      .get(`/api/tickets/${ticketOwner1Id}/attachments/${activeAttachmentId}`)
      .set("X-Requester-Id", "2"); // Sarah trying to download Jennifer's attachment

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("API-10.4: rejects ticket-attachment mismatch with HTTP 404 Not Found", async () => {
    const activeAttachmentId = createdAttachmentIds[1];

    // Attempting to access Jennifer's attachment via Sarah's ticket ID
    const res = await request(app)
      .get(`/api/tickets/${ticketOwner2Id}/attachments/${activeAttachmentId}`)
      .set("X-Requester-Id", "1");

    expect(res.status).toBe(404);
  });

  it("API-10.5: supports direct alias routes for download and soft-removal", async () => {
    const activeAttachmentId = createdAttachmentIds[2];

    // Test direct alias download: GET /api/attachments/:id/download
    const resDownload = await request(app)
      .get(`/api/attachments/${activeAttachmentId}/download`)
      .set("X-Requester-Id", "1");

    expect(resDownload.status).toBe(200);
    expect(resDownload.headers["content-type"]).toBe("image/png");

    // Test direct alias delete: DELETE /api/attachments/:id
    const resDelete = await request(app)
      .delete(`/api/attachments/${activeAttachmentId}`)
      .set("X-Requester-Id", "1")
      .send({ removalReason: "Direct alias deletion test" });

    expect(resDelete.status).toBe(200);
    expect(resDelete.body.isDeleted).toBe(true);
  });

  it("API-10.6: rejects download of non-existent attachment with HTTP 404 Not Found", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketOwner1Id}/attachments/999999`)
      .set("X-Requester-Id", "1");

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("ATTACHMENT_NOT_FOUND");
  });
});
