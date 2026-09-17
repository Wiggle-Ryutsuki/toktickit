import { describe, it, expect } from "vitest";
import { TicketStatus } from "@prisma/client";
import {
  isValidStatusTransition,
  getAllowedTransitions,
} from "../../src/utils/status-transition.js";

describe("Status Transition State Machine Unit Tests (UT-02, BR-08)", () => {
  it("UT-02.1: Allows valid transitions from NEW", () => {
    expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.ASSIGNED)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.IN_PROGRESS)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.CANCELLED)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.NEW)).toBe(true);
  });

  it("UT-02.2: Rejects invalid direct jumps from NEW to RESOLVED or CLOSED", () => {
    expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.RESOLVED)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.CLOSED)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.PENDING_REQUESTER)).toBe(false);
  });

  it("UT-02.3: Allows valid transitions from ASSIGNED", () => {
    expect(isValidStatusTransition(TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.ASSIGNED, TicketStatus.PENDING_REQUESTER)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.ASSIGNED, TicketStatus.CANCELLED)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.ASSIGNED, TicketStatus.RESOLVED)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.ASSIGNED, TicketStatus.CLOSED)).toBe(false);
  });

  it("UT-02.4: Allows valid transitions from IN_PROGRESS", () => {
    expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.PENDING_REQUESTER)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.CANCELLED)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.NEW)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.CLOSED)).toBe(false);
  });

  it("UT-02.5: Allows valid transitions from PENDING_REQUESTER", () => {
    expect(isValidStatusTransition(TicketStatus.PENDING_REQUESTER, TicketStatus.IN_PROGRESS)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.PENDING_REQUESTER, TicketStatus.RESOLVED)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.PENDING_REQUESTER, TicketStatus.CANCELLED)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.PENDING_REQUESTER, TicketStatus.NEW)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.PENDING_REQUESTER, TicketStatus.CLOSED)).toBe(false);
  });

  it("UT-02.6: Allows valid transitions from RESOLVED (Closing and Reopening)", () => {
    expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.CLOSED)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.IN_PROGRESS)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.NEW)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.CANCELLED)).toBe(false);
  });

  it("UT-02.7: Allows valid transitions from CLOSED (Reopening)", () => {
    expect(isValidStatusTransition(TicketStatus.CLOSED, TicketStatus.IN_PROGRESS)).toBe(true);
    expect(isValidStatusTransition(TicketStatus.CLOSED, TicketStatus.RESOLVED)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.CLOSED, TicketStatus.NEW)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.CLOSED, TicketStatus.CANCELLED)).toBe(false);
  });

  it("UT-02.8: Terminal CANCELLED status rejects all transitions to other states", () => {
    expect(isValidStatusTransition(TicketStatus.CANCELLED, TicketStatus.NEW)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.CANCELLED, TicketStatus.IN_PROGRESS)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.CANCELLED, TicketStatus.RESOLVED)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.CANCELLED, TicketStatus.CLOSED)).toBe(false);
    expect(isValidStatusTransition(TicketStatus.CANCELLED, TicketStatus.CANCELLED)).toBe(true);
  });

  it("UT-02.9: getAllowedTransitions returns current status and all valid next states", () => {
    const transitionsFromNew = getAllowedTransitions(TicketStatus.NEW);
    expect(transitionsFromNew).toEqual([
      TicketStatus.NEW,
      TicketStatus.ASSIGNED,
      TicketStatus.IN_PROGRESS,
      TicketStatus.CANCELLED,
    ]);

    const transitionsFromResolved = getAllowedTransitions(TicketStatus.RESOLVED);
    expect(transitionsFromResolved).toEqual([
      TicketStatus.RESOLVED,
      TicketStatus.CLOSED,
      TicketStatus.IN_PROGRESS,
    ]);
  });
});
