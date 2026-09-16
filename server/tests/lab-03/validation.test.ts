import { describe, it, expect } from "vitest";
import { validatePassword } from "../../src/utils/password.js";

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
