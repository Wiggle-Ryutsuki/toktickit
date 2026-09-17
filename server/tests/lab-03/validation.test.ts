import { describe, it, expect } from "vitest";
import { validatePassword } from "../../src/utils/password.js";
import { validateCommentContent, validateResolutionSummary } from "../../src/utils/validation.js";

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

