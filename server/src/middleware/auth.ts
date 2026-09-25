import { Request, Response, NextFunction } from "express";
import { User } from "@prisma/client";
import { getSession, SESSION_COOKIE_NAME } from "../utils/session.js";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionToken?: string;
    }
  }
}

export async function authenticateSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | undefined = req.cookies?.[SESSION_COOKIE_NAME];

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.slice(7).trim();
    }

    if (!token) {
      return next();
    }

    const session = await getSession(token);
    if (!session) {
      return next();
    }

    if (!session.user.isActive) {
      res.status(403).json({
        error: {
          code: "ACCOUNT_INACTIVE",
          message: "Your account is inactive. Please contact an Administrator.",
          fieldErrors: [],
          correlationId: `req-${Date.now()}-inactive`,
        },
      });
      return;
    }

    req.user = session.user;
    req.sessionToken = token;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required. Please sign in.",
        fieldErrors: [],
        correlationId: `req-${Date.now()}-unauth`,
      },
    });
    return;
  }
  next();
}

export function requirePasswordChangeClear(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.user && req.user.mustChangePassword) {
    // Whitelist path for password update, me profile, and logout
    const allowed =
      req.path.endsWith("/auth/change-password") ||
      req.path.endsWith("/auth/logout") ||
      req.path.endsWith("/auth/me");

    if (!allowed) {
      res.status(403).json({
        error: {
          code: "MUST_CHANGE_PASSWORD",
          message: "Password change required before accessing system features.",
          fieldErrors: [],
          correlationId: `req-${Date.now()}-mustchange`,
        },
      });
      return;
    }
  }
  next();
}

export function requireRole(...allowedRoles: (string)[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required. Please log in.",
          fieldErrors: [],
          correlationId: `req-${Date.now()}-unauth`,
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Access denied. IT Staff or Administrator role required.",
          fieldErrors: [],
          correlationId: `req-${Date.now()}-forbidden`,
        },
      });
      return;
    }

    next();
  };
}

