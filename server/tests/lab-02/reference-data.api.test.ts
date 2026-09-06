import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("API-02: Reference Data Endpoints", () => {
  describe("GET /api/categories", () => {
    it("returns HTTP 200 with the 4 active categories in id order", async () => {
      const res = await request(app).get("/api/categories");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(4);

      const names = res.body.map((c: { name: string }) => c.name);
      expect(names).toEqual([
        "Account and Access",
        "Hardware",
        "Software",
        "Network",
      ]);

      // Verify each object contains id and name
      for (const cat of res.body) {
        expect(cat).toHaveProperty("id");
        expect(cat).toHaveProperty("name");
      }
    });
  });

  describe("GET /api/related-systems", () => {
    it("returns HTTP 200 with at least 6 active related systems", async () => {
      const res = await request(app).get("/api/related-systems");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(6);

      const names = res.body.map((s: { name: string }) => s.name);
      expect(names).toContain("Campus Wi-Fi");
      expect(names).toContain("Corporate Laptop");
      expect(names).toContain("Email");
      expect(names).toContain("Grade Submission App");
      expect(names).toContain("LEB2 App");
      expect(names).toContain("Printer");
      expect(names).toContain("VPN");

      for (const sys of res.body) {
        expect(sys).toHaveProperty("id");
        expect(sys).toHaveProperty("name");
      }
    });
  });
});
