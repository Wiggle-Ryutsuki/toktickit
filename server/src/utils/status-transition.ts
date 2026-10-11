import { TicketStatus, ActionStatus } from "@prisma/client";

/**
 * Status Transition Matrix conforming to BR-08, BR-11, and SDS-SYS-001 Decision D-02:
 * - NEW -> ASSIGNED, IN_PROGRESS, CANCELLED
 * - ASSIGNED -> IN_PROGRESS, PENDING_REQUESTER, CANCELLED
 * - IN_PROGRESS -> PENDING_REQUESTER, RESOLVED, CANCELLED
 * - PENDING_REQUESTER -> IN_PROGRESS, RESOLVED, CANCELLED
 * - RESOLVED -> CLOSED, IN_PROGRESS (Reopen), NEW (Reopen if unassigned)
 * - CLOSED -> IN_PROGRESS (Reopen), NEW (Reopen if unassigned)
 * - CANCELLED -> IN_PROGRESS (Reopen), NEW (Reopen if unassigned)
 * - Same-status transitions are permitted (idempotent / no-op)
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: [TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.CANCELLED],
  ASSIGNED: [TicketStatus.IN_PROGRESS, TicketStatus.PENDING_REQUESTER, TicketStatus.CANCELLED],
  IN_PROGRESS: [TicketStatus.PENDING_REQUESTER, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
  PENDING_REQUESTER: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
  RESOLVED: [TicketStatus.CLOSED, TicketStatus.IN_PROGRESS],
  CLOSED: [TicketStatus.IN_PROGRESS],
  CANCELLED: [], // Terminal status in static transition matrix; dynamic reopen handled via calculateReopenStatus
};

/**
 * Validates whether transitioning from currentStatus to nextStatus is permitted by BR-08 / BR-11.
 */
export function isValidStatusTransition(
  currentStatus: TicketStatus,
  nextStatus: TicketStatus
): boolean {
  if (currentStatus === nextStatus) {
    return true;
  }
  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(nextStatus) : false;
}

/**
 * Returns array of permitted next statuses from the given current status, including current status.
 */
export function getAllowedTransitions(currentStatus: TicketStatus): TicketStatus[] {
  const nextStatuses = ALLOWED_STATUS_TRANSITIONS[currentStatus] ?? [];
  return [currentStatus, ...nextStatuses];
}

/**
 * Pure domain rule calculating reopen status (FR-48, BR-11, UT-06):
 * - If ownerId is present / not null, returns IN_PROGRESS
 * - If ownerId is null or undefined, returns NEW
 */
export function calculateReopenStatus(ownerId?: number | null): TicketStatus {
  if (ownerId !== null && ownerId !== undefined) {
    return TicketStatus.IN_PROGRESS;
  }
  return TicketStatus.NEW;
}

/**
 * Pure domain rule checking whether the Resolution Gate is satisfied (FR-43, BR-06, BR-07, UT-05):
 * - Returns false if ANY action has status PLANNED or IN_PROGRESS
 * - Returns true if all actions are in terminal states (COMPLETED or CANCELLED), or if zero actions exist.
 */
export function isResolutionGateSatisfied(
  actions: Array<{ status: string | ActionStatus }>
): boolean {
  return !actions.some(
    (action) =>
      action.status === ActionStatus.PLANNED ||
      action.status === ActionStatus.IN_PROGRESS ||
      action.status === "PLANNED" ||
      action.status === "IN_PROGRESS"
  );
}

/**
 * Counts open actions (status PLANNED or IN_PROGRESS) for error reporting.
 */
export function countOpenActions(
  actions: Array<{ status: string | ActionStatus }>
): number {
  return actions.filter(
    (action) =>
      action.status === ActionStatus.PLANNED ||
      action.status === ActionStatus.IN_PROGRESS ||
      action.status === "PLANNED" ||
      action.status === "IN_PROGRESS"
  ).length;
}
