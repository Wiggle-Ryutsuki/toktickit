import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("API-05 & API-06: GET /api/tickets (My Tickets Query API)", () => {
  const prisma = getPrisma();

  beforeAll(async () => {
    // Seed isolated test tickets for Requester 1 (Jennifer) and Requester 2 (Sarah)
    const user1 = await prisma.user.findFirst({ where: { id: 1 } });
    const user2 = await prisma.user.findFirst({ where: { id: 2 } });
    const categoryHW = await prisma.category.findFirst({ where: { name: "Hardware" } });
    const categoryNet = await prisma.category.findFirst({ where: { name: "Network" } });
    const systemLaptop = await prisma.relatedSystem.findFirst({ where: { name: "Corporate Laptop" } });
    const systemWifi = await prisma.relatedSystem.findFirst({ where: { name: "Campus Wi-Fi" } });

    if (user1 && user2 && categoryHW && categoryNet && systemLaptop && systemWifi) {
      // Ensure at least 2 tickets for Requester 1
      await prisma.ticket.upsert({
        where: { ticketNo: "TKT-2026-90001" },
        update: {},
        create: {
          ticketNo: "TKT-2026-90001",
          title: "Hardware battery issue on corporate laptop",
          description: "Battery discharges completely within 20 minutes of startup.",
          requesterId: user1.id,
          categoryId: categoryHW.id,
          relatedSystemId: systemLaptop.id,
          requestedPriority: "HIGH",
          itPriority: "HIGH",
          status: "NEW",
        },
      });

      await prisma.ticket.upsert({
        where: { ticketNo: "TKT-2026-90002" },
        update: { status: "NEW" },
        create: {
          ticketNo: "TKT-2026-90002",
          title: "Wi-Fi connectivity dropped in Dormitory B",
          description: "Cannot connect to campus wifi from second floor rooms.",
          requesterId: user1.id,
          categoryId: categoryNet.id,
          relatedSystemId: systemWifi.id,
          requestedPriority: "LOW",
          itPriority: "LOW",
          status: "NEW",
        },
      });

      // Ensure at least 1 ticket for Requester 2
      await prisma.ticket.upsert({
        where: { ticketNo: "TKT-2026-90003" },
        update: {},
        create: {
          ticketNo: "TKT-2026-90003",
          title: "Requester 2 Software installation request",
          description: "Need license for statistical data analysis package.",
          requesterId: user2.id,
          categoryId: categoryHW.id,
          relatedSystemId: systemLaptop.id,
          requestedPriority: "MEDIUM",
          itPriority: "MEDIUM",
          status: "NEW",
        },
      });
    }
  });

  describe("API-05: Cross-Requester Ticket List Isolation (BR-04, AC-03)", () => {
    it("returns HTTP 200 with tickets strictly owned by Requester 1 and excludes Requester 2 tickets", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .query({ requesterId: 1 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      // Verify every returned ticket belongs to Requester 1
      for (const ticket of res.body.data) {
        expect(ticket.requester.id).toBe(1);
        expect(ticket.ticketNo).not.toBe("TKT-2026-90003"); // Belongs to Requester 2
      }
    });

    it("returns HTTP 200 with tickets strictly owned by Requester 2", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .query({ requesterId: 2 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      for (const ticket of res.body.data) {
        expect(ticket.requester.id).toBe(2);
      }
    });
  });

  describe("API-06: Search, Filters, Sorting & Pagination (FR-09, FR-10, AC-09)", () => {
    it("API-06.1: filters tickets by case-insensitive substring search on summary and ticketNo", async () => {
      const resSummary = await request(app)
        .get("/api/tickets")
        .query({ requesterId: 1, search: "battery" });

      expect(resSummary.status).toBe(200);
      expect(resSummary.body.data.length).toBeGreaterThanOrEqual(1);
      expect(resSummary.body.data[0].summary.toLowerCase()).toContain("battery");

      const resTicketNo = await request(app)
        .get("/api/tickets")
        .query({ requesterId: 1, search: "90001" });

      expect(resTicketNo.status).toBe(200);
      expect(resTicketNo.body.data.length).toBe(1);
      expect(resTicketNo.body.data[0].ticketNo).toBe("TKT-2026-90001");
    });

    it("API-06.2: filters tickets by categoryId, priority, and status", async () => {
      const categoryHW = await prisma.category.findFirst({ where: { name: "Hardware" } });

      const res = await request(app)
        .get("/api/tickets")
        .query({
          requesterId: 1,
          categoryId: categoryHW?.id,
          priority: "HIGH",
          status: "NEW",
        });

      expect(res.status).toBe(200);
      for (const t of res.body.data) {
        expect(t.category.id).toBe(categoryHW?.id);
        expect(t.requestedPriority).toBe("HIGH");
        expect(t.status).toBe("NEW");
      }
    });

    it("API-06.3: sorts tickets by createdAt ascending and descending", async () => {
      const resDesc = await request(app)
        .get("/api/tickets")
        .query({ requesterId: 1, sortBy: "createdAt", sortOrder: "desc" });

      expect(resDesc.status).toBe(200);
      if (resDesc.body.data.length >= 2) {
        const d1 = new Date(resDesc.body.data[0].createdAt).getTime();
        const d2 = new Date(resDesc.body.data[1].createdAt).getTime();
        expect(d1).toBeGreaterThanOrEqual(d2);
      }

      const resAsc = await request(app)
        .get("/api/tickets")
        .query({ requesterId: 1, sortBy: "createdAt", sortOrder: "asc" });

      expect(resAsc.status).toBe(200);
      if (resAsc.body.data.length >= 2) {
        const d1 = new Date(resAsc.body.data[0].createdAt).getTime();
        const d2 = new Date(resAsc.body.data[1].createdAt).getTime();
        expect(d1).toBeLessThanOrEqual(d2);
      }
    });

    it("API-06.4: supports pagination with page, limit, and pagination metadata", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .query({ requesterId: 1, page: 1, limit: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body).toHaveProperty("pagination");
      expect(res.body.pagination.currentPage).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
      expect(res.body.pagination.totalItems).toBeGreaterThanOrEqual(2);
      expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(2);
    });

    it("API-06.5: rejects missing requesterId or invalid pagination with HTTP 400", async () => {
      const resNoRequester = await request(app).get("/api/tickets");
      expect(resNoRequester.status).toBe(400);

      const resInvalidPage = await request(app)
        .get("/api/tickets")
        .query({ requesterId: 1, page: -1 });
      expect(resInvalidPage.status).toBe(400);

      const resInvalidLimit = await request(app)
        .get("/api/tickets")
        .query({ requesterId: 1, limit: 100 });
      expect(resInvalidLimit.status).toBe(400);
    });
  });
});
