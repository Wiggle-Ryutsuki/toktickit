import { Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import {
  validatePassword,
  hashPassword,
  verifyPassword,
} from "../utils/password.js";
import {
  createSession,
  revokeSession,
  rotateSession,
  getSessionCookieOptions,
  getExpiredCookieOptions,
  SESSION_COOKIE_NAME,
} from "../utils/session.js";

const prisma = getPrisma();

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Email and password are required.",
        fieldErrors: [
          ...(!email ? [{ field: "email", message: "Email is required." }] : []),
          ...(!password ? [{ field: "password", message: "Password is required." }] : []),
        ],
        correlationId: `req-${Date.now()}-login-val`,
      },
    });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Find user case-insensitively
  const user = await prisma.user.findFirst({
    where: {
      email: {
        equals: normalizedEmail,
        mode: "insensitive",
      },
    },
  });

  // Account enumeration defense: verify password first before checking isActive
  if (!user || !user.passwordHash) {
    res.status(401).json({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password.",
        fieldErrors: [],
        correlationId: `req-${Date.now()}-login-fail`,
      },
    });
    return;
  }

  const isPasswordValid = await verifyPassword(user.passwordHash, password);
  if (!isPasswordValid) {
    res.status(401).json({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password.",
        fieldErrors: [],
        correlationId: `req-${Date.now()}-login-fail`,
      },
    });
    return;
  }

  // Only return ACCOUNT_INACTIVE if credentials were correct
  if (!user.isActive) {
    res.status(403).json({
      error: {
        code: "ACCOUNT_INACTIVE",
        message: "Your account is inactive. Please contact an Administrator.",
        fieldErrors: [],
        correlationId: `req-${Date.now()}-login-inactive`,
      },
    });
    return;
  }

  const { token } = await createSession(user.id);

  res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions());

  res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
  });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE_NAME] || req.sessionToken;

  if (token) {
    await revokeSession(token);
  }

  res.cookie(SESSION_COOKIE_NAME, "", getExpiredCookieOptions());

  res.status(200).json({
    message: "Successfully logged out.",
  });
}

export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required. Please sign in.",
        fieldErrors: [],
        correlationId: `req-${Date.now()}-me-unauth`,
      },
    });
    return;
  }

  res.status(200).json({
    user: {
      id: req.user.id,
      email: req.user.email,
      displayName: req.user.displayName,
      role: req.user.role,
      mustChangePassword: req.user.mustChangePassword,
    },
  });
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required. Please sign in.",
        fieldErrors: [],
        correlationId: `req-${Date.now()}-pwd-unauth`,
      },
    });
    return;
  }

  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Current password, new password, and confirmation are required.",
        fieldErrors: [],
        correlationId: `req-${Date.now()}-pwd-val`,
      },
    });
    return;
  }

  if (newPassword !== confirmPassword) {
    res.status(400).json({
      error: {
        code: "PASSWORD_MISMATCH",
        message: "New password and confirmation do not match.",
        fieldErrors: [{ field: "confirmPassword", message: "Passwords do not match." }],
        correlationId: `req-${Date.now()}-pwd-mismatch`,
      },
    });
    return;
  }

  // Fetch latest user record with passwordHash
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  if (!user) {
    res.status(404).json({
      error: {
        code: "USER_NOT_FOUND",
        message: "User account not found.",
        fieldErrors: [],
        correlationId: `req-${Date.now()}-pwd-notfound`,
      },
    });
    return;
  }

  const isCurrentValid = await verifyPassword(user.passwordHash, currentPassword);
  if (!isCurrentValid) {
    res.status(422).json({
      error: {
        code: "INVALID_CURRENT_PASSWORD",
        message: "Current password is incorrect.",
        fieldErrors: [{ field: "currentPassword", message: "Incorrect password." }],
        correlationId: `req-${Date.now()}-pwd-currinvalid`,
      },
    });
    return;
  }

  // m-05: Reject if new password identical to current password
  if (newPassword === currentPassword) {
    res.status(422).json({
      error: {
        code: "PASSWORD_IDENTICAL_TO_CURRENT",
        message: "New password cannot be identical to current password.",
        fieldErrors: [{ field: "newPassword", message: "Choose a different password." }],
        correlationId: `req-${Date.now()}-pwd-identical`,
      },
    });
    return;
  }

  // Complexity check
  const validation = validatePassword(newPassword);
  if (!validation.isValid) {
    res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: validation.errors[0] || "Password does not meet complexity requirements.",
        fieldErrors: validation.errors.map((msg) => ({ field: "newPassword", message: msg })),
        correlationId: `req-${Date.now()}-pwd-weak`,
      },
    });
    return;
  }

  const newHash = await hashPassword(newPassword);

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
      mustChangePassword: false,
    },
  });

  // Rotate session
  const oldToken = req.cookies?.[SESSION_COOKIE_NAME] || req.sessionToken || "";
  const { token: newToken } = await rotateSession(oldToken, user.id);

  res.cookie(SESSION_COOKIE_NAME, newToken, getSessionCookieOptions());

  res.status(200).json({
    message: "Password changed successfully.",
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      displayName: updatedUser.displayName,
      role: updatedUser.role,
      mustChangePassword: updatedUser.mustChangePassword,
    },
  });
}
