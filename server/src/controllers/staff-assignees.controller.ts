import { Request, Response } from "express";
import { getPrisma } from "../prisma.js";

function getCorrelationId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * GET /api/v1/users/staff (alias /api/v1/staff)
 * Retrieves active IT Staff and Administrator users for ticket assignment.
 * Strictly restricted to IT_STAFF and ADMINISTRATOR roles.
 */
export async function getStaffAssignees(req: Request, res: Response): Promise<Response> {
  const correlationId = getCorrelationId();

  // Role check: Only IT Staff and Admin can view assignable staff
  const role = req.user?.role;
  if (role !== "IT_STAFF" && role !== "ADMINISTRATOR") {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Access denied. Only IT Staff and Administrators can view assignable staff.",
        correlationId,
      },
    });
  }

  try {
    const prisma = getPrisma();
    const staffMembers = await prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          in: ["IT_STAFF", "ADMINISTRATOR"],
        },
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        role: true,
      },
      orderBy: {
        displayName: "asc",
      },
    });

    return res.status(200).json(staffMembers);
  } catch (err) {
    console.error("Error retrieving staff assignees:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve staff assignees.",
        correlationId,
      },
    });
  }
}
