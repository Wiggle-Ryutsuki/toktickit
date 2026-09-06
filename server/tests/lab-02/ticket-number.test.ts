import { describe, it, expect } from "vitest";
import { formatTicketNumber } from "../../src/utils/ticket-number.js";

describe("UT-01: Ticket Number Formatting & Sequence (BR-01, FR-06)", () => {
  it("UT-01.1: formats ticket number with standard 5-digit zero-padded sequence", () => {
    expect(formatTicketNumber(2026, 1)).toBe("TKT-2026-00001");
    expect(formatTicketNumber(2026, 42)).toBe("TKT-2026-00042");
    expect(formatTicketNumber(2026, 1234)).toBe("TKT-2026-01234");
  });

  it("UT-01.2: handles 5-digit sequence boundary without truncation", () => {
    expect(formatTicketNumber(2026, 10000)).toBe("TKT-2026-10000");
    expect(formatTicketNumber(2026, 99999)).toBe("TKT-2026-99999");
  });

  it("UT-01.3: correctly handles annual reset for different years", () => {
    expect(formatTicketNumber(2025, 150)).toBe("TKT-2025-00150");
    expect(formatTicketNumber(2026, 1)).toBe("TKT-2026-00001");
    expect(formatTicketNumber(2027, 1)).toBe("TKT-2027-00001");
  });

  it("UT-01.4: throws on invalid inputs (non-positive sequence or invalid year)", () => {
    expect(() => formatTicketNumber(2026, 0)).toThrow();
    expect(() => formatTicketNumber(2026, -5)).toThrow();
    expect(() => formatTicketNumber(1999, 1)).toThrow();
  });
});
