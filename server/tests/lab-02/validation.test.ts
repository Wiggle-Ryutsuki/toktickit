import { describe, it, expect } from "vitest";
import { validateCreateTicketInput } from "../../src/utils/ticket-validator.js";

describe("UT-03: Ticket Form Input Validation (BR-05, BR-06, BR-07, AC-05)", () => {
  const validBasePayload = {
    requesterId: 1,
    categoryId: 2,
    relatedSystemId: 2,
    requestedPriority: "MEDIUM",
    summary: "Laptop battery drains quickly after Windows update",
    description: "My laptop battery is draining much faster than usual even when the system is idle. This started happening after last week's Windows update.",
  };

  it("UT-03.1: accepts a completely valid payload", () => {
    const result = validateCreateTicketInput(validBasePayload);
    expect(result.valid).toBe(true);
    expect(result.fieldErrors).toHaveLength(0);
  });

  it("UT-03.2: validates Summary length constraints (5 to 120 chars, trimmed)", () => {
    // Empty / whitespace
    expect(validateCreateTicketInput({ ...validBasePayload, summary: "" }).valid).toBe(false);
    expect(validateCreateTicketInput({ ...validBasePayload, summary: "     " }).valid).toBe(false);

    // Below 5 characters
    expect(validateCreateTicketInput({ ...validBasePayload, summary: "Help" }).valid).toBe(false);

    // Exact 5 characters
    expect(validateCreateTicketInput({ ...validBasePayload, summary: "Issue" }).valid).toBe(true);

    // 120 characters
    const max120 = "A".repeat(120);
    expect(validateCreateTicketInput({ ...validBasePayload, summary: max120 }).valid).toBe(true);

    // Above 120 characters
    const over120 = "A".repeat(121);
    expect(validateCreateTicketInput({ ...validBasePayload, summary: over120 }).valid).toBe(false);
  });

  it("UT-03.3: validates Description length constraints (10 to 2000 chars, trimmed)", () => {
    // Empty / whitespace
    expect(validateCreateTicketInput({ ...validBasePayload, description: "" }).valid).toBe(false);
    expect(validateCreateTicketInput({ ...validBasePayload, description: "        " }).valid).toBe(false);

    // Below 10 characters
    expect(validateCreateTicketInput({ ...validBasePayload, description: "123456789" }).valid).toBe(false);

    // Exact 10 characters
    expect(validateCreateTicketInput({ ...validBasePayload, description: "1234567890" }).valid).toBe(true);

    // 2000 characters
    const max2000 = "D".repeat(2000);
    expect(validateCreateTicketInput({ ...validBasePayload, description: max2000 }).valid).toBe(true);

    // Above 2000 characters
    const over2000 = "D".repeat(2001);
    expect(validateCreateTicketInput({ ...validBasePayload, description: over2000 }).valid).toBe(false);
  });

  it("UT-03.4: validates Requested Priority vocabulary", () => {
    const allowed = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    for (const prio of allowed) {
      expect(validateCreateTicketInput({ ...validBasePayload, requestedPriority: prio }).valid).toBe(true);
    }

    const disallowed = ["CRITICAL", "NORMAL", "low", "urgent", ""];
    for (const prio of disallowed) {
      const res = validateCreateTicketInput({ ...validBasePayload, requestedPriority: prio });
      expect(res.valid).toBe(false);
      expect(res.fieldErrors.some((fe: { field: string }) => fe.field === "requestedPriority")).toBe(true);
    }
  });

  it("UT-03.5: validates required positive integer IDs", () => {
    expect(validateCreateTicketInput({ ...validBasePayload, requesterId: 0 }).valid).toBe(false);
    expect(validateCreateTicketInput({ ...validBasePayload, requesterId: -1 }).valid).toBe(false);
    expect(validateCreateTicketInput({ ...validBasePayload, categoryId: 0 }).valid).toBe(false);
    expect(validateCreateTicketInput({ ...validBasePayload, relatedSystemId: 0 }).valid).toBe(false);
  });
});
