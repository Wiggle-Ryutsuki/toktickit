import { TicketStatus } from "@prisma/client";

/**
 * Status Transition Matrix conforming to BR-08 and SDS-SYS-001 Decision D-02:
 * - NEW -> ASSIGNED, IN_PROGRESS, CANCELLED
 * - ASSIGNED -> IN_PROGRESS, PENDING_REQUESTER, CANCELLED
 * - IN_PROGRESS -> PENDING_REQUESTER, RESOLVED, CANCELLED
 * - PENDING_REQUESTER -> IN_PROGRESS, RESOLVED, CANCELLED
 * - RESOLVED -> CLOSED, IN_PROGRESS (Reopen)
 * - CLOSED -> IN_PROGRESS (Reopen)
 * - Same-status transitions are permitted (idempotent / no-op)
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: [TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.CANCELLED],
  ASSIGNED: [TicketStatus.IN_PROGRESS, TicketStatus.PENDING_REQUESTER, TicketStatus.CANCELLED],
  IN_PROGRESS: [TicketStatus.PENDING_REQUESTER, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
  PENDING_REQUESTER: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
  RESOLVED: [TicketStatus.CLOSED, TicketStatus.IN_PROGRESS],
  CLOSED: [TicketStatus.IN_PROGRESS],
  CANCELLED: [], // Terminal status
};

/**
 * Validates whether transitioning from currentStatus to nextStatus is permitted by BR-08.
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
