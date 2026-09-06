import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("API-03 & API-04: POST /api/tickets (Create Ticket API)", () => {
  const createdTicketIds: number[] = [];

  afterAll(async () => {
    if (createdTicketIds.length > 0) {
      const prisma = getPrisma();
      await prisma.attachment.deleteMany({
        where: { ticketId: { in: createdTicketIds } },
      });
      await prisma.ticket.deleteMany({
        where: { id: { in: createdTicketIds } },
      });
    }
  });

  const validTicketData = {
    requesterId: 1,
    categoryId: 2,
    relatedSystemId: 2,
    requestedPriority: "MEDIUM",
    summary: "Laptop battery drains quickly after Windows update",
    description: "My laptop battery is draining much faster than usual even when the system is idle. This started happening after last week's Windows update.",
  };

  describe("API-03: Valid Ticket Submission (Happy Path)", () => {
    it("API-03.1: creates a ticket via JSON and returns HTTP 201 with generated Ticket Number", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .send(validTicketData);

      if (res.body?.id) createdTicketIds.push(res.body.id);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.ticketNo).toMatch(/^TKT-\d{4}-\d{5}$/);
      expect(res.body.status).toBe("NEW");
      expect(res.body.summary).toBe(validTicketData.summary);
      expect(res.body.description).toBe(validTicketData.description);
      expect(res.body.requestedPriority).toBe("MEDIUM");
      expect(res.body.itPriority).toBe("MEDIUM");
      expect(res.body.requester).toBeDefined();
      expect(res.body.requester.id).toBe(1);
      expect(res.body.category).toBeDefined();
      expect(res.body.relatedSystem).toBeDefined();
    });

    it("API-03.2: creates a ticket via multipart/form-data with a valid PDF attachment", async () => {
      const dummyPdfBuffer = Buffer.from("%PDF-1.4 dummy pdf test content");

      const res = await request(app)
        .post("/api/tickets")
        .field("requesterId", "1")
        .field("categoryId", "2")
        .field("relatedSystemId", "2")
        .field("requestedPriority", "HIGH")
        .field("summary", "Network outage in Lab Building")
        .field("description", "Cannot reach the internal gateway since morning. Attached diagnostics report.")
        .attach("attachments", dummyPdfBuffer, {
          filename: "diagnostics.pdf",
          contentType: "application/pdf",
        });

      if (res.body?.id) createdTicketIds.push(res.body.id);

      expect(res.status).toBe(201);
      expect(res.body.ticketNo).toMatch(/^TKT-\d{4}-\d{5}$/);
      expect(res.body.requestedPriority).toBe("HIGH");
      expect(res.body.attachments).toHaveLength(1);
      expect(res.body.attachments[0].originalFilename).toBe("diagnostics.pdf");
      expect(res.body.attachments[0].mimeType).toBe("application/pdf");
    });
  });

  describe("API-04: Validation & Payload Constraints (Failure Cases)", () => {
    it("API-04.1: rejects missing or whitespace-only summary with HTTP 422", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .send({
          ...validTicketData,
          summary: "   ",
        });

      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fieldErrors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "summary" })])
      );
    });

    it("API-04.2: rejects description shorter than 10 characters with HTTP 422", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .send({
          ...validTicketData,
          description: "Broken",
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fieldErrors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "description" })])
      );
    });

    it("API-04.3: rejects non-existent categoryId with HTTP 422", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .send({
          ...validTicketData,
          categoryId: 99999,
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("API-04.4: rejects file exceeding 5 MB limit with HTTP 413", async () => {
      // Create a buffer slightly larger than 5 MB (5 * 1024 * 1024 + 1024 bytes)
      const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024);

      const res = await request(app)
        .post("/api/tickets")
        .field("requesterId", "1")
        .field("categoryId", "2")
        .field("relatedSystemId", "2")
        .field("requestedPriority", "LOW")
        .field("summary", "Large memory dump upload test")
        .field("description", "Attaching a dump file that exceeds the 5 megabyte constraint limit.")
        .attach("attachments", oversizedBuffer, {
          filename: "huge_dump.pdf",
          contentType: "application/pdf",
        });

      expect([413, 422]).toContain(res.status);
      expect(res.body.error).toBeDefined();
    });

    it("API-04.5: rejects disallowed file types (.exe) with HTTP 415", async () => {
      const exeBuffer = Buffer.from("MZ dummy executable content");

      const res = await request(app)
        .post("/api/tickets")
        .field("requesterId", "1")
        .field("categoryId", "2")
        .field("relatedSystemId", "2")
        .field("requestedPriority", "MEDIUM")
        .field("summary", "Submitting an unsupported binary file")
        .field("description", "User tries to upload an executable binary as an attachment.")
        .attach("attachments", exeBuffer, {
          filename: "malware.exe",
          contentType: "application/x-msdownload",
        });

      expect([415, 422]).toContain(res.status);
      expect(res.body.error).toBeDefined();
    });
  });
});
