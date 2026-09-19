import { Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { Role } from "@prisma/client";
import { validatePassword, hashPassword } from "../utils/password.js";
import {
  validateDisplayName,
  validateEmail,
  validateRole,
  canDeactivateUser,
  canModifyAdminAccount,
} from "../utils/validation.js";

const USER_ADMIN_SELECT = {
  id: true,
  displayName: true,
  email: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  createdAt: true,
  updatedAt: true,
};

function generateCorrelationId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * GET /api/v1/admin/users
 * Lists user accounts with search and single-role filtering.
 * Strictly restricted to ADMINISTRATOR role.
 */
export async function getAdminUsers(req: Request, res: Response): Promise<void> {
  const correlationId = generateCorrelationId();
  try {
    const prisma = getPrisma();
    const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;
    const roleParam = typeof req.query.role === "string" ? req.query.role.trim() : undefined;

    let roleFilter: Role | undefined = undefined;
    if (roleParam && roleParam !== "ALL") {
      const roleValidation = validateRole(roleParam);
      if (!roleValidation.isValid) {
        res.status(400).json({
          error: {
            code: "INVALID_ROLE_FILTER",
            message: "Invalid role filter parameter.",
            correlationId,
          },
        });
        return;
      }
      roleFilter = roleParam as Role;
    }

    const users = await prisma.user.findMany({
      where: {
        ...(roleFilter && { role: roleFilter }),
        ...(search && {
          OR: [
            { displayName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      select: USER_ADMIN_SELECT,
      orderBy: { id: "asc" },
    });

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve user accounts.",
        correlationId,
      },
    });
  }
}

/**
 * POST /api/v1/admin/users
 * Creates a new user with one role and an initial password.
 * Strictly restricted to ADMINISTRATOR role.
 */
export async function createAdminUser(req: Request, res: Response): Promise<void> {
  const correlationId = generateCorrelationId();
  try {
    const prisma = getPrisma();
    const { displayName, email, role, isActive = true, initialPassword } = req.body ?? {};

    const nameValidation = validateDisplayName(displayName);
    if (!nameValidation.isValid) {
      res.status(422).json({
        error: {
          code: nameValidation.code || "INVALID_DISPLAY_NAME",
          message: nameValidation.error || "Invalid display name.",
          correlationId,
        },
      });
      return;
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      res.status(422).json({
        error: {
          code: emailValidation.code || "INVALID_EMAIL",
          message: emailValidation.error || "Invalid email address.",
          correlationId,
        },
      });
      return;
    }

    const roleValidation = validateRole(role);
    if (!roleValidation.isValid) {
      res.status(422).json({
        error: {
          code: roleValidation.code || "INVALID_ROLE",
          message: roleValidation.error || "Invalid role.",
          correlationId,
        },
      });
      return;
    }

    if (typeof initialPassword !== "string") {
      res.status(422).json({
        error: {
          code: "PASSWORD_REQUIRED",
          message: "Initial password is required.",
          correlationId,
        },
      });
      return;
    }

    const passwordValidation = validatePassword(initialPassword);
    if (!passwordValidation.isValid) {
      res.status(422).json({
        error: {
          code: "PASSWORD_POLICY_VIOLATION",
          message: passwordValidation.errors.join(" "),
          correlationId,
        },
      });
      return;
    }

    // Check duplicate email (case-insensitive)
    const existing = await prisma.user.findFirst({
      where: {
        email: { equals: emailValidation.trimmed, mode: "insensitive" },
      },
    });

    if (existing) {
      res.status(409).json({
        error: {
          code: "DUPLICATE_EMAIL",
          message: "A user with this email address already exists.",
          correlationId,
        },
      });
      return;
    }

    const passwordHash = await hashPassword(initialPassword);

    const newUser = await prisma.user.create({
      data: {
        displayName: nameValidation.trimmed!,
        email: emailValidation.trimmed!,
        role: roleValidation.trimmed as Role,
        isActive: Boolean(isActive),
        passwordHash,
        mustChangePassword: true,
      },
      select: USER_ADMIN_SELECT,
    });

    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create user account.",
        correlationId,
      },
    });
  }
}

/**
 * GET /api/v1/admin/users/:id
 * Retrieves single user details by ID.
 * Strictly restricted to ADMINISTRATOR role.
 */
export async function getAdminUserById(req: Request, res: Response): Promise<void> {
  const correlationId = generateCorrelationId();
  try {
    const prisma = getPrisma();
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      res.status(400).json({
        error: {
          code: "INVALID_USER_ID",
          message: "User ID must be a valid number.",
          correlationId,
        },
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: USER_ADMIN_SELECT,
    });

    if (!user) {
      res.status(404).json({
        error: {
          code: "USER_NOT_FOUND",
          message: "User does not exist.",
          correlationId,
        },
      });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve user details.",
        correlationId,
      },
    });
  }
}

/**
 * PATCH /api/v1/admin/users/:id
 * Updates an existing user's display name, email, role, or active status.
 * Strictly restricted to ADMINISTRATOR role.
 */
export async function updateAdminUser(req: Request, res: Response): Promise<void> {
  const correlationId = generateCorrelationId();
  try {
    const prisma = getPrisma();
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      res.status(400).json({
        error: {
          code: "INVALID_USER_ID",
          message: "User ID must be a valid number.",
          correlationId,
        },
      });
      return;
    }

    const { displayName, email, role, isActive } = req.body ?? {};

    if (
      displayName === undefined &&
      email === undefined &&
      role === undefined &&
      isActive === undefined
    ) {
      res.status(400).json({
        error: {
          code: "EMPTY_UPDATE_PAYLOAD",
          message: "At least one field must be provided for update.",
          correlationId,
        },
      });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      res.status(404).json({
        error: {
          code: "USER_NOT_FOUND",
          message: "User does not exist.",
          correlationId,
        },
      });
      return;
    }

    let trimmedName: string | undefined = undefined;
    if (displayName !== undefined) {
      const nameValidation = validateDisplayName(displayName);
      if (!nameValidation.isValid) {
        res.status(422).json({
          error: {
            code: nameValidation.code || "INVALID_DISPLAY_NAME",
            message: nameValidation.error || "Invalid display name.",
            correlationId,
          },
        });
        return;
      }
      trimmedName = nameValidation.trimmed;
    }

    let validatedRole: Role | undefined = undefined;
    if (role !== undefined) {
      const roleValidation = validateRole(role);
      if (!roleValidation.isValid) {
        res.status(422).json({
          error: {
            code: roleValidation.code || "INVALID_ROLE",
            message: roleValidation.error || "Invalid role.",
            correlationId,
          },
        });
        return;
      }
      validatedRole = role as Role;
    }

    let normalizedEmail: string | undefined = undefined;
    if (email !== undefined) {
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        res.status(422).json({
          error: {
            code: emailValidation.code || "INVALID_EMAIL",
            message: emailValidation.error || "Invalid email address.",
            correlationId,
          },
        });
        return;
      }
      normalizedEmail = emailValidation.trimmed;

      // Duplicate email check excluding current user
      const existing = await prisma.user.findFirst({
        where: {
          email: { equals: normalizedEmail, mode: "insensitive" },
          id: { not: userId },
        },
      });

      if (existing) {
        res.status(409).json({
          error: {
            code: "DUPLICATE_EMAIL",
            message: "A user with this email address already exists.",
            correlationId,
          },
        });
        return;
      }
    }

    // Safety Rule 1: Self-deactivation guard (BR-12, FR-27)
    if (isActive === false && !canDeactivateUser(userId, req.user!.id)) {
      res.status(422).json({
        error: {
          code: "SELF_DEACTIVATION_PROHIBITED",
          message: "You cannot deactivate your own active Administrator account.",
          correlationId,
        },
      });
      return;
    }

    // Safety Rule 2: Last active administrator guard (BR-13, FR-27)
    if (targetUser.role === "ADMINISTRATOR" && targetUser.isActive) {
      const activeAdminCount = await prisma.user.count({
        where: { role: "ADMINISTRATOR", isActive: true },
      });

      if (!canModifyAdminAccount(true, activeAdminCount, role, isActive)) {
        res.status(422).json({
          error: {
            code: "LAST_ADMIN_PROTECTION",
            message: "Cannot deactivate or re-assign role of the only active Administrator in the system.",
            correlationId,
          },
        });
        return;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(trimmedName !== undefined && { displayName: trimmedName }),
        ...(normalizedEmail !== undefined && { email: normalizedEmail }),
        ...(validatedRole !== undefined && { role: validatedRole }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
      select: USER_ADMIN_SELECT,
    });

    // Invalidate sessions immediately if deactivated (BR-14)
    if (isActive === false) {
      await prisma.session.deleteMany({
        where: { userId },
      });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update user account.",
        correlationId,
      },
    });
  }
}

/**
 * POST /api/v1/admin/users/:id/reset-password
 * Sets new initial password and forces change at next login.
 * Strictly restricted to ADMINISTRATOR role.
 */
export async function resetUserPassword(req: Request, res: Response): Promise<void> {
  const correlationId = generateCorrelationId();
  try {
    const prisma = getPrisma();
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      res.status(400).json({
        error: {
          code: "INVALID_USER_ID",
          message: "User ID must be a valid number.",
          correlationId,
        },
      });
      return;
    }

    const { initialPassword } = req.body ?? {};

    if (typeof initialPassword !== "string") {
      res.status(422).json({
        error: {
          code: "PASSWORD_REQUIRED",
          message: "Initial password is required.",
          correlationId,
        },
      });
      return;
    }

    const passwordValidation = validatePassword(initialPassword);
    if (!passwordValidation.isValid) {
      res.status(422).json({
        error: {
          code: "PASSWORD_POLICY_VIOLATION",
          message: passwordValidation.errors.join(" "),
          correlationId,
        },
      });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      res.status(404).json({
        error: {
          code: "USER_NOT_FOUND",
          message: "User does not exist.",
          correlationId,
        },
      });
      return;
    }

    const passwordHash = await hashPassword(initialPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    // Invalidate existing sessions so user is forced to re-authenticate
    await prisma.session.deleteMany({
      where: { userId },
    });

    res.status(200).json({
      message: "Initial password successfully updated. User must change password at next login.",
      userId,
      mustChangePassword: true,
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to reset initial password.",
        correlationId,
      },
    });
  }
}
