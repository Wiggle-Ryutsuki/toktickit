import { ActionStatus } from "@prisma/client";

export interface ActionValidationResult<T = string | null> {
  isValid: boolean;
  error?: string;
  code?: string;
  value?: T;
}

/**
 * Validates action description per FR-30, BR-01:
 * - Must be non-empty string between 5 and 1000 characters after trimming
 */
export function validateActionDescription(description: unknown): ActionValidationResult<string> {
  if (typeof description !== "string") {
    return {
      isValid: false,
      code: "INVALID_DESCRIPTION",
      error: "Action description is required (min 5 characters).",
    };
  }

  const trimmed = description.trim();
  if (trimmed.length < 5) {
    return {
      isValid: false,
      code: "INVALID_DESCRIPTION",
      error: "Action description is required (min 5 characters).",
    };
  }

  if (trimmed.length > 1000) {
    return {
      isValid: false,
      code: "DESCRIPTION_TOO_LONG",
      error: "Action description cannot exceed 1000 characters.",
    };
  }

  return {
    isValid: true,
    value: trimmed,
  };
}

/**
 * Validates action result per FR-30:
 * - Optional string, maximum 1000 characters
 */
export function validateActionResult(result: unknown): ActionValidationResult<string | null> {
  if (result === undefined || result === null || result === "") {
    return { isValid: true, value: null };
  }

  if (typeof result !== "string") {
    return {
      isValid: false,
      code: "INVALID_RESULT",
      error: "Action result must be a text string.",
    };
  }

  const trimmed = result.trim();
  if (trimmed.length > 1000) {
    return {
      isValid: false,
      code: "RESULT_TOO_LONG",
      error: "Action result cannot exceed 1000 characters.",
    };
  }

  return {
    isValid: true,
    value: trimmed.length > 0 ? trimmed : null,
  };
}

/**
 * Validates conditional follow-up note per BR-05, UT-04:
 * - If isFollowUpRequired is true: followUpNote is mandatory (min 3, max 500 chars)
 * - If isFollowUpRequired is false: followUpNote is cleared to null
 */
export function validateFollowUpNote(
  isFollowUpRequired: boolean,
  followUpNote: unknown
): ActionValidationResult<string | null> {
  if (!isFollowUpRequired) {
    return {
      isValid: true,
      value: null,
    };
  }

  if (typeof followUpNote !== "string") {
    return {
      isValid: false,
      code: "MISSING_FOLLOW_UP_NOTE",
      error: "Follow-up note is required when follow-up is requested (min 3 characters).",
    };
  }

  const trimmed = followUpNote.trim();
  if (trimmed.length < 3) {
    return {
      isValid: false,
      code: "MISSING_FOLLOW_UP_NOTE",
      error: "Follow-up note is required when follow-up is requested (min 3 characters).",
    };
  }

  if (trimmed.length > 500) {
    return {
      isValid: false,
      code: "FOLLOW_UP_NOTE_TOO_LONG",
      error: "Follow-up note cannot exceed 500 characters.",
    };
  }

  return {
    isValid: true,
    value: trimmed,
  };
}

/**
 * Terminal status transition rules per BR-17, BR-18, UT-07:
 * - COMPLETED and CANCELLED are terminal states
 * - Once in terminal status, cannot revert to PLANNED or IN_PROGRESS
 */
export function validateActionStatusTransition(
  currentStatus: ActionStatus,
  targetStatus: ActionStatus
): ActionValidationResult<ActionStatus> {
  if (currentStatus === targetStatus) {
    return { isValid: true, value: targetStatus };
  }

  const isCurrentTerminal =
    currentStatus === ActionStatus.COMPLETED || currentStatus === ActionStatus.CANCELLED;

  if (isCurrentTerminal) {
    if (
      targetStatus === ActionStatus.PLANNED ||
      targetStatus === ActionStatus.IN_PROGRESS
    ) {
      return {
        isValid: false,
        code: "TERMINAL_STATUS_IMMUTABLE",
        error: `Cannot transition action from terminal status ${currentStatus} back to ${targetStatus}.`,
      };
    }
  }

  return {
    isValid: true,
    value: targetStatus,
  };
}

/**
 * Validates attachment notes per FR-30:
 * - Optional string, max 255 characters
 */
export function validateAttachmentNotes(notes: unknown): ActionValidationResult<string | null> {
  if (notes === undefined || notes === null || notes === "") {
    return { isValid: true, value: null };
  }

  if (typeof notes !== "string") {
    return {
      isValid: false,
      code: "INVALID_ATTACHMENT_NOTES",
      error: "Attachment notes must be a text string.",
    };
  }

  const trimmed = notes.trim();
  if (trimmed.length > 255) {
    return {
      isValid: false,
      code: "ATTACHMENT_NOTES_TOO_LONG",
      error: "Attachment notes cannot exceed 255 characters.",
    };
  }

  return {
    isValid: true,
    value: trimmed.length > 0 ? trimmed : null,
  };
}
