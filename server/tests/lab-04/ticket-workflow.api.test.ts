import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { ActionStatus, TicketStatus } from "@prisma/client";
import {
  isResolutionGateSatisfied,
  calculateReopenStatus,
} from "../../src/utils/status-transition.js";

const prisma = getPrisma();

describe("Feature-15: Enforced Ticket Lifecycle & Resolution Gate Workflow Tests", () => {
  let staffCookie: any;
  let requesterCookie: any;
  let jenniferUser: any;
  let somchaiUser: any;
  let category: any;
  let relatedSystem: any;

  beforeAll(async () => {
    // 1. Log in as IT Staff Somchai Prasert
    const staffLogin = await request(app).post("/api/v1/auth/login").send({
      email: "staff.somchai@kmutt.ac.th",
      password: "Password123!",
    });
    expect(staffLogin.status).toBe(200);
    staffCookie = staffLogin.headers["set-cookie"];

    // 2. Log in as Requester Jennifer Anderson
    const reqLogin = await request(app).post("/api/v1/auth/login").send({
      email: "jennifer.anderson@kmutt.ac.th",
      password: "Password123!",
    });
    expect(reqLogin.status).toBe(200);
    requesterCookie = reqLogin.headers["set-cookie"];

    // Look up fixture entities
    jenniferUser = await prisma.user.findFirstOrThrow({
      where: { email: "jennifer.anderson@kmutt.ac.th" },
    });
    somchaiUser = await prisma.user.findFirstOrThrow({
      where: { email: "staff.somchai@kmutt.ac.th" },
    });
    category = await prisma.category.findFirstOrThrow();
    relatedSystem = await prisma.relatedSystem.findFirstOrThrow();
  });

  // --------------------------------------------------------------------------
  // Unit Tests (UT-05, UT-06)
  // --------------------------------------------------------------------------
  describe("Unit Tests: Resolution Gate & Reopen Rules", () => {
    it("UT-05: Pure domain resolution gate rule function (BR-06, BR-07, FR-43)", () => {
      // Empty actions list passes gate
      expect(isResolutionGateSatisfied([])).toBe(true);

      // Only terminal states (COMPLETED or CANCELLED) pass gate
      expect(
        isResolutionGateSatisfied([
          { status: ActionStatus.COMPLETED },
          { status: ActionStatus.CANCELLED },
        ])
      ).toBe(true);

      // PLANNED action blocks gate
      expect(
        isResolutionGateSatisfied([
          { status: ActionStatus.COMPLETED },
          { status: ActionStatus.PLANNED },
        ])
      ).toBe(false);

      // IN_PROGRESS action blocks gate
      expect(
        isResolutionGateSatisfied([
          { status: ActionStatus.IN_PROGRESS },
          { status: ActionStatus.CANCELLED },
        ])
      ).toBe(false);

      // Multiple open actions block gate
      expect(
        isResolutionGateSatisfied([
          { status: ActionStatus.PLANNED },
          { status: ActionStatus.IN_PROGRESS },
        ])
      ).toBe(false);
    });

    it("UT-06: Pure domain reopen status calculation rule (BR-11, FR-48)", () => {
      // Assigned ticket reopens to IN_PROGRESS
      expect(calculateReopenStatus(somchaiUser.id)).toBe(TicketStatus.IN_PROGRESS);
      expect(calculateReopenStatus(1)).toBe(TicketStatus.IN_PROGRESS);

      // Unassigned ticket reopens to NEW
      expect(calculateReopenStatus(null)).toBe(TicketStatus.NEW);
      expect(calculateReopenStatus(undefined)).toBe(TicketStatus.NEW);
    });
  });

  // --------------------------------------------------------------------------
  // API Integration Tests (API-28 to API-34)
  // --------------------------------------------------------------------------
  describe("API Integration Tests: Ticket Lifecycle & Resolution Gate", () => {
    it("API-28: Attempt ticket resolution with open Actions Taken is rejected with HTTP 409 Conflict (AC-07, FR-43, BR-06)", async () => {
      // 1. Create a ticket in IN_PROGRESS status
      const ticket = await prisma.ticket.create({
        data: {
          ticketNo: `TKT-F15-GATE-${Date.now()}`,
          title: "Resolution Gate Open Action Test",
          description: "Testing blocked resolution when open actions exist.",
          requesterId: jenniferUser.id,
          ownerId: somchaiUser.id,
          categoryId: category.id,
          relatedSystemId: relatedSystem.id,
          requestedPriority: "HIGH",
          itPriority: "HIGH",
          status: TicketStatus.IN_PROGRESS,
        },
      });

      // 2. Add an action with status PLANNED and one with status COMPLETED
      await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: somchaiUser.id,
          description: "Completed diagnostic check.",
          status: ActionStatus.COMPLETED,
        },
      });

      await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: somchaiUser.id,
          description: "Planned replacement of network card.",
          status: ActionStatus.PLANNED,
        },
      });

      // 3. IT Staff attempts to transition status to RESOLVED
      const res = await request(app)
        .patch(`/api/v1/tickets/${ticket.id}`)
        .set("Cookie", staffCookie)
        .send({
          status: "RESOLVED",
          resolutionSummary: "Replaced card and completed diagnostics.",
          version: ticket.version,
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("TICKET_STATE_CONFLICT");
      expect(res.body.error.message).toContain("cannot be resolved while actions taken remain open");
      expect(res.body.error.fieldErrors).toBeDefined();
      expect(res.body.error.fieldErrors[0].field).toBe("status");
      expect(res.body.error.fieldErrors[0].message).toContain("open action(s)");

      // 4. Assert ticket status remains unmodified in the database
      const dbTicket = await prisma.ticket.findUniqueOrThrow({
        where: { id: ticket.id },
      });
      expect(dbTicket.status).toBe(TicketStatus.IN_PROGRESS);
    });

    it("API-29: Resolve ticket after all Actions Taken completed or cancelled (AC-08, FR-43, BR-07)", async () => {
      // 1. Create a ticket in IN_PROGRESS status with all actions terminal
      const ticket = await prisma.ticket.create({
        data: {
          ticketNo: `TKT-F15-RESOLVE-${Date.now()}`,
          title: "Resolution Success Test",
          description: "Testing successful resolution when all actions are terminal.",
          requesterId: jenniferUser.id,
          ownerId: somchaiUser.id,
          categoryId: category.id,
          relatedSystemId: relatedSystem.id,
          requestedPriority: "MEDIUM",
          itPriority: "MEDIUM",
          status: TicketStatus.IN_PROGRESS,
        },
      });

      await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: somchaiUser.id,
          description: "Performed memory cleaning.",
          status: ActionStatus.COMPLETED,
        },
      });

      await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: somchaiUser.id,
          description: "Cancelled redundant benchmark test.",
          status: ActionStatus.CANCELLED,
        },
      });

      // 2. IT Staff transitions status to RESOLVED with valid summary
      const res = await request(app)
        .patch(`/api/v1/tickets/${ticket.id}`)
        .set("Cookie", staffCookie)
        .send({
          status: "RESOLVED",
          resolutionSummary: "Cleaned memory contacts and ran system stability tests without errors.",
          version: ticket.version,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("RESOLVED");
      expect(res.body.resolutionSummary).toContain("Cleaned memory contacts");

      // Verify in DB
      const dbTicket = await prisma.ticket.findUniqueOrThrow({
        where: { id: ticket.id },
      });
      expect(dbTicket.status).toBe(TicketStatus.RESOLVED);
    });

    it("API-30: Requester attempts to directly set ticket to Resolved or Closed (FR-44, BR-13)", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNo: `TKT-F15-REQ-FORBIDDEN-${Date.now()}`,
          title: "Requester Forbidden Resolution Test",
          description: "Requesters cannot directly change status.",
          requesterId: jenniferUser.id,
          categoryId: category.id,
          relatedSystemId: relatedSystem.id,
          requestedPriority: "MEDIUM",
          status: TicketStatus.IN_PROGRESS,
        },
      });

      const res = await request(app)
        .patch(`/api/v1/tickets/${ticket.id}`)
        .set("Cookie", requesterCookie)
        .send({
          status: "RESOLVED",
          resolutionSummary: "I fixed it myself.",
          version: ticket.version,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");

      // Verify status is unchanged
      const dbTicket = await prisma.ticket.findUniqueOrThrow({
        where: { id: ticket.id },
      });
      expect(dbTicket.status).toBe(TicketStatus.IN_PROGRESS);
    });

    it("API-31: Requester submits 'Problem Appears Resolved' with open actions (FR-45, FR-46, BR-08, BR-09)", async () => {
      // 1. Create ticket with open action
      const ticket = await prisma.ticket.create({
        data: {
          ticketNo: `TKT-F15-ADVISORY-${Date.now()}`,
          title: "Advisory Resolution Confirmation Test",
          description: "Testing advisory confirmation with open actions.",
          requesterId: jenniferUser.id,
          ownerId: somchaiUser.id,
          categoryId: category.id,
          relatedSystemId: relatedSystem.id,
          requestedPriority: "HIGH",
          itPriority: "HIGH",
          status: TicketStatus.IN_PROGRESS,
        },
      });

      await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: somchaiUser.id,
          description: "In-progress hardware review.",
          status: ActionStatus.IN_PROGRESS,
        },
      });

      // 2. Requester submits advisory confirmation
      const res = await request(app)
        .post(`/api/v1/tickets/${ticket.id}/resolve-indication`)
        .set("Cookie", requesterCookie)
        .send({
          note: "The laptop seems to work fine now, thanks!",
        });

      expect(res.status).toBe(200);
      expect(res.body.requesterResolutionConfirmedAt).toBeDefined();
      expect(res.body.hasOpenActionsWarning).toBe(true);

      // Verify DB: formal ticket status is NOT changed to RESOLVED
      const dbTicket = await prisma.ticket.findUniqueOrThrow({
        where: { id: ticket.id },
      });
      expect(dbTicket.status).toBe(TicketStatus.IN_PROGRESS);
      expect(dbTicket.requesterResolutionConfirmedAt).not.toBeNull();

      // Verify Public Comment was appended
      const comments = await prisma.ticketComment.findMany({
        where: { ticketId: ticket.id },
      });
      expect(comments.length).toBeGreaterThanOrEqual(1);
      expect(comments[0].content).toContain("work fine now");
      expect(comments[0].type).toBe("PUBLIC");
    });

    it("API-32: Ticket cancellation cascades to open actions atomically (AC-09, FR-47, BR-10)", async () => {
      // 1. Create ticket with open and terminal actions
      const ticket = await prisma.ticket.create({
        data: {
          ticketNo: `TKT-F15-CANCEL-${Date.now()}`,
          title: "Cascade Cancellation Test",
          description: "Cancelling ticket cancels open actions.",
          requesterId: jenniferUser.id,
          ownerId: somchaiUser.id,
          categoryId: category.id,
          relatedSystemId: relatedSystem.id,
          requestedPriority: "MEDIUM",
          itPriority: "MEDIUM",
          status: TicketStatus.IN_PROGRESS,
        },
      });

      const openAction1 = await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: somchaiUser.id,
          description: "Planned network analysis.",
          status: ActionStatus.PLANNED,
        },
      });

      const openAction2 = await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: somchaiUser.id,
          description: "Ongoing firmware flash.",
          status: ActionStatus.IN_PROGRESS,
        },
      });

      const completedAction = await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: somchaiUser.id,
          description: "Initial diagnostics logged.",
          status: ActionStatus.COMPLETED,
        },
      });

      // 2. Cancel ticket with reason
      const cancelReason = "User withdrew ticket; system no longer requires maintenance.";
      const res = await request(app)
        .patch(`/api/v1/tickets/${ticket.id}`)
        .set("Cookie", staffCookie)
        .send({
          status: "CANCELLED",
          resolutionSummary: cancelReason,
          version: ticket.version,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("CANCELLED");

      // 3. Verify in database: open actions transitioned to CANCELLED
      const dbAction1 = await prisma.actionTaken.findUniqueOrThrow({
        where: { id: openAction1.id },
      });
      expect(dbAction1.status).toBe(ActionStatus.CANCELLED);
      expect(dbAction1.result).toContain(cancelReason);

      const dbAction2 = await prisma.actionTaken.findUniqueOrThrow({
        where: { id: openAction2.id },
      });
      expect(dbAction2.status).toBe(ActionStatus.CANCELLED);
      expect(dbAction2.result).toContain(cancelReason);

      // Terminal COMPLETED action remains COMPLETED
      const dbAction3 = await prisma.actionTaken.findUniqueOrThrow({
        where: { id: completedAction.id },
      });
      expect(dbAction3.status).toBe(ActionStatus.COMPLETED);
    });

    it("API-33: Authorized user reopens assigned ticket to IN_PROGRESS (AC-10, FR-48, BR-11)", async () => {
      // 1. Create a resolved ticket with an assigned owner
      const ticket = await prisma.ticket.create({
        data: {
          ticketNo: `TKT-F15-REOPEN-ASSIGNED-${Date.now()}`,
          title: "Reopen Assigned Ticket Test",
          description: "Reopening assigned ticket.",
          requesterId: jenniferUser.id,
          ownerId: somchaiUser.id,
          categoryId: category.id,
          relatedSystemId: relatedSystem.id,
          requestedPriority: "MEDIUM",
          itPriority: "MEDIUM",
          status: TicketStatus.RESOLVED,
          resolutionSummary: "Previous resolution completed.",
        },
      });

      // 2. IT Staff reopens the ticket
      const res = await request(app)
        .patch(`/api/v1/tickets/${ticket.id}`)
        .set("Cookie", staffCookie)
        .send({
          status: "IN_PROGRESS",
          version: ticket.version,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("IN_PROGRESS");
      expect(res.body.ownerId).toBe(somchaiUser.id);

      const dbTicket = await prisma.ticket.findUniqueOrThrow({
        where: { id: ticket.id },
      });
      expect(dbTicket.status).toBe(TicketStatus.IN_PROGRESS);
    });

    it("API-34: Authorized user reopens unassigned ticket to NEW (AC-10, FR-48, BR-11)", async () => {
      // 1. Create a cancelled ticket without an owner
      const ticket = await prisma.ticket.create({
        data: {
          ticketNo: `TKT-F15-REOPEN-UNASSIGNED-${Date.now()}`,
          title: "Reopen Unassigned Ticket Test",
          description: "Reopening unassigned ticket.",
          requesterId: jenniferUser.id,
          ownerId: null,
          categoryId: category.id,
          relatedSystemId: relatedSystem.id,
          requestedPriority: "LOW",
          status: TicketStatus.CANCELLED,
          resolutionSummary: "Cancelled earlier.",
        },
      });

      // 2. IT Staff reopens ticket
      const res = await request(app)
        .patch(`/api/v1/tickets/${ticket.id}`)
        .set("Cookie", staffCookie)
        .send({
          status: "NEW",
          version: ticket.version,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("NEW");
      expect(res.body.ownerId).toBeNull();

      const dbTicket = await prisma.ticket.findUniqueOrThrow({
        where: { id: ticket.id },
      });
      expect(dbTicket.status).toBe(TicketStatus.NEW);
    });
  });
});
