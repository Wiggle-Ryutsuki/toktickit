import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("API-01: GET /api/requesters", () => {
  it("returns HTTP 200 with list of active requesters and excludes inactive requesters", async () => {
    const res = await request(app).get("/api/requesters");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(4);

    // Active requesters must be present
    const emails = res.body.map((u: { email: string }) => u.email);
    expect(emails).toContain("jennifer.anderson@kmutt.ac.th");
    expect(emails).toContain("sarah.johnson@kmutt.ac.th");
    expect(emails).toContain("david.lee@kmutt.ac.th");
    expect(emails).toContain("michael.brown@kmutt.ac.th");

    // Inactive requester must NOT be present
    expect(emails).not.toContain("alex.taylor.inactive@kmutt.ac.th");

    // Every item must have required fields and isActive === true
    for (const requester of res.body) {
      expect(requester).toHaveProperty("id");
      expect(requester).toHaveProperty("email");
      expect(requester).toHaveProperty("displayName");
      expect(requester.role).toBe("REQUESTER");
      expect(requester.isActive).toBe(true);
    }
  });
});
