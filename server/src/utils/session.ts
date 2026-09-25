import crypto from "node:crypto";
import { CookieOptions } from "express";
import { User, Session } from "@prisma/client";
import { getPrisma } from "../prisma.js";

const prisma = getPrisma();

export const SESSION_COOKIE_NAME = "toktickit_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function getSessionCookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isProd,
    maxAge: SESSION_TTL_MS,
  };
}

export function getExpiredCookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isProd,
    maxAge: 0,
    expires: new Date(0),
  };
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(userId: number): Promise<{ token: string; expiresAt: Date }> {
  // Asynchronous cleanup of expired sessions
  cleanupExpiredSessions().catch(() => {});

  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function getSession(token: string): Promise<(Session & { user: User }) | null> {
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session;
}

export async function revokeSession(token: string): Promise<void> {
  if (!token) return;
  await prisma.session.deleteMany({
    where: { token },
  });
}

export async function rotateSession(
  oldToken: string,
  userId: number
): Promise<{ token: string; expiresAt: Date }> {
  if (oldToken) {
    await prisma.session.deleteMany({ where: { token: oldToken } }).catch(() => {});
  }
  return createSession(userId);
}

export async function cleanupExpiredSessions(): Promise<void> {
  await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
}
