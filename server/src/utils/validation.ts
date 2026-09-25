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

/**
 * Validates display name for user accounts (FR-24, FR-25):
 * - Must be non-empty string after trimming whitespace (min 2 characters, max 100 characters)
 */
export function validateDisplayName(name: unknown): ValidationResult {
  if (typeof name !== "string") {
    return {
      isValid: false,
      error: "Display name must be a text string.",
      code: "INVALID_DISPLAY_NAME",
    };
  }

  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 100) {
    return {
      isValid: false,
      error: "Display name must be between 2 and 100 characters.",
      code: "INVALID_DISPLAY_NAME",
    };
  }

  return {
    isValid: true,
    trimmed,
  };
}

/**
 * Validates email format and normalizes lowercase (FR-24, FR-28):
 * - Must be a valid email syntax
 */
export function validateEmail(email: unknown): ValidationResult {
  if (typeof email !== "string") {
    return {
      isValid: false,
      error: "Email must be a text string.",
      code: "INVALID_EMAIL",
    };
  }

  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return {
      isValid: false,
      error: "Invalid email address format.",
      code: "INVALID_EMAIL",
    };
  }

  return {
    isValid: true,
    trimmed,
  };
}

/**
 * Validates single permitted user role (BR-11, FR-24):
 * - Must be one of REQUESTER, IT_STAFF, ADMINISTRATOR
 */
export const ALLOWED_ROLES = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"] as const;
export type ValidRole = (typeof ALLOWED_ROLES)[number];

export function validateRole(role: unknown): ValidationResult {
  if (typeof role !== "string" || !ALLOWED_ROLES.includes(role as ValidRole)) {
    return {
      isValid: false,
      error: "Role must be one of: REQUESTER, IT_STAFF, ADMINISTRATOR.",
      code: "INVALID_ROLE",
    };
  }

  return {
    isValid: true,
    trimmed: role,
  };
}

/**
 * Validates Administrator self-deactivation guard (BR-12, FR-27):
 * - Returns false if calling admin attempts to deactivate themselves
 */
export function canDeactivateUser(targetUserId: number, sessionUserId: number): boolean {
  return targetUserId !== sessionUserId;
}

/**
 * Validates Last Active Administrator protection guard (BR-13, FR-27):
 * - Returns false if target is currently an active admin and activeAdminCount <= 1
 *   and update attempts to deactivate or change role away from ADMINISTRATOR.
 */
export function canModifyAdminAccount(
  targetIsAdmin: boolean,
  activeAdminCount: number,
  newRole?: string,
  newIsActive?: boolean
): boolean {
  if (!targetIsAdmin) {
    return true;
  }

  const isDeactivating = newIsActive === false;
  const isChangingRoleAway = newRole !== undefined && newRole !== "ADMINISTRATOR";

  if (activeAdminCount <= 1 && (isDeactivating || isChangingRoleAway)) {
    return false;
  }

  return true;
}
