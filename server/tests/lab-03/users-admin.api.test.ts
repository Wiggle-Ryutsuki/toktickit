import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const prisma = getPrisma();

describe("Administrator User Management API Tests (API-28 to API-34)", () => {
  let adminCookie: string;
  let adminUserId: number;

  beforeAll(async () => {
    // Authenticate as Administrator
    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "admin.toktickit@kmutt.ac.th",
      password: "Password123!",
    });
    expect(loginRes.status).toBe(200);
    adminCookie = loginRes.headers["set-cookie"]![0];
    adminUserId = loginRes.body.user.id;
  });

  // ---------------------------------------------------------------------------
  // API-28: User Listing with Search & Role Filter
  // ---------------------------------------------------------------------------
  it("API-28: Administrator retrieves user list with search and single-role filtering (FR-22, FR-23)", async () => {
    const res = await request(app)
      .get("/api/v1/admin/users")
      .set("Cookie", adminCookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    // Verify projection whitelist (no passwordHash)
    for (const user of res.body) {
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("displayName");
      expect(user).toHaveProperty("email");
      expect(user).toHaveProperty("role");
      expect(user).toHaveProperty("isActive");
      expect(user).toHaveProperty("mustChangePassword");
      expect(user).not.toHaveProperty("passwordHash");
    }

    // Verify search filter (case-insensitive substring)
    const searchRes = await request(app)
      .get("/api/v1/admin/users?search=SOMCHAI")
      .set("Cookie", adminCookie);
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.length).toBeGreaterThanOrEqual(1);
    expect(searchRes.body.every((u: any) =>
      u.displayName.toLowerCase().includes("somchai") || u.email.toLowerCase().includes("somchai")
    )).toBe(true);

    // Verify role filter
    const roleRes = await request(app)
      .get("/api/v1/admin/users?role=IT_STAFF")
      .set("Cookie", adminCookie);
    expect(roleRes.status).toBe(200);
    expect(roleRes.body.length).toBeGreaterThan(0);
    expect(roleRes.body.every((u: any) => u.role === "IT_STAFF")).toBe(true);

    // Verify invalid role filter returns 400
    const invalidRoleRes = await request(app)
      .get("/api/v1/admin/users?role=SUPER_ADMIN")
      .set("Cookie", adminCookie);
    expect(invalidRoleRes.status).toBe(400);
    expect(invalidRoleRes.body.error.code).toBe("INVALID_ROLE_FILTER");
  });

  // ---------------------------------------------------------------------------
  // API-29: Create User with Initial Password & Forced Change
  // ---------------------------------------------------------------------------
  it("API-29: Administrator creates user with initial password and forced change flag (FR-24, BR-11, AC-11)", async () => {
    const timestamp = Date.now();
    const newUserPayload = {
      displayName: "New Test Engineer",
      email: `engineer.${timestamp}@kmutt.ac.th`,
      role: "IT_STAFF",
      isActive: true,
      initialPassword: "InitialPassword123!",
    };

    const res = await request(app)
      .post("/api/v1/admin/users")
      .set("Cookie", adminCookie)
      .send(newUserPayload);

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.displayName).toBe("New Test Engineer");
    expect(res.body.email).toBe(newUserPayload.email);
    expect(res.body.role).toBe("IT_STAFF");
    expect(res.body.isActive).toBe(true);
    expect(res.body.mustChangePassword).toBe(true);
    expect(res.body).not.toHaveProperty("passwordHash");

    // Inspect database record for Argon2id hash
    const dbUser = await prisma.user.findUnique({
      where: { id: res.body.id },
    });
    expect(dbUser).toBeDefined();
    expect(dbUser?.passwordHash).toMatch(/^\$argon2/);
    expect(dbUser?.mustChangePassword).toBe(true);

    // Verify new user can authenticate and is flagged for password change
    const userLogin = await request(app).post("/api/v1/auth/login").send({
      email: newUserPayload.email,
      password: "InitialPassword123!",
    });
    expect(userLogin.status).toBe(200);
    expect(userLogin.body.user.mustChangePassword).toBe(true);

    // Validation failure: weak password (<8 chars)
    const weakPassRes = await request(app)
      .post("/api/v1/admin/users")
      .set("Cookie", adminCookie)
      .send({
        displayName: "Weak Pass User",
        email: `weak.${timestamp}@kmutt.ac.th`,
        role: "REQUESTER",
        initialPassword: "Pass1",
      });
    expect(weakPassRes.status).toBe(422);
    expect(weakPassRes.body.error.code).toBe("PASSWORD_POLICY_VIOLATION");
  });

  // ---------------------------------------------------------------------------
  // API-30: Reject Duplicate Email on Creation & Mutation
  // ---------------------------------------------------------------------------
  it("API-30: Rejects user creation and mutation with duplicate email address (FR-28)", async () => {
    // Attempt creation with existing email
    const createRes = await request(app)
      .post("/api/v1/admin/users")
      .set("Cookie", adminCookie)
      .send({
        displayName: "Duplicate Person",
        email: "staff.somchai@kmutt.ac.th", // Existing email
        role: "IT_STAFF",
        initialPassword: "Password123!",
      });

    expect(createRes.status).toBe(409);
    expect(createRes.body.error.code).toBe("DUPLICATE_EMAIL");

    // Create a unique temporary user to test PATCH duplicate email
    const uniqueUser = await prisma.user.create({
      data: {
        displayName: "Patch Test Subject",
        email: `patch.subject.${Date.now()}@kmutt.ac.th`,
        role: "REQUESTER",
        isActive: true,
      },
    });

    // Attempt PATCH to existing email (case-insensitive test)
    const patchRes = await request(app)
      .patch(`/api/v1/admin/users/${uniqueUser.id}`)
      .set("Cookie", adminCookie)
      .send({
        email: "STAFF.MALEE@KMUTT.AC.TH", // Existing email uppercase
      });

    expect(patchRes.status).toBe(409);
    expect(patchRes.body.error.code).toBe("DUPLICATE_EMAIL");

    // Updating user without changing their own email succeeds
    const patchSelfEmailRes = await request(app)
      .patch(`/api/v1/admin/users/${uniqueUser.id}`)
      .set("Cookie", adminCookie)
      .send({
        displayName: "Updated Subject Name",
        email: uniqueUser.email,
      });

    expect(patchSelfEmailRes.status).toBe(200);
    expect(patchSelfEmailRes.body.displayName).toBe("Updated Subject Name");
  });

  // ---------------------------------------------------------------------------
  // API-31: Update User Basic Info & Role
  // ---------------------------------------------------------------------------
  it("API-31: Administrator updates user basic info and role, handling boundaries (FR-25)", async () => {
    const user = await prisma.user.create({
      data: {
        displayName: "Original Name",
        email: `original.${Date.now()}@kmutt.ac.th`,
        role: "REQUESTER",
        isActive: true,
      },
    });

    // Successful update
    const res = await request(app)
      .patch(`/api/v1/admin/users/${user.id}`)
      .set("Cookie", adminCookie)
      .send({
        displayName: "Renamed User",
        role: "IT_STAFF",
      });

    expect(res.status).toBe(200);
    expect(res.body.displayName).toBe("Renamed User");
    expect(res.body.role).toBe("IT_STAFF");

    // Single user retrieval (GET /admin/users/:id)
    const getRes = await request(app)
      .get(`/api/v1/admin/users/${user.id}`)
      .set("Cookie", adminCookie);
    expect(getRes.status).toBe(200);
    expect(getRes.body.displayName).toBe("Renamed User");
    expect(getRes.body).not.toHaveProperty("passwordHash");

    // Boundary: Empty update body -> 400
    const emptyRes = await request(app)
      .patch(`/api/v1/admin/users/${user.id}`)
      .set("Cookie", adminCookie)
      .send({});
    expect(emptyRes.status).toBe(400);
    expect(emptyRes.body.error.code).toBe("EMPTY_UPDATE_PAYLOAD");

    // Boundary: Non-numeric user ID -> 400
    const nonNumericRes = await request(app)
      .patch("/api/v1/admin/users/abc")
      .set("Cookie", adminCookie)
      .send({ displayName: "Hello" });
    expect(nonNumericRes.status).toBe(400);
    expect(nonNumericRes.body.error.code).toBe("INVALID_USER_ID");

    // Boundary: Non-existent user ID -> 404
    const notFoundRes = await request(app)
      .patch("/api/v1/admin/users/999999")
      .set("Cookie", adminCookie)
      .send({ displayName: "Ghost" });
    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.body.error.code).toBe("USER_NOT_FOUND");
  });

  // ---------------------------------------------------------------------------
  // API-32: Reset Initial Password & Session Invalidation
  // ---------------------------------------------------------------------------
  it("API-32: Administrator resets initial password, flagging mustChangePassword and invalidating sessions (FR-26)", async () => {
    // 1. Create a user with known initial password
    const testUser = await prisma.user.create({
      data: {
        displayName: "Reset Password Target",
        email: `reset.target.${Date.now()}@kmutt.ac.th`,
        role: "REQUESTER",
        isActive: true,
      },
    });

    // 2. Set initial password as admin
    const resetRes = await request(app)
      .post(`/api/v1/admin/users/${testUser.id}/reset-password`)
      .set("Cookie", adminCookie)
      .send({ initialPassword: "NewTemporaryPass123!" });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.mustChangePassword).toBe(true);
    expect(resetRes.body.userId).toBe(testUser.id);

    // 3. Log in with new temporary password
    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: testUser.email,
      password: "NewTemporaryPass123!",
    });
    expect(loginRes.status).toBe(200);
    const userCookie = loginRes.headers["set-cookie"]![0];

    // User must change password
    expect(loginRes.body.user.mustChangePassword).toBe(true);

    // 4. Admin resets password again -> existing user session must be purged
    const secondReset = await request(app)
      .post(`/api/v1/admin/users/${testUser.id}/reset-password`)
      .set("Cookie", adminCookie)
      .send({ initialPassword: "SecondTemporaryPass123!" });
    expect(secondReset.status).toBe(200);

    // 5. Old user session cookie is now invalid / unauthorized
    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", userCookie);
    expect(meRes.status).toBe(401);

    // Boundary: Reset with weak password -> 422
    const weakReset = await request(app)
      .post(`/api/v1/admin/users/${testUser.id}/reset-password`)
      .set("Cookie", adminCookie)
      .send({ initialPassword: "weak" });
    expect(weakReset.status).toBe(422);
    expect(weakReset.body.error.code).toBe("PASSWORD_POLICY_VIOLATION");
  });

  // ---------------------------------------------------------------------------
  // API-33: Administrator Self-Deactivation Guard
  // ---------------------------------------------------------------------------
  it("API-33: Administrator attempts self-deactivation returns HTTP 422 SELF_DEACTIVATION_PROHIBITED (FR-27, BR-12, AC-12)", async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${adminUserId}`)
      .set("Cookie", adminCookie)
      .send({ isActive: false });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("SELF_DEACTIVATION_PROHIBITED");

    // Verify admin account remains active in DB
    const adminInDb = await prisma.user.findUnique({
      where: { id: adminUserId },
    });
    expect(adminInDb?.isActive).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // API-34: Last Active Administrator Protection Guard
  // ---------------------------------------------------------------------------
  it("API-34: Protects the last active Administrator from deactivation or role change (FR-27, BR-13, AC-12)", async () => {
    // Ensure only 1 active admin exists initially for the test
    const activeAdmins = await prisma.user.findMany({
      where: { role: "ADMINISTRATOR", isActive: true },
    });

    // If more than 1 admin exists from previous runs, deactivate extras
    for (let i = 1; i < activeAdmins.length; i++) {
      await prisma.user.update({
        where: { id: activeAdmins[i].id },
        data: { isActive: false },
      });
    }

    // Now exactly 1 active admin remains (adminUserId)
    // Attempt to re-role the sole admin to IT_STAFF
    const reRoleRes = await request(app)
      .patch(`/api/v1/admin/users/${adminUserId}`)
      .set("Cookie", adminCookie)
      .send({ role: "IT_STAFF" });

    expect(reRoleRes.status).toBe(422);
    expect(reRoleRes.body.error.code).toBe("LAST_ADMIN_PROTECTION");

    // Create a 2nd active administrator
    const admin2 = await prisma.user.create({
      data: {
        displayName: "Second Active Admin",
        email: `admin2.${Date.now()}@kmutt.ac.th`,
        role: "ADMINISTRATOR",
        isActive: true,
        passwordHash: "$argon2id$fakehash",
      },
    });

    // Admin 1 deactivates Admin 2 -> Should SUCCEED because 1 active admin remains
    const deactRes = await request(app)
      .patch(`/api/v1/admin/users/${admin2.id}`)
      .set("Cookie", adminCookie)
      .send({ isActive: false });

    expect(deactRes.status).toBe(200);
    expect(deactRes.body.isActive).toBe(false);

    // Now only 1 active admin remains again (adminUserId).
    // Admin 1 attempts to change role to IT_STAFF -> Should FAIL with LAST_ADMIN_PROTECTION
    const secondReRoleRes = await request(app)
      .patch(`/api/v1/admin/users/${adminUserId}`)
      .set("Cookie", adminCookie)
      .send({ role: "IT_STAFF" });

    expect(secondReRoleRes.status).toBe(422);
    expect(secondReRoleRes.body.error.code).toBe("LAST_ADMIN_PROTECTION");

    // Admin 1 reactivates Admin 2 -> Should SUCCEED
    const reactRes = await request(app)
      .patch(`/api/v1/admin/users/${admin2.id}`)
      .set("Cookie", adminCookie)
      .send({ isActive: true });

    expect(reactRes.status).toBe(200);
    expect(reactRes.body.isActive).toBe(true);
  });
});
