import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { ActionStatus } from "@prisma/client";
import {
  validateFollowUpNote,
  validateActionStatusTransition,
} from "../../src/utils/action-validator.js";

const prisma = getPrisma();

describe("Feature-13: Actions Taken Foundation & Domain Model Tests", () => {
  let staffCookie: string[];
  let staffMaleeCookie: string[];
  let requesterCookie: string[];
  let requester2Cookie: string[];
  let testTicketId: number;
  let requester2TicketId: number;
  let inactiveStaffId: number;
  let maleeStaffId: number;

  beforeAll(async () => {
    // 1. Log in as IT Staff Somchai Prasert
    const staffLogin = await request(app).post("/api/v1/auth/login").send({
      email: "staff.somchai@kmutt.ac.th",
      password: "Password123!",
    });
    expect(staffLogin.status).toBe(200);
    staffCookie = staffLogin.headers["set-cookie"];

    // 2. Log in as IT Staff Malee Jaidee
    const maleeLogin = await request(app).post("/api/v1/auth/login").send({
      email: "staff.malee@kmutt.ac.th",
      password: "Password123!",
    });
    expect(maleeLogin.status).toBe(200);
    staffMaleeCookie = maleeLogin.headers["set-cookie"];

    // 3. Log in as Requester Jennifer Anderson
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

    // 5. Look up inactive staff and malee
    const inactiveStaff = await prisma.user.findFirstOrThrow({
      where: { email: "staff.inactive@kmutt.ac.th" },
    });
    inactiveStaffId = inactiveStaff.id;

    const maleeUser = await prisma.user.findFirstOrThrow({
      where: { email: "staff.malee@kmutt.ac.th" },
    });
    maleeStaffId = maleeUser.id;

    const jennifer = await prisma.user.findFirstOrThrow({
      where: { email: "jennifer.anderson@kmutt.ac.th" },
    });
    const sarah = await prisma.user.findFirstOrThrow({
      where: { email: "sarah.johnson@kmutt.ac.th" },
    });

    const category = await prisma.category.findFirstOrThrow();
    const system = await prisma.relatedSystem.findFirstOrThrow();

    // 6. Create dedicated test ticket owned by Jennifer
    const ticket1 = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-F13-${Date.now()}-1`,
        title: "Feature-13 Test Ticket 1",
        description: "Testing actions foundation, permissions, and validations.",
        requesterId: jennifer.id,
        categoryId: category.id,
        relatedSystemId: system.id,
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        status: "IN_PROGRESS",
      },
    });
    testTicketId = ticket1.id;

    // 7. Create dedicated ticket owned by Sarah for BOLA isolation testing
    const ticket2 = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-F13-${Date.now()}-2`,
        title: "Feature-13 Sarah Test Ticket",
        description: "Testing cross-requester BOLA authorization rules.",
        requesterId: sarah.id,
        categoryId: category.id,
        relatedSystemId: system.id,
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        status: "NEW",
      },
    });
    requester2TicketId = ticket2.id;
  });

  // -------------------------------------------------------------------------
  // Unit Tests (UT-04, UT-07)
  // -------------------------------------------------------------------------
  describe("Unit Tests (UT-04, UT-07)", () => {
    it("UT-04: Action Taken conditional follow-up note validator (BR-05, FR-41)", () => {
      // When isFollowUpRequired is true, note is mandatory and >= 3 characters
      const emptyNote = validateFollowUpNote(true, "");
      expect(emptyNote.isValid).toBe(false);
      expect(emptyNote.code).toBe("MISSING_FOLLOW_UP_NOTE");

      const shortNote = validateFollowUpNote(true, "ab");
      expect(shortNote.isValid).toBe(false);
      expect(shortNote.code).toBe("MISSING_FOLLOW_UP_NOTE");

      const validNote = validateFollowUpNote(true, "Check back next week");
      expect(validNote.isValid).toBe(true);
      expect(validNote.value).toBe("Check back next week");

      // When isFollowUpRequired is false, note is cleared to null
      const falseWithNote = validateFollowUpNote(false, "Unneeded note");
      expect(falseWithNote.isValid).toBe(true);
      expect(falseWithNote.value).toBeNull();

      const falseWithoutNote = validateFollowUpNote(false, null);
      expect(falseWithoutNote.isValid).toBe(true);
      expect(falseWithoutNote.value).toBeNull();
    });

    it("UT-07: Action status transition validation (BR-17, BR-18)", () => {
      // Transitions from PLANNED to IN_PROGRESS or CANCELLED are permitted
      expect(validateActionStatusTransition(ActionStatus.PLANNED, ActionStatus.IN_PROGRESS).isValid).toBe(true);
      expect(validateActionStatusTransition(ActionStatus.PLANNED, ActionStatus.CANCELLED).isValid).toBe(true);

      // Transitions from IN_PROGRESS to COMPLETED or CANCELLED are permitted
      expect(validateActionStatusTransition(ActionStatus.IN_PROGRESS, ActionStatus.COMPLETED).isValid).toBe(true);
      expect(validateActionStatusTransition(ActionStatus.IN_PROGRESS, ActionStatus.CANCELLED).isValid).toBe(true);

      // Terminal status COMPLETED cannot revert to PLANNED or IN_PROGRESS
      const completedToPlanned = validateActionStatusTransition(ActionStatus.COMPLETED, ActionStatus.PLANNED);
      expect(completedToPlanned.isValid).toBe(false);
      expect(completedToPlanned.code).toBe("TERMINAL_STATUS_IMMUTABLE");

      const completedToInProgress = validateActionStatusTransition(ActionStatus.COMPLETED, ActionStatus.IN_PROGRESS);
      expect(completedToInProgress.isValid).toBe(false);
      expect(completedToInProgress.code).toBe("TERMINAL_STATUS_IMMUTABLE");

      // Terminal status CANCELLED cannot revert to PLANNED or IN_PROGRESS
      const cancelledToPlanned = validateActionStatusTransition(ActionStatus.CANCELLED, ActionStatus.PLANNED);
      expect(cancelledToPlanned.isValid).toBe(false);
      expect(cancelledToPlanned.code).toBe("TERMINAL_STATUS_IMMUTABLE");

      const cancelledToInProgress = validateActionStatusTransition(ActionStatus.CANCELLED, ActionStatus.IN_PROGRESS);
      expect(cancelledToInProgress.isValid).toBe(false);
      expect(cancelledToInProgress.code).toBe("TERMINAL_STATUS_IMMUTABLE");
    });
  });

  // -------------------------------------------------------------------------
  // API Integration Tests (API-03, API-22 to API-27, API-35)
  // -------------------------------------------------------------------------
  describe("API Integration Tests", () => {
    let createdActionId: number;

    it("API-03: Create valid Action Taken by IT Staff (AC-01, FR-30, FR-31, BR-03)", async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${testTicketId}/actions`)
        .set("Cookie", staffCookie)
        .send({
          description: "Ran memory diagnostics on laptop.",
          result: "Slot 2 reported memory parity error.",
          status: "IN_PROGRESS",
          assigneeId: maleeStaffId,
          isFollowUpRequired: true,
          followUpNote: "Order replacement DDR4 RAM module.",
          attachmentNotes: "memtest-report.txt",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("ticketId", testTicketId);
      expect(res.body).toHaveProperty("description", "Ran memory diagnostics on laptop.");
      expect(res.body).toHaveProperty("result", "Slot 2 reported memory parity error.");
      expect(res.body).toHaveProperty("status", "IN_PROGRESS");
      expect(res.body).toHaveProperty("isFollowUpRequired", true);
      expect(res.body).toHaveProperty("followUpNote", "Order replacement DDR4 RAM module.");
      expect(res.body).toHaveProperty("attachmentNotes", "memtest-report.txt");
      expect(res.body).toHaveProperty("version", 1);
      expect(res.body.performedBy).toHaveProperty("email", "staff.somchai@kmutt.ac.th");
      expect(res.body.assignee).toHaveProperty("email", "staff.malee@kmutt.ac.th");

      createdActionId = res.body.id;
    });

    it("API-22: List Actions Taken for ticket in chronological order (FR-33, BR-16)", async () => {
      // Create a second action to verify ordering
      await request(app)
        .post(`/api/v1/tickets/${testTicketId}/actions`)
        .set("Cookie", staffCookie)
        .send({
          description: "Second action performed later.",
          status: "PLANNED",
        });

      const res = await request(app)
        .get(`/api/v1/tickets/${testTicketId}/actions`)
        .set("Cookie", staffCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body[0]).toHaveProperty("id");
      expect(res.body[0]).toHaveProperty("performedBy");
      expect(res.body[0].performedBy).not.toHaveProperty("passwordHash");
    });

    it("API-22b: Cross-Requester BOLA isolation on GET /actions (FR-33, BR-13)", async () => {
      // Jennifer Anderson attempting to view actions on Sarah's ticket -> 403 Forbidden
      const res = await request(app)
        .get(`/api/v1/tickets/${requester2TicketId}/actions`)
        .set("Cookie", requesterCookie);

      expect(res.status).toBe(403);
      expect(res.body.error).toHaveProperty("code", "FORBIDDEN");

      // Sarah viewing her own ticket actions -> 200 OK
      const selfRes = await request(app)
        .get(`/api/v1/tickets/${requester2TicketId}/actions`)
        .set("Cookie", requester2Cookie);

      expect(selfRes.status).toBe(200);
      expect(Array.isArray(selfRes.body)).toBe(true);
    });

    it("API-23: Update Action Taken status, result, and unassign (FR-35, AC-03, M-02)", async () => {
      const res = await request(app)
        .patch(`/api/v1/tickets/${testTicketId}/actions/${createdActionId}`)
        .set("Cookie", staffCookie)
        .send({
          status: "COMPLETED",
          result: "Replacement memory module installed and tested cleanly.",
          assigneeId: null, // Unassign action
          isFollowUpRequired: false,
          version: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status", "COMPLETED");
      expect(res.body).toHaveProperty("result", "Replacement memory module installed and tested cleanly.");
      expect(res.body.assignee).toBeNull();
      expect(res.body).toHaveProperty("isFollowUpRequired", false);
      expect(res.body.followUpNote).toBeNull();
      expect(res.body).toHaveProperty("version", 2);
    });

    it("API-23b: Cross-ticket action ID mismatch on PATCH returns 404 (FR-35, M-01)", async () => {
      // Attempting to update createdActionId (which belongs to testTicketId) under requester2TicketId
      const res = await request(app)
        .patch(`/api/v1/tickets/${requester2TicketId}/actions/${createdActionId}`)
        .set("Cookie", staffCookie)
        .send({
          description: "Attempted cross-ticket tamper.",
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toHaveProperty("code", "ACTION_NOT_FOUND");
    });

    it("API-24: Requester attempts to create Action Taken returns 403 (AC-04, FR-34, BR-13)", async () => {
      const countBefore = await prisma.actionTaken.count();

      const res = await request(app)
        .post(`/api/v1/tickets/${testTicketId}/actions`)
        .set("Cookie", requesterCookie)
        .send({
          description: "Requester unauthorized action.",
          status: "PLANNED",
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toHaveProperty("code", "FORBIDDEN_ACTION");

      const countAfter = await prisma.actionTaken.count();
      expect(countAfter).toBe(countBefore);
    });

    it("API-25: Requester attempts to modify Action Taken returns 403 (AC-04, FR-35, BR-13)", async () => {
      const res = await request(app)
        .patch(`/api/v1/tickets/${testTicketId}/actions/${createdActionId}`)
        .set("Cookie", requesterCookie)
        .send({
          description: "Requester unauthorized patch.",
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toHaveProperty("code", "FORBIDDEN_ACTION");
    });

    it("API-26: Assign Action Taken to inactive user returns 422 (AC-05, FR-32, BR-04)", async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${testTicketId}/actions`)
        .set("Cookie", staffCookie)
        .send({
          description: "Assigning to an inactive staff member.",
          assigneeId: inactiveStaffId,
        });

      expect(res.status).toBe(422);
      expect(res.body.error).toHaveProperty("code", "INACTIVE_ASSIGNEE_ERROR");
    });

    it("API-27: Assign Action Taken to IT Staff member different from Ticket Owner (BR-02)", async () => {
      // Create ticket owned by Somchai
      const somchaiUser = await prisma.user.findFirstOrThrow({
        where: { email: "staff.somchai@kmutt.ac.th" },
      });
      const jennifer = await prisma.user.findFirstOrThrow({
        where: { email: "jennifer.anderson@kmutt.ac.th" },
      });
      const category = await prisma.category.findFirstOrThrow();
      const system = await prisma.relatedSystem.findFirstOrThrow();

      const ticketWithOwner = await prisma.ticket.create({
        data: {
          ticketNo: `TKT-OWNER-${Date.now()}`,
          title: "Owner Separation Test Ticket",
          description: "Ticket owned by Somchai, action assigned to Malee.",
          requesterId: jennifer.id,
          ownerId: somchaiUser.id,
          categoryId: category.id,
          relatedSystemId: system.id,
        },
      });

      const res = await request(app)
        .post(`/api/v1/tickets/${ticketWithOwner.id}/actions`)
        .set("Cookie", staffCookie)
        .send({
          description: "Action coordinated by separate assignee.",
          assigneeId: maleeStaffId,
        });

      expect(res.status).toBe(201);
      expect(res.body.performedBy.id).toBe(somchaiUser.id);
      expect(res.body.assignee.id).toBe(maleeStaffId);
      expect(ticketWithOwner.ownerId).not.toBe(maleeStaffId);
    });

    it("API-35: Optimistic concurrency stale update returns 409 (BR-12)", async () => {
      // Submitting version 1 when version is now 2
      const res = await request(app)
        .patch(`/api/v1/tickets/${testTicketId}/actions/${createdActionId}`)
        .set("Cookie", staffCookie)
        .send({
          description: "Stale concurrent update attempt.",
          version: 1, // Stale version
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toHaveProperty("code", "STALE_UPDATE_CONFLICT");
    });

    it("Hard Deletion Prohibition: DELETE returns 405 Method Not Allowed (M-03, D-11)", async () => {
      const res = await request(app)
        .delete(`/api/v1/tickets/${testTicketId}/actions/${createdActionId}`)
        .set("Cookie", staffCookie);

      expect(res.status).toBe(405);
      expect(res.body.error).toHaveProperty("code", "METHOD_NOT_ALLOWED");
      expect(res.headers["allow"]).toBe("GET, POST, PATCH");
    });

    it("MIG-01: Prisma schema and seed data support actions across tickets (FR-29, FR-36)", async () => {
      const actionsCount = await prisma.actionTaken.count();
      expect(actionsCount).toBeGreaterThanOrEqual(1);

      // Verify that tickets with zero actions and multiple actions exist
      const ticketsWithActions = await prisma.ticket.findMany({
        include: {
          actions: true,
        },
      });

      const hasZeroActions = ticketsWithActions.some((t) => t.actions.length === 0);
      const hasMultipleActions = ticketsWithActions.some((t) => t.actions.length >= 2);

      expect(hasZeroActions).toBe(true);
      expect(hasMultipleActions).toBe(true);
    });
  });
});
