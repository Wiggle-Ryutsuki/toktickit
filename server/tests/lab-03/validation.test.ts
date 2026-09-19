import { describe, it, expect } from "vitest";
import { validatePassword } from "../../src/utils/password.js";
import {
  validateCommentContent,
  validateResolutionSummary,
  validateDisplayName,
  validateEmail,
  validateRole,
  canDeactivateUser,
  canModifyAdminAccount,
} from "../../src/utils/validation.js";

describe("Password Complexity Validator (UT-01)", () => {
  it("UT-01.1: Rejects passwords shorter than 8 characters", () => {
    const res = validatePassword("Pass1!");
    expect(res.isValid).toBe(false);
    expect(res.errors).toContain("Password must be at least 8 characters long.");
  });

  it("UT-01.2: Rejects passwords longer than 128 characters", () => {
    const longPass = "A1!" + "a".repeat(130);
    const res = validatePassword(longPass);
    expect(res.isValid).toBe(false);
    expect(res.errors).toContain("Password cannot exceed 128 characters.");
  });

  it("UT-01.3: Rejects passwords without an uppercase letter", () => {
    const res = validatePassword("password123!");
    expect(res.isValid).toBe(false);
    expect(res.errors).toContain("Password must contain at least one uppercase letter.");
  });

  it("UT-01.4: Rejects passwords without a lowercase letter", () => {
    const res = validatePassword("PASSWORD123!");
    expect(res.isValid).toBe(false);
    expect(res.errors).toContain("Password must contain at least one lowercase letter.");
  });

  it("UT-01.5: Rejects passwords without a number", () => {
    const res = validatePassword("PasswordSpecial!");
    expect(res.isValid).toBe(false);
    expect(res.errors).toContain("Password must contain at least one number.");
  });

  it("UT-01.6: Rejects passwords without a special character", () => {
    const res = validatePassword("Password1234");
    expect(res.isValid).toBe(false);
    expect(res.errors).toContain("Password must contain at least one special character.");
  });

  it("UT-01.7: Accepts passwords satisfying all complexity criteria", () => {
    const res = validatePassword("SecurePassword123!");
    expect(res.isValid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });
});

describe("Comment and Note Content Validator (UT-03, BR-10)", () => {
  it("UT-03.1: Rejects empty string content", () => {
    const res = validateCommentContent("");
    expect(res.isValid).toBe(false);
    expect(res.code).toBe("INVALID_CONTENT");
  });

  it("UT-03.2: Rejects whitespace-only content (spaces, tabs, newlines)", () => {
    const res = validateCommentContent("   \n\t   ");
    expect(res.isValid).toBe(false);
    expect(res.code).toBe("INVALID_CONTENT");
  });

  it("UT-03.3: Rejects content exceeding 2000 characters", () => {
    const longContent = "A".repeat(2001);
    const res = validateCommentContent(longContent);
    expect(res.isValid).toBe(false);
    expect(res.code).toBe("CONTENT_TOO_LONG");
  });

  it("UT-03.4: Accepts valid comment content at boundaries (1 char and 2000 chars)", () => {
    const singleChar = validateCommentContent("x");
    expect(singleChar.isValid).toBe(true);
    expect(singleChar.trimmed).toBe("x");

    const maxChars = validateCommentContent("B".repeat(2000));
    expect(maxChars.isValid).toBe(true);
    expect(maxChars.trimmed?.length).toBe(2000);
  });

  it("UT-03.5: Trims outer whitespace correctly", () => {
    const res = validateCommentContent("   Hello World   ");
    expect(res.isValid).toBe(true);
    expect(res.trimmed).toBe("Hello World");
  });

  it("UT-03.6: Rejects non-string inputs", () => {
    const res = validateCommentContent(null);
    expect(res.isValid).toBe(false);
    expect(res.code).toBe("INVALID_CONTENT");
  });

  it("UT-03.7: Validates Resolution Summary required for RESOLVED / CLOSED", () => {
    expect(validateResolutionSummary("").isValid).toBe(false);
    expect(validateResolutionSummary("   ").isValid).toBe(false);
    expect(validateResolutionSummary("Fixed").isValid).toBe(true);
    expect(validateResolutionSummary("C".repeat(2001)).isValid).toBe(false);
  });
});

describe("User Management Validators & Guards (UT-01, BR-11, BR-12, BR-13)", () => {
  it("validates displayName bounds (2–100 characters) and rejects whitespace-only", () => {
    expect(validateDisplayName("").isValid).toBe(false);
    expect(validateDisplayName("   ").isValid).toBe(false);
    expect(validateDisplayName("A").isValid).toBe(false);
    expect(validateDisplayName("A".repeat(101)).isValid).toBe(false);
    expect(validateDisplayName(123).isValid).toBe(false);

    const valid = validateDisplayName("  Somchai Jaidee  ");
    expect(valid.isValid).toBe(true);
    expect(valid.trimmed).toBe("Somchai Jaidee");
  });

  it("validates email syntax and normalizes lowercase", () => {
    expect(validateEmail("").isValid).toBe(false);
    expect(validateEmail("invalid-email").isValid).toBe(false);
    expect(validateEmail("missing@domain").isValid).toBe(false);
    expect(validateEmail(null).isValid).toBe(false);

    const valid = validateEmail("  Staff.Somchai@KMUTT.AC.TH  ");
    expect(valid.isValid).toBe(true);
    expect(valid.trimmed).toBe("staff.somchai@kmutt.ac.th");
  });

  it("validates role strictly against ALLOWED_ROLES (BR-11)", () => {
    expect(validateRole("REQUESTER").isValid).toBe(true);
    expect(validateRole("IT_STAFF").isValid).toBe(true);
    expect(validateRole("ADMINISTRATOR").isValid).toBe(true);

    expect(validateRole("SUPERUSER").isValid).toBe(false);
    expect(validateRole("").isValid).toBe(false);
    expect(validateRole(undefined).isValid).toBe(false);
  });

  it("enforces Administrator self-deactivation guard (BR-12)", () => {
    expect(canDeactivateUser(5, 5)).toBe(false); // Target === Session user
    expect(canDeactivateUser(6, 5)).toBe(true);  // Different user
  });

  it("enforces Last Active Administrator protection guard (BR-13)", () => {
    // Non-admin target can always be modified
    expect(canModifyAdminAccount(false, 1, "REQUESTER", false)).toBe(true);

    // Multiple active admins: deactivation or role re-assignment is allowed
    expect(canModifyAdminAccount(true, 2, "ADMINISTRATOR", false)).toBe(true);
    expect(canModifyAdminAccount(true, 2, "IT_STAFF", true)).toBe(true);

    // Exactly 1 active admin: deactivation is blocked
    expect(canModifyAdminAccount(true, 1, "ADMINISTRATOR", false)).toBe(false);
    // Exactly 1 active admin: changing role away from ADMINISTRATOR is blocked
    expect(canModifyAdminAccount(true, 1, "IT_STAFF", true)).toBe(false);
    expect(canModifyAdminAccount(true, 1, "REQUESTER", true)).toBe(false);

    // Exactly 1 active admin: keeping role and active state is allowed
    expect(canModifyAdminAccount(true, 1, "ADMINISTRATOR", true)).toBe(true);
  });
});

