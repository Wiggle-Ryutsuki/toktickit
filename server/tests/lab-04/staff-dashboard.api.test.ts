import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("Feature-16: Staff Dashboard API Tests", () => {
  let staffCookie: string[];
  let adminCookie: string[];
  let requesterCookie: string[];

  beforeAll(async () => {
    // 1. Log in as IT Staff Somchai Prasert
    const staffLogin = await request(app).post("/api/v1/auth/login").send({
      email: "staff.somchai@kmutt.ac.th",
      password: "Password123!",
    });
    expect(staffLogin.status).toBe(200);
    staffCookie = staffLogin.headers["set-cookie"];

    // 2. Log in as Administrator Admin TokTickIT
    const adminLogin = await request(app).post("/api/v1/auth/login").send({
      email: "admin.toktickit@kmutt.ac.th",
      password: "Password123!",
    });
    expect(adminLogin.status).toBe(200);
    adminCookie = adminLogin.headers["set-cookie"];

    // 3. Log in as Requester Jennifer Anderson
    const reqLogin = await request(app).post("/api/v1/auth/login").send({
      email: "jennifer.anderson@kmutt.ac.th",
      password: "Password123!",
    });
    expect(reqLogin.status).toBe(200);
    requesterCookie = reqLogin.headers["set-cookie"];
  });

  it("API-38: Retrieve IT Staff Dashboard data (GET /api/v1/dashboard/staff)", async () => {
    const res = await request(app)
      .get("/api/v1/dashboard/staff")
      .set("Cookie", staffCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("metrics");
    expect(res.body).toHaveProperty("recentTickets");

    const { metrics, recentTickets } = res.body;

    const expectedKeys = [
      "newTickets",
      "openTickets",
      "inProgress",
      "waitingForRequester",
      "myAssigned",
    ];

    for (const key of expectedKeys) {
      expect(metrics).toHaveProperty(key);
      expect(typeof metrics[key].count).toBe("number");
      expect(typeof metrics[key].deltaYesterday).toBe("number");
    }

    expect(Array.isArray(recentTickets)).toBe(true);
    expect(recentTickets.length).toBeLessThanOrEqual(5);

    if (recentTickets.length > 0) {
      const ticket = recentTickets[0];
      expect(ticket).toHaveProperty("id");
      expect(ticket).toHaveProperty("ticketNo");
      expect(ticket).toHaveProperty("title");
      expect(ticket).toHaveProperty("status");
      expect(ticket).toHaveProperty("itPriority");
      expect(ticket).toHaveProperty("requesterName");
      expect(ticket).toHaveProperty("ownerName");
      expect(ticket).toHaveProperty("createdAt");
      expect(ticket).toHaveProperty("updatedAt");
    }
  });

  it("API-39: Requester attempts to access IT Staff Dashboard API", async () => {
    const res = await request(app)
      .get("/api/v1/dashboard/staff")
      .set("Cookie", requesterCookie);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("API-40: Administrator accesses IT Staff Dashboard API", async () => {
    const res = await request(app)
      .get("/api/v1/dashboard/staff")
      .set("Cookie", adminCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("metrics");
    expect(res.body).toHaveProperty("recentTickets");

    const { metrics, recentTickets } = res.body;
    expect(metrics).toHaveProperty("newTickets");
    expect(metrics).toHaveProperty("openTickets");
    expect(metrics).toHaveProperty("inProgress");
    expect(metrics).toHaveProperty("waitingForRequester");
    expect(metrics).toHaveProperty("myAssigned");
    expect(Array.isArray(recentTickets)).toBe(true);
  });

  it("rejects unauthenticated requests to IT Staff Dashboard with HTTP 401", async () => {
    const res = await request(app).get("/api/v1/dashboard/staff");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });
});
