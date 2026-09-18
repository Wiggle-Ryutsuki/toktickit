export interface ValidationResult {
  isValid: boolean;
  error?: string;
  code?: string;
  trimmed?: string;
}

/**
 * Validates comment and note content per BR-10:
 * - Must be non-empty string after trimming whitespace (min 1 character)
 * - Must not exceed 2000 characters
 * - Whitespace-only or empty returns INVALID_CONTENT
 * - >2000 characters returns CONTENT_TOO_LONG
 */
export function validateCommentContent(content: unknown): ValidationResult {
  if (typeof content !== "string") {
    return {
      isValid: false,
      error: "Comment content must be a text string.",
      code: "INVALID_CONTENT",
    };
  }

  const trimmed = content.trim();

  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: "Comment content cannot be empty or whitespace-only.",
      code: "INVALID_CONTENT",
    };
  }

  if (trimmed.length > 2000) {
    return {
      isValid: false,
      error: "Comment content cannot exceed 2000 characters.",
      code: "CONTENT_TOO_LONG",
    };
  }

  return {
    isValid: true,
    trimmed,
  };
}

/**
 * Validates resolution summary required when moving ticket to RESOLVED or CLOSED (BR-09, FR-16):
 * - Must be non-empty string after trimming whitespace (min 1 character)
 * - Must not exceed 2000 characters
 */
export function validateResolutionSummary(summary: unknown): ValidationResult {
  if (typeof summary !== "string") {
    return {
      isValid: false,
      error: "Resolution summary must be a text string.",
      code: "MISSING_RESOLUTION_SUMMARY",
    };
  }

  const trimmed = summary.trim();

  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: "Resolution summary is required when resolving or closing a ticket.",
      code: "MISSING_RESOLUTION_SUMMARY",
    };
  }

  if (trimmed.length > 2000) {
    return {
      isValid: false,
      error: "Resolution summary cannot exceed 2000 characters.",
      code: "CONTENT_TOO_LONG",
    };
  }

  return {
    isValid: true,
    trimmed,
  };
}
