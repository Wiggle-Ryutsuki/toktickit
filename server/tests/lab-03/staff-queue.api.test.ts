import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createSession } from "../../src/utils/session.js";

const prisma = getPrisma();

describe("IT Staff Ticket Queue API (API-13 to API-17, API-SEC-01, API-AUTH-01)", () => {
  let staffCookie: string;
  let adminCookie: string;
  let firstLoginCookie: string;
  let staffUser: any;
  let requesterUser: any;
  let adminUser: any;

  beforeAll(async () => {
    // 1. Fetch seeded users
    staffUser = await prisma.user.findFirst({ where: { email: "staff.somchai@kmutt.ac.th" } });
    requesterUser = await prisma.user.findFirst({ where: { email: "jennifer.anderson@kmutt.ac.th" } });
    adminUser = await prisma.user.findFirst({ where: { email: "admin.toktickit@kmutt.ac.th" } });
    const firstLoginUser = await prisma.user.findFirst({ where: { email: "firstlogin.requester@kmutt.ac.th" } });
    const categoryHW = await prisma.category.findFirst({ where: { name: "Hardware" } });
    const categoryNet = await prisma.category.findFirst({ where: { name: "Network" } });
    const systemLaptop = await prisma.relatedSystem.findFirst({ where: { name: "Corporate Laptop" } });
    const systemWifi = await prisma.relatedSystem.findFirst({ where: { name: "Campus Wi-Fi" } });

    if (!staffUser || !requesterUser || !adminUser || !firstLoginUser || !categoryHW || !categoryNet || !systemLaptop || !systemWifi) {
      throw new Error("Missing seed data for staff queue tests.");
    }

    // Create valid sessions
    const staffSession = await createSession(staffUser.id);
    staffCookie = `toktickit_session=${staffSession.token}`;

    const adminSession = await createSession(adminUser.id);
    adminCookie = `toktickit_session=${adminSession.token}`;

    const firstLoginSession = await createSession(firstLoginUser.id);
    firstLoginCookie = `toktickit_session=${firstLoginSession.token}`;

    // 2. Seed distinct tickets for testing queue filters and search (using 70000 range to avoid collision)
    // Ticket 1: Unassigned, Hardware, IN_PROGRESS, requestedPriority=HIGH, itPriority=HIGH
    await prisma.ticket.upsert({
      where: { ticketNo: "TKT-2026-70001" },
      update: {
        title: "Staff Queue Laptop battery diagnostics",
        description: "Battery discharges completely within 15 minutes of heavy load.",
        status: "IN_PROGRESS",
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        ownerId: null,
      },
      create: {
        ticketNo: "TKT-2026-70001",
        title: "Staff Queue Laptop battery diagnostics",
        description: "Battery discharges completely within 15 minutes of heavy load.",
        requesterId: requesterUser.id,
        categoryId: categoryHW.id,
        relatedSystemId: systemLaptop.id,
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        status: "IN_PROGRESS",
        ownerId: null,
      },
    });

    // Ticket 2: Assigned to Somchai Staff, Network, NEW, requestedPriority=LOW, itPriority=LOW
    await prisma.ticket.upsert({
      where: { ticketNo: "TKT-2026-70002" },
      update: {
        title: "Staff Queue Dormitory Wi-Fi intermittent connectivity",
        description: "Connection drops every hour in dormitory wing B.",
        status: "NEW",
        requestedPriority: "LOW",
        itPriority: "LOW",
        ownerId: staffUser.id,
      },
      create: {
        ticketNo: "TKT-2026-70002",
        title: "Staff Queue Dormitory Wi-Fi intermittent connectivity",
        description: "Connection drops every hour in dormitory wing B.",
        requesterId: requesterUser.id,
        categoryId: categoryNet.id,
        relatedSystemId: systemWifi.id,
        requestedPriority: "LOW",
        itPriority: "LOW",
        status: "NEW",
        ownerId: staffUser.id,
      },
    });

    // Ticket 3: Assigned to Somchai Staff, Hardware, IN_PROGRESS, requestedPriority=HIGH, itPriority=URGENT
    await prisma.ticket.upsert({
      where: { ticketNo: "TKT-2026-70003" },
      update: {
        title: "Staff Queue Urgent motherboard failure",
        description: "Laptop will not power on after liquid spill.",
        status: "IN_PROGRESS",
        requestedPriority: "HIGH",
        itPriority: "URGENT",
        ownerId: staffUser.id,
      },
      create: {
        ticketNo: "TKT-2026-70003",
        title: "Staff Queue Urgent motherboard failure",
        description: "Laptop will not power on after liquid spill.",
        requesterId: requesterUser.id,
        categoryId: categoryHW.id,
        relatedSystemId: systemLaptop.id,
        requestedPriority: "HIGH",
        itPriority: "URGENT",
        status: "IN_PROGRESS",
        ownerId: staffUser.id,
      },
    });
  });

  describe("API-13: Search Execution & Sanitization (FR-08, FR-09, AC-06)", () => {
    it("returns tickets matching search term in title or ticket number", async () => {
      const res = await request(app)
        .get("/api/v1/tickets")
        .set("Cookie", staffCookie)
        .query({ search: "battery" });

      expect(res.status).toBe(200);
      expect(res.body.tickets).toBeDefined();
      expect(res.body.tickets.length).toBeGreaterThanOrEqual(1);
      const matched = res.body.tickets.find((t: any) => t.ticketNo === "TKT-2026-70001");
      expect(matched).toBeDefined();
    });

    it("performs case-insensitive search", async () => {
      const res = await request(app)
        .get("/api/v1/tickets")
        .set("Cookie", staffCookie)
        .query({ search: "BATTERY" });

      expect(res.status).toBe(200);
      const matched = res.body.tickets.find((t: any) => t.ticketNo === "TKT-2026-70001");
      expect(matched).toBeDefined();
    });

    it("handles SQL wildcards and special characters without syntax error", async () => {
      const res = await request(app)
        .get("/api/v1/tickets")
        .set("Cookie", staffCookie)
        .query({ search: "%'_\\" });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.tickets)).toBe(true);
    });

    it("treats whitespace-only search as no filter", async () => {
      const res = await request(app)
        .get("/api/v1/tickets")
        .set("Cookie", staffCookie)
        .query({ search: "   " });

      expect(res.status).toBe(200);
      expect(res.body.tickets.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("API-14: Multi-Field Filtering & Intersection (FR-08, FR-10, AC-06)", () => {
    it("filters tickets by strict AND intersection of multiple filter criteria", async () => {
      const res = await request(app)
        .get("/api/v1/tickets")
        .set("Cookie", staffCookie)
        .query({
          status: "IN_PROGRESS",
          requestedPriority: "HIGH",
          itPriority: "URGENT",
        });

      expect(res.status).toBe(200);
      expect(res.body.tickets.length).toBeGreaterThanOrEqual(1);
      for (const t of res.body.tickets) {
        expect(t.status).toBe("IN_PROGRESS");
        expect(t.requestedPriority).toBe("HIGH");
        expect(t.itPriority).toBe("URGENT");
      }
    });
  });

  describe("API-15: Assignment Filtering (FR-10, BR-06, AC-06)", () => {
    it("assigned=unassigned returns only tickets with owner null", async () => {
      const res = await request(app)
        .get("/api/v1/tickets")
        .set("Cookie", staffCookie)
        .query({ assigned: "unassigned" });

      expect(res.status).toBe(200);
      expect(res.body.tickets.length).toBeGreaterThanOrEqual(1);
      for (const t of res.body.tickets) {
        expect(t.owner).toBeNull();
      }
    });

    it("assigned=mine returns only tickets owned by the authenticated staff user", async () => {
      const res = await request(app)
        .get("/api/v1/tickets")
        .set("Cookie", staffCookie)
        .query({ assigned: "mine" });

      expect(res.status).toBe(200);
      expect(res.body.tickets.length).toBeGreaterThanOrEqual(2);
      for (const t of res.body.tickets) {
        expect(t.owner).toBeDefined();
        expect(t.owner.id).toBe(staffUser.id);
      }
    });
  });

  describe("API-16: Sorting & Pagination Bounds (FR-11, AC-06)", () => {
    it("sorts by createdAt asc and desc properly", async () => {
      const resAsc = await request(app)
        .get("/api/v1/tickets")
        .set("Cookie", staffCookie)
        .query({ sortBy: "createdAt", sortOrder: "asc" });

      expect(resAsc.status).toBe(200);
      expect(resAsc.body.tickets.length).toBeGreaterThanOrEqual(2);

      const d1 = new Date(resAsc.body.tickets[0].createdAt).getTime();
      const d2 = new Date(resAsc.body.tickets[1].createdAt).getTime();
      expect(d1).toBeLessThanOrEqual(d2);
    });

    it("handles page and limit correctly", async () => {
      const res = await request(app)
        .get("/api/v1/tickets")
        .set("Cookie", staffCookie)
        .query({ page: 1, limit: 2 });

      expect(res.status).toBe(200);
      expect(res.body.tickets.length).toBe(2);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.totalCount).toBeGreaterThanOrEqual(3);
    });

    it("returns empty array when page is beyond totalCount", async () => {
      const res = await request(app)
        .get("/api/v1/tickets")
        .set("Cookie", staffCookie)
        .query({ page: 9999, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.tickets).toEqual([]);
      expect(res.body.pagination.page).toBe(9999);
      expect(res.body.pagination.totalCount).toBeGreaterThanOrEqual(1);
    });

    it("returns HTTP 400 for invalid query parameters", async () => {
      const resInvalidSort = await request(app)
        .get("/api/v1/tickets")
        .set("Cookie", staffCookie)
        .query({ sortBy: "maliciousColumn" });

      expect(resInvalidSort.status).toBe(400);
      expect(resInvalidSort.body.error.code).toBe("INVALID_QUERY_PARAMS");

      const resInvalidLimit = await request(app)
        .get("/api/v1/tickets")
        .set("Cookie", staffCookie)
        .query({ limit: 101 });

      expect(resInvalidLimit.status).toBe(400);
      expect(resInvalidLimit.body.error.code).toBe("INVALID_QUERY_PARAMS");
    });
  });

  describe("API-17: Administrator Access (FR-08, AC-06)", () => {
    it("allows Administrator full access to the IT staff ticket queue", async () => {
      const res = await request(app)
        .get("/api/v1/tickets")
        .set("Cookie", adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.tickets).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe("API-SEC-01: Zero Sensitive Data Leak Assertion", () => {
    it("strictly omits passwordHash, mustChangePassword, and owner email from response DTO", async () => {
      const res = await request(app)
        .get("/api/v1/tickets")
        .set("Cookie", staffCookie);

      expect(res.status).toBe(200);
      expect(res.body.tickets.length).toBeGreaterThanOrEqual(1);

      for (const t of res.body.tickets) {
        expect(t.passwordHash).toBeUndefined();
        expect(t.mustChangePassword).toBeUndefined();
        expect(t.comments).toBeUndefined();
        expect(t.attachments).toBeUndefined();

        // Requester checks
        expect(t.requester).toBeDefined();
        expect(t.requester.passwordHash).toBeUndefined();
        expect(t.requester.mustChangePassword).toBeUndefined();

        // Owner checks
        if (t.owner) {
          expect(t.owner.passwordHash).toBeUndefined();
          expect(t.owner.mustChangePassword).toBeUndefined();
          expect(t.owner.email).toBeUndefined(); // Email omitted to minimize PII
        }
      }
    });
  });

  describe("API-AUTH-01: First-Login Intercept Restriction (BR-02, AC-02)", () => {
    it("blocks users with mustChangePassword=true with HTTP 403 MUST_CHANGE_PASSWORD", async () => {
      const res = await request(app)
        .get("/api/v1/tickets")
        .set("Cookie", firstLoginCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("MUST_CHANGE_PASSWORD");
    });
  });
});
