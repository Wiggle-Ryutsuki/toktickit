import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { Role } from "@prisma/client";
import { hashPassword } from "../../src/utils/password.js";

const prisma = getPrisma();

describe("Feature-16: Requester Dashboard API Tests", () => {
  let jenniferCookie: string[];
  let jenniferId: number;
  let emptyRequesterCookie: string[];
  let emptyRequesterId: number;

  beforeAll(async () => {
    // 1. Log in as Requester Jennifer Anderson
    const jenniferLogin = await request(app).post("/api/v1/auth/login").send({
      email: "jennifer.anderson@kmutt.ac.th",
      password: "Password123!",
    });
    expect(jenniferLogin.status).toBe(200);
    jenniferCookie = jenniferLogin.headers["set-cookie"];
    jenniferId = jenniferLogin.body.user.id;

    // 2. Create or ensure an isolated requester with 0 tickets
    const defaultPasswordHash = await hashPassword("Password123!");
    const isolatedUser = await prisma.user.upsert({
      where: { email: "zero.tickets.requester@kmutt.ac.th" },
      update: {
        isActive: true,
        mustChangePassword: false,
      },
      create: {
        email: "zero.tickets.requester@kmutt.ac.th",
        displayName: "Zero Tickets Requester",
        role: Role.REQUESTER,
        isActive: true,
        passwordHash: defaultPasswordHash,
        mustChangePassword: false,
      },
    });
    emptyRequesterId = isolatedUser.id;

    // Ensure they have zero tickets
    await prisma.ticket.deleteMany({
      where: { requesterId: emptyRequesterId },
    });

    const emptyLogin = await request(app).post("/api/v1/auth/login").send({
      email: "zero.tickets.requester@kmutt.ac.th",
      password: "Password123!",
    });
    expect(emptyLogin.status).toBe(200);
    emptyRequesterCookie = emptyLogin.headers["set-cookie"];
  });

  it("API-36: Retrieve Requester Dashboard data (GET /api/v1/dashboard/requester)", async () => {
    const res = await request(app)
      .get("/api/v1/dashboard/requester")
      .set("Cookie", jenniferCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("metrics");
    expect(res.body).toHaveProperty("recentTickets");

    const { metrics, recentTickets } = res.body;
    expect(typeof metrics.myOpenTickets).toBe("number");
    expect(typeof metrics.inProgress).toBe("number");
    expect(typeof metrics.resolved).toBe("number");
    expect(typeof metrics.closed).toBe("number");

    expect(Array.isArray(recentTickets)).toBe(true);
    expect(recentTickets.length).toBeLessThanOrEqual(5);

    if (recentTickets.length > 0) {
      const ticket = recentTickets[0];
      expect(ticket).toHaveProperty("id");
      expect(ticket).toHaveProperty("ticketNo");
      expect(ticket).toHaveProperty("title");
      expect(ticket).toHaveProperty("summary");
      expect(ticket).toHaveProperty("status");
      expect(ticket).toHaveProperty("createdAt");
      expect(ticket).toHaveProperty("updatedAt");
    }
  });

  it("API-37: Cross-requester data isolation in Requester Dashboard", async () => {
    const res = await request(app)
      .get("/api/v1/dashboard/requester")
      .set("Cookie", emptyRequesterCookie);

    expect(res.status).toBe(200);
    expect(res.body.metrics).toEqual({
      myOpenTickets: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
    });
    expect(res.body.recentTickets).toEqual([]);
  });

  it("rejects unauthenticated requests to Requester Dashboard with HTTP 401", async () => {
    const res = await request(app).get("/api/v1/dashboard/requester");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });
});
