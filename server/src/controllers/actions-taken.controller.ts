import { Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { ActionStatus } from "@prisma/client";
import {
  validateActionDescription,
  validateActionResult,
  validateFollowUpNote,
  validateActionStatusTransition,
  validateAttachmentNotes,
} from "../utils/action-validator.js";

function getCorrelationId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  fieldErrors: { field: string; message: string }[] = []
): Response {
  return res.status(status).json({
    error: {
      code,
      message,
      fieldErrors,
      correlationId: getCorrelationId(),
    },
  });
}

const USER_SELECT = {
  id: true,
  displayName: true,
  email: true,
  role: true,
};

function toActionDto(action: any) {
  return {
    id: action.id,
    ticketId: action.ticketId,
    actionDateTime:
      action.actionDateTime instanceof Date
        ? action.actionDateTime.toISOString()
        : action.actionDateTime,
    description: action.description,
    result: action.result ?? null,
    status: action.status,
    performedBy: action.performedBy
      ? {
          id: action.performedBy.id,
          displayName: action.performedBy.displayName,
          email: action.performedBy.email,
          role: action.performedBy.role,
        }
      : null,
    assignee: action.assignee
      ? {
          id: action.assignee.id,
          displayName: action.assignee.displayName,
          email: action.assignee.email,
          role: action.assignee.role,
        }
      : null,
    isFollowUpRequired: Boolean(action.isFollowUpRequired),
    followUpNote: action.followUpNote ?? null,
    attachmentNotes: action.attachmentNotes ?? null,
    version: action.version,
    createdAt:
      action.createdAt instanceof Date
        ? action.createdAt.toISOString()
        : action.createdAt,
    updatedAt:
      action.updatedAt instanceof Date
        ? action.updatedAt.toISOString()
        : action.updatedAt,
  };
}

/**
 * GET /api/v1/tickets/:id/actions
 * Retrieves all Actions Taken for a ticket in ascending chronological order.
 */
export async function getActions(req: Request, res: Response): Promise<Response> {
  const rawTicketId = req.params.id;
  if (!rawTicketId || !/^\d+$/.test(rawTicketId.trim())) {
    return sendError(res, 400, "BAD_REQUEST", "Invalid ticket ID parameter.");
  }
  const ticketId = parseInt(rawTicketId.trim(), 10);

  if (!req.user) {
    return sendError(res, 401, "UNAUTHORIZED", "Authentication required. Please log in.");
  }

  const prisma = getPrisma();
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, requesterId: true },
  });

  if (!ticket) {
    return sendError(res, 404, "TICKET_NOT_FOUND", `Ticket with ID ${ticketId} not found.`);
  }

  // Requester BOLA check: Requesters can only access actions on tickets they own
  if (req.user.role === "REQUESTER" && ticket.requesterId !== req.user.id) {
    return sendError(
      res,
      403,
      "FORBIDDEN",
      "Access denied. You do not have permission to view actions on this ticket."
    );
  }

  try {
    const actions = await prisma.actionTaken.findMany({
      where: { ticketId },
      include: {
        performedBy: { select: USER_SELECT },
        assignee: { select: USER_SELECT },
      },
      orderBy: [{ actionDateTime: "asc" }, { id: "asc" }],
    });

    return res.status(200).json(actions.map(toActionDto));
  } catch (error) {
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "Failed to retrieve Actions Taken.");
  }
}

/**
 * POST /api/v1/tickets/:id/actions
 * Creates and appends a new Action Taken record to a ticket.
 */
export async function createAction(req: Request, res: Response): Promise<Response> {
  const rawTicketId = req.params.id;
  if (!rawTicketId || !/^\d+$/.test(rawTicketId.trim())) {
    return sendError(res, 400, "BAD_REQUEST", "Invalid ticket ID parameter.");
  }
  const ticketId = parseInt(rawTicketId.trim(), 10);

  if (!req.user) {
    return sendError(res, 401, "UNAUTHORIZED", "Authentication required. Please log in.");
  }

  // Requesters are strictly forbidden from creating Actions Taken (BR-13, AC-04)
  if (req.user.role === "REQUESTER") {
    return sendError(
      res,
      403,
      "FORBIDDEN_ACTION",
      "Requesters are not permitted to record Actions Taken."
    );
  }

  const prisma = getPrisma();
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true },
  });

  if (!ticket) {
    return sendError(res, 404, "TICKET_NOT_FOUND", `Ticket with ID ${ticketId} not found.`);
  }

  const {
    description,
    result,
    status,
    assigneeId,
    isFollowUpRequired,
    followUpNote,
    attachmentNotes,
    actionDateTime,
  } = req.body;

  // Validate description
  const descResult = validateActionDescription(description);
  if (!descResult.isValid) {
    return sendError(res, 422, descResult.code || "VALIDATION_ERROR", descResult.error!, [
      { field: "description", message: descResult.error! },
    ]);
  }

  // Validate result
  const resValidation = validateActionResult(result);
  if (!resValidation.isValid) {
    return sendError(res, 422, resValidation.code || "VALIDATION_ERROR", resValidation.error!, [
      { field: "result", message: resValidation.error! },
    ]);
  }

  // Validate status
  let parsedStatus: ActionStatus = ActionStatus.PLANNED;
  if (status !== undefined) {
    if (!Object.values(ActionStatus).includes(status)) {
      return sendError(res, 422, "INVALID_STATUS", `Invalid action status: ${status}.`, [
        { field: "status", message: `Valid statuses are: ${Object.values(ActionStatus).join(", ")}` },
      ]);
    }
    parsedStatus = status as ActionStatus;
  }

  // Validate follow-up
  const followUpRequiredBool = Boolean(isFollowUpRequired);
  const followUpValidation = validateFollowUpNote(followUpRequiredBool, followUpNote);
  if (!followUpValidation.isValid) {
    return sendError(
      res,
      422,
      followUpValidation.code || "VALIDATION_ERROR",
      followUpValidation.error!,
      [{ field: "followUpNote", message: followUpValidation.error! }]
    );
  }

  // Validate attachment notes
  const attachValidation = validateAttachmentNotes(attachmentNotes);
  if (!attachValidation.isValid) {
    return sendError(
      res,
      422,
      attachValidation.code || "VALIDATION_ERROR",
      attachValidation.error!,
      [{ field: "attachmentNotes", message: attachValidation.error! }]
    );
  }

  // Validate assignee if provided (BR-04, AC-05)
  let parsedAssigneeId: number | null = null;
  if (assigneeId !== undefined && assigneeId !== null) {
    const rawAssignee = Number(assigneeId);
    if (isNaN(rawAssignee) || rawAssignee <= 0) {
      return sendError(res, 422, "INVALID_ASSIGNEE", "Invalid assignee ID format.");
    }

    const assigneeUser = await prisma.user.findUnique({
      where: { id: rawAssignee },
      select: { id: true, isActive: true, role: true },
    });

    if (
      !assigneeUser ||
      !assigneeUser.isActive ||
      (assigneeUser.role !== "IT_STAFF" && assigneeUser.role !== "ADMINISTRATOR")
    ) {
      return sendError(
        res,
        422,
        "INACTIVE_ASSIGNEE_ERROR",
        "Action assignee must be an active IT Staff or Administrator account."
      );
    }
    parsedAssigneeId = assigneeUser.id;
  }

  // Parse actionDateTime if provided
  let parsedDateTime = new Date();
  if (actionDateTime) {
    const dt = new Date(actionDateTime);
    if (!isNaN(dt.getTime())) {
      parsedDateTime = dt;
    }
  }

  try {
    const newAction = await prisma.actionTaken.create({
      data: {
        ticketId,
        actionDateTime: parsedDateTime,
        description: descResult.value!,
        result: resValidation.value ?? null,
        status: parsedStatus,
        performedById: req.user.id, // Authoritatively populated from authenticated session (BR-03)
        assigneeId: parsedAssigneeId,
        isFollowUpRequired: followUpRequiredBool,
        followUpNote: followUpValidation.value ?? null,
        attachmentNotes: attachValidation.value ?? null,
        version: 1,
      },
      include: {
        performedBy: { select: USER_SELECT },
        assignee: { select: USER_SELECT },
      },
    });

    return res.status(201).json(toActionDto(newAction));
  } catch (error) {
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "Failed to create Action Taken.");
  }
}

/**
 * PATCH /api/v1/tickets/:id/actions/:actionId
 * Updates an existing Action Taken record.
 */
export async function updateAction(req: Request, res: Response): Promise<Response> {
  const rawTicketId = req.params.id;
  const rawActionId = req.params.actionId;

  if (
    !rawTicketId ||
    !/^\d+$/.test(rawTicketId.trim()) ||
    !rawActionId ||
    !/^\d+$/.test(rawActionId.trim())
  ) {
    return sendError(res, 400, "BAD_REQUEST", "Invalid ticket ID or action ID parameter.");
  }

  const ticketId = parseInt(rawTicketId.trim(), 10);
  const actionId = parseInt(rawActionId.trim(), 10);

  if (!req.user) {
    return sendError(res, 401, "UNAUTHORIZED", "Authentication required. Please log in.");
  }

  // Requesters are strictly forbidden from modifying Actions Taken (BR-13, AC-04)
  if (req.user.role === "REQUESTER") {
    return sendError(
      res,
      403,
      "FORBIDDEN_ACTION",
      "Requesters are not permitted to modify Actions Taken."
    );
  }

  const prisma = getPrisma();

  // Cross-ticket scoping guard (M-01): verify action exists AND belongs to :id (ticketId)
  const existingAction = await prisma.actionTaken.findUnique({
    where: { id: actionId },
    include: {
      performedBy: { select: USER_SELECT },
      assignee: { select: USER_SELECT },
    },
  });

  if (!existingAction || existingAction.ticketId !== ticketId) {
    return sendError(
      res,
      404,
      "ACTION_NOT_FOUND",
      `Action Taken with ID ${actionId} not found under ticket ${ticketId}.`
    );
  }

  const {
    description,
    result,
    status,
    assigneeId,
    isFollowUpRequired,
    followUpNote,
    attachmentNotes,
    version,
  } = req.body;

  // Optimistic concurrency control (BR-12, API-35)
  if (version !== undefined && Number(version) !== existingAction.version) {
    return sendError(
      res,
      409,
      "STALE_UPDATE_CONFLICT",
      "Action Taken has been updated by another user. Please refresh and try again."
    );
  }

  // Validate terminal status immutability (BR-17, UT-07)
  let updatedStatus: ActionStatus = existingAction.status;
  if (status !== undefined) {
    if (!Object.values(ActionStatus).includes(status)) {
      return sendError(res, 422, "INVALID_STATUS", `Invalid action status: ${status}.`);
    }

    const statusTransitionCheck = validateActionStatusTransition(
      existingAction.status,
      status as ActionStatus
    );
    if (!statusTransitionCheck.isValid) {
      return sendError(
        res,
        422,
        statusTransitionCheck.code || "TERMINAL_STATUS_IMMUTABLE",
        statusTransitionCheck.error!
      );
    }
    updatedStatus = status as ActionStatus;
  }

  // Validate description if provided
  let updatedDescription = existingAction.description;
  if (description !== undefined) {
    const descResult = validateActionDescription(description);
    if (!descResult.isValid) {
      return sendError(res, 422, descResult.code || "VALIDATION_ERROR", descResult.error!);
    }
    updatedDescription = descResult.value!;
  }

  // Validate result if provided
  let updatedResult = existingAction.result;
  if (result !== undefined) {
    const resValidation = validateActionResult(result);
    if (!resValidation.isValid) {
      return sendError(res, 422, resValidation.code || "VALIDATION_ERROR", resValidation.error!);
    }
    updatedResult = resValidation.value ?? null;
  }

  // Validate attachment notes if provided
  let updatedAttachmentNotes = existingAction.attachmentNotes;
  if (attachmentNotes !== undefined) {
    const attachValidation = validateAttachmentNotes(attachmentNotes);
    if (!attachValidation.isValid) {
      return sendError(res, 422, attachValidation.code || "VALIDATION_ERROR", attachValidation.error!);
    }
    updatedAttachmentNotes = attachValidation.value ?? null;
  }

  // Validate assignee unassignment or change (M-02, BR-04, AC-05, API-26)
  let updatedAssigneeId: number | null = existingAction.assigneeId;
  if (assigneeId !== undefined) {
    if (assigneeId === null) {
      // Explicit unassignment permitted (M-02)
      updatedAssigneeId = null;
    } else {
      const rawAssignee = Number(assigneeId);
      if (isNaN(rawAssignee) || rawAssignee <= 0) {
        return sendError(res, 422, "INVALID_ASSIGNEE", "Invalid assignee ID format.");
      }

      const assigneeUser = await prisma.user.findUnique({
        where: { id: rawAssignee },
        select: { id: true, isActive: true, role: true },
      });

      if (
        !assigneeUser ||
        !assigneeUser.isActive ||
        (assigneeUser.role !== "IT_STAFF" && assigneeUser.role !== "ADMINISTRATOR")
      ) {
        return sendError(
          res,
          422,
          "INACTIVE_ASSIGNEE_ERROR",
          "Action assignee must be an active IT Staff or Administrator account."
        );
      }
      updatedAssigneeId = assigneeUser.id;
    }
  }

  // Validate follow-up conditional integrity (BR-05, UT-04)
  const effectiveFollowUpRequired =
    isFollowUpRequired !== undefined
      ? Boolean(isFollowUpRequired)
      : existingAction.isFollowUpRequired;

  const noteToCheck =
    followUpNote !== undefined ? followUpNote : existingAction.followUpNote;

  const followUpValidation = validateFollowUpNote(effectiveFollowUpRequired, noteToCheck);
  if (!followUpValidation.isValid) {
    return sendError(
      res,
      422,
      followUpValidation.code || "VALIDATION_ERROR",
      followUpValidation.error!
    );
  }
  const updatedFollowUpNote = followUpValidation.value;

  try {
    const updatedAction = await prisma.actionTaken.update({
      where: { id: actionId },
      data: {
        description: updatedDescription,
        result: updatedResult,
        status: updatedStatus,
        assigneeId: updatedAssigneeId,
        isFollowUpRequired: effectiveFollowUpRequired,
        followUpNote: updatedFollowUpNote,
        attachmentNotes: updatedAttachmentNotes,
        version: existingAction.version + 1, // Optimistic concurrency increment
      },
      include: {
        performedBy: { select: USER_SELECT },
        assignee: { select: USER_SELECT },
      },
    });

    return res.status(200).json(toActionDto(updatedAction));
  } catch (error) {
    return sendError(res, 500, "INTERNAL_SERVER_ERROR", "Failed to update Action Taken.");
  }
}

/**
 * DELETE /api/v1/tickets/:id/actions/:actionId
 * Hard deletion prohibition (M-03, SDS Decision D-11):
 * Actions Taken are append-only audit trail records. Discarding is achieved by setting status to CANCELLED.
 */
export function rejectDeleteAction(_req: Request, res: Response): Response {
  res.setHeader("Allow", "GET, POST, PATCH");
  return sendError(
    res,
    405,
    "METHOD_NOT_ALLOWED",
    "Hard deletion of Actions Taken is prohibited. Transition status to CANCELLED instead."
  );
}
