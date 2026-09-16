import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/utils/password.js";

const prisma = getPrisma();

describe("Authentication API Integration Tests (API-01 to API-06)", () => {
  let initialHash: string;

  beforeEach(async () => {
    if (!initialHash) {
      initialHash = await hashPassword("InitialPass123!");
    }
    // Reset test user firstlogin.requester state
    await prisma.user.updateMany({
      where: { email: "firstlogin.requester@kmutt.ac.th" },
      data: {
        passwordHash: initialHash,
        mustChangePassword: true,
      },
    });
  });

  describe("API-01: Valid user login", () => {
    it("logs in successfully, sets toktickit_session cookie, and returns user DTO", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "jennifer.anderson@kmutt.ac.th",
          password: "Password123!",
        });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe("jennifer.anderson@kmutt.ac.th");
      expect(res.body.user.displayName).toBe("Jennifer Anderson");
      expect(res.body.user.role).toBe("REQUESTER");
      expect(res.body.user.mustChangePassword).toBe(false);
      expect(res.body.user.passwordHash).toBeUndefined();

      const rawCookies = res.headers["set-cookie"];
      expect(rawCookies).toBeDefined();
      const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies as string];
      const sessionCookie = cookies.find((c: string) => c.startsWith("toktickit_session="));
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain("HttpOnly");
      expect(sessionCookie).toContain("Path=/");
    });

    it("normalizes email address case-insensitively during login", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "Jennifer.Anderson@KMUTT.AC.TH",
          password: "Password123!",
        });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe("jennifer.anderson@kmutt.ac.th");
    });
  });

  describe("API-02: Invalid credentials login", () => {
    it("returns HTTP 401 INVALID_CREDENTIALS for wrong password", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "jennifer.anderson@kmutt.ac.th",
          password: "WrongPassword!",
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
      expect(res.body.error.message).toBe("Invalid email or password.");
    });

    it("returns HTTP 401 INVALID_CREDENTIALS for non-existent email", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "unknown.user@kmutt.ac.th",
          password: "Password123!",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    });
  });

  describe("API-03: Inactive account login", () => {
    it("returns HTTP 403 ACCOUNT_INACTIVE when credentials are valid but account is inactive", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "alex.taylor.inactive@kmutt.ac.th",
          password: "Password123!",
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("ACCOUNT_INACTIVE");
      expect(res.body.error.message).toBe("Your account is inactive. Please contact an Administrator.");
    });

    it("returns HTTP 401 for inactive account when password is wrong to prevent email enumeration", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "alex.taylor.inactive@kmutt.ac.th",
          password: "WrongPassword!",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    });
  });

  describe("API-04: Current authenticated user retrieval (GET /me)", () => {
    it("returns HTTP 200 with user profile when valid session cookie is supplied", async () => {
      // First login
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "sarah.johnson@kmutt.ac.th",
          password: "Password123!",
        });

      const cookie = loginRes.headers["set-cookie"];

      const meRes = await request(app)
        .get("/api/v1/auth/me")
        .set("Cookie", cookie);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user.email).toBe("sarah.johnson@kmutt.ac.th");
      expect(meRes.body.user.displayName).toBe("Sarah Johnson");
      expect(meRes.body.user.role).toBe("REQUESTER");
    });

    it("returns HTTP 401 UNAUTHENTICATED when session cookie is absent", async () => {
      const res = await request(app).get("/api/v1/auth/me");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
    });
  });

  describe("API-05: Mandatory password change (POST /change-password)", () => {
    it("rejects password change if newPassword is identical to currentPassword (m-05)", async () => {
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "firstlogin.requester@kmutt.ac.th",
          password: "InitialPass123!",
        });

      const cookie = loginRes.headers["set-cookie"];

      const res = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Cookie", cookie)
        .send({
          currentPassword: "InitialPass123!",
          newPassword: "InitialPass123!",
          confirmPassword: "InitialPass123!",
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("PASSWORD_IDENTICAL_TO_CURRENT");
    });

    it("updates password, clears mustChangePassword, and rotates session cookie", async () => {
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "firstlogin.requester@kmutt.ac.th",
          password: "InitialPass123!",
        });

      const oldCookie = loginRes.headers["set-cookie"];

      const changeRes = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Cookie", oldCookie)
        .send({
          currentPassword: "InitialPass123!",
          newPassword: "BrandNewSecurePass456#",
          confirmPassword: "BrandNewSecurePass456#",
        });

      expect(changeRes.status).toBe(200);
      expect(changeRes.body.user.mustChangePassword).toBe(false);

      // Verify cookie rotated
      const newCookie = changeRes.headers["set-cookie"];
      expect(newCookie).toBeDefined();

      // Check DB record
      const dbUser = await prisma.user.findUnique({
        where: { email: "firstlogin.requester@kmutt.ac.th" },
      });
      expect(dbUser?.mustChangePassword).toBe(false);

      // Verify can login with new password
      const newLoginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "firstlogin.requester@kmutt.ac.th",
          password: "BrandNewSecurePass456#",
        });

      expect(newLoginRes.status).toBe(200);
      expect(newLoginRes.body.user.mustChangePassword).toBe(false);
    });
  });

  describe("API-06: Logout invalidation (POST /logout)", () => {
    it("invalidates session and clears session cookie", async () => {
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "david.lee@kmutt.ac.th",
          password: "Password123!",
        });

      const cookie = loginRes.headers["set-cookie"];

      const logoutRes = await request(app)
        .post("/api/v1/auth/logout")
        .set("Cookie", cookie);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.message).toBe("Successfully logged out.");

      // Cookie should be cleared
      const logoutCookies = logoutRes.headers["set-cookie"];
      expect(logoutCookies).toBeDefined();

      // Subsequent /me call with former cookie fails
      const meRes = await request(app)
        .get("/api/v1/auth/me")
        .set("Cookie", cookie);

      expect(meRes.status).toBe(401);
    });
  });
});
