import { Request, Response } from "express";
import { Priority, TicketStatus } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { isValidStatusTransition } from "../utils/status-transition.js";
import { validateResolutionSummary } from "../utils/validation.js";

function getCorrelationId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * GET /api/v1/tickets/:id (and alias /api/tickets/:id)
 * Retrieves full ticket detail, safe attachments, public comments,
 * and internal notes (omitted completely for Requesters).
 */
export async function getTicketDetail(req: Request, res: Response): Promise<Response> {
  const correlationId = getCorrelationId();

  // 1. Determine caller authorization and identity
  const isStaffOrAdmin = req.user?.role === "IT_STAFF" || req.user?.role === "ADMINISTRATOR";
  let requesterId: number | null = null;

  if (req.user?.role === "REQUESTER") {
    requesterId = req.user.id;
  } else if (!isStaffOrAdmin) {
    // Validate X-Requester-Id header for simulated/unauthenticated requester (Lab 2 compatibility)
    const requesterIdHeader = req.headers["x-requester-id"] as string | undefined;
    const requesterIdQuery = req.query.requesterId as string | undefined;
    const rawRequesterId = requesterIdHeader ?? requesterIdQuery;

    if (!rawRequesterId || !/^\d+$/.test(rawRequesterId.trim())) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Missing or invalid X-Requester-Id header.",
          correlationId,
        },
      });
    }

    requesterId = parseInt(rawRequesterId.trim(), 10);
    if (requesterId <= 0) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "X-Requester-Id must be a positive integer.",
          correlationId,
        },
      });
    }
  }

  // 2. Validate Ticket ID parameter
  const rawTicketId = req.params.id;
  if (!rawTicketId || !/^\d+$/.test(rawTicketId.trim())) {
    return res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Invalid ticket ID parameter. Expected a positive integer.",
        correlationId,
      },
    });
  }

  const ticketId = parseInt(rawTicketId.trim(), 10);
  if (ticketId <= 0) {
    return res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Invalid ticket ID parameter. Expected a positive integer.",
        correlationId,
      },
    });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        requester: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        relatedSystem: {
          select: {
            id: true,
            name: true,
          },
        },
        owner: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        attachments: {
          include: {
            uploadedBy: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                displayName: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: `Ticket with ID ${ticketId} not found.`,
          correlationId,
        },
      });
    }

    // 3. Strict BOLA Ownership Enforcement
    // IT Staff and Administrators have access to view all tickets in the system.
    // Requesters can only view tickets they created.
    if (!isStaffOrAdmin && ticket.requesterId !== requesterId) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to view this ticket.",
          correlationId,
        },
      });
    }

    // 4. Safe DTO Serialization (no internal storage paths leaked)
    const serializedAttachments = ticket.attachments.map((att) => ({
      id: att.id,
      ticketId: att.ticketId,
      originalFilename: att.originalFilename,
      mimeType: att.mimeType,
      sizeBytes: att.sizeBytes,
      uploadedById: att.uploadedById,
      uploadedByName: att.uploadedBy?.displayName ?? "Unknown",
      isDeleted: att.deletedAt !== null,
      isRemoved: att.deletedAt !== null,
      deletedAt: att.deletedAt ? att.deletedAt.toISOString() : null,
      removedAt: att.deletedAt ? att.deletedAt.toISOString() : null,
      removalReason: att.removalReason ?? null,
      createdAt: att.createdAt.toISOString(),
    }));

    // Segregate Public Comments vs Internal Notes
    const publicComments = ticket.comments
      .filter((c) => c.type === "PUBLIC")
      .map((c) => ({
        id: c.id,
        ticketId: c.ticketId,
        author: c.author,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
      }));

    const internalNotes = isStaffOrAdmin
      ? ticket.comments
          .filter((c) => c.type === "INTERNAL_NOTE")
          .map((c) => ({
            id: c.id,
            ticketId: c.ticketId,
            author: c.author,
            content: c.content,
            createdAt: c.createdAt.toISOString(),
          }))
      : undefined;

    const responsePayload: Record<string, any> = {
      id: ticket.id,
      ticketNo: ticket.ticketNo,
      summary: ticket.title,
      description: ticket.description,
      status: ticket.status,
      requestedPriority: ticket.requestedPriority,
      itPriority: ticket.itPriority,
      version: ticket.version,
      ticketOwner: ticket.owner ? ticket.owner.displayName : null, // Lab 2 compatibility
      owner: ticket.owner
        ? {
            id: ticket.owner.id,
            displayName: ticket.owner.displayName,
            email: ticket.owner.email,
          }
        : null,
      resolutionSummary: ticket.resolutionSummary,
      requesterResolutionConfirmedAt: ticket.requesterResolutionConfirmedAt
        ? ticket.requesterResolutionConfirmedAt.toISOString()
        : null,
      requester: ticket.requester,
      category: ticket.category,
      relatedSystem: ticket.relatedSystem,
      attachments: serializedAttachments,
      comments: publicComments,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    };

    // Strict boundary: Only add notes property if user is IT Staff or Admin
    if (isStaffOrAdmin && internalNotes) {
      responsePayload.notes = internalNotes;
    }

    return res.status(200).json(responsePayload);
  } catch (err) {
    console.error("Error retrieving ticket detail:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve ticket details.",
        correlationId,
      },
    });
  }
}

/**
 * PATCH /api/v1/tickets/:id (and alias /api/tickets/:id)
 * Operational ticket updates:
 * - Claim / reassign ownerId
 * - Set itPriority
 * - Transition status
 * - Set resolutionSummary (mandatory on RESOLVED / CLOSED)
 * - Optimistic concurrency checking version
 */
export async function updateTicketOperational(req: Request, res: Response): Promise<Response> {
  const correlationId = getCorrelationId();

  // Role Boundary Check (FR-15, FR-16, AC-11, AC-12)
  const role = req.user?.role;
  if (role !== "IT_STAFF" && role !== "ADMINISTRATOR") {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Access denied. Only IT Staff and Administrators can perform operational updates.",
        correlationId,
      },
    });
  }

  // Validate Ticket ID parameter
  const rawTicketId = req.params.id;
  if (!rawTicketId || !/^\d+$/.test(rawTicketId.trim())) {
    return res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Invalid ticket ID parameter. Expected a positive integer.",
        correlationId,
      },
    });
  }

  const ticketId = parseInt(rawTicketId.trim(), 10);

  // Validate version parameter (BR-16)
  const suppliedVersion = req.body?.version;
  if (
    typeof suppliedVersion !== "number" ||
    !Number.isInteger(suppliedVersion) ||
    suppliedVersion < 1
  ) {
    return res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Field 'version' is required and must be a positive integer.",
        correlationId,
      },
    });
  }

  try {
    const prisma = getPrisma();
    const existingTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!existingTicket) {
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: `Ticket with ID ${ticketId} not found.`,
          correlationId,
        },
      });
    }

    const { ownerId, itPriority, status, resolutionSummary } = req.body;

    // Validate ownerId (BR-06)
    if (ownerId !== undefined && ownerId !== null) {
      if (typeof ownerId !== "number" || !Number.isInteger(ownerId)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "ownerId must be an integer or null.",
            correlationId,
          },
        });
      }

      const assignedUser = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { id: true, role: true, isActive: true },
      });

      if (
        !assignedUser ||
        !assignedUser.isActive ||
        (assignedUser.role !== "IT_STAFF" && assignedUser.role !== "ADMINISTRATOR")
      ) {
        return res.status(422).json({
          error: {
            code: "INVALID_OWNER",
            message: "Ticket owner must be an active IT Staff or Administrator account.",
            correlationId,
          },
        });
      }
    }

    // Validate itPriority (BR-07)
    if (itPriority !== undefined) {
      const validPriorities = [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.URGENT];
      if (!validPriorities.includes(itPriority)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: `Invalid IT Priority '${itPriority}'. Allowed values: LOW, MEDIUM, HIGH, URGENT.`,
            correlationId,
          },
        });
      }
    }

    // Validate status & resolutionSummary (BR-08, BR-09, FR-16)
    let validatedResolutionSummary: string | null = existingTicket.resolutionSummary;

    if (status !== undefined) {
      const validStatuses = [
        TicketStatus.NEW,
        TicketStatus.ASSIGNED,
        TicketStatus.IN_PROGRESS,
        TicketStatus.PENDING_REQUESTER,
        TicketStatus.RESOLVED,
        TicketStatus.CLOSED,
        TicketStatus.CANCELLED,
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: `Invalid status '${status}'.`,
            correlationId,
          },
        });
      }

      if (!isValidStatusTransition(existingTicket.status, status)) {
        return res.status(422).json({
          error: {
            code: "INVALID_STATUS_TRANSITION",
            message: `Cannot transition status from '${existingTicket.status}' to '${status}'.`,
            correlationId,
          },
        });
      }

      // Mandatory resolutionSummary when moving to RESOLVED or CLOSED
      if (status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED) {
        const validation = validateResolutionSummary(resolutionSummary);
        if (!validation.isValid) {
          return res.status(422).json({
            error: {
              code: validation.code || "MISSING_RESOLUTION_SUMMARY",
              message: validation.error || "Resolution summary is required when resolving or closing a ticket.",
              correlationId,
            },
          });
        }
        validatedResolutionSummary = validation.trimmed!;
      }
    } else if (resolutionSummary !== undefined) {
      if (resolutionSummary) {
        const validation = validateResolutionSummary(resolutionSummary);
        if (!validation.isValid) {
          return res.status(422).json({
            error: {
              code: validation.code || "UNPROCESSABLE_ENTITY",
              message: validation.error || "Invalid resolution summary.",
              correlationId,
            },
          });
        }
        validatedResolutionSummary = validation.trimmed!;
      } else {
        validatedResolutionSummary = null;
      }
    }

    // Build update mutation payload
    const updateData: Record<string, any> = {
      version: { increment: 1 },
    };

    if (ownerId !== undefined) {
      updateData.ownerId = ownerId;
    }
    if (itPriority !== undefined) {
      updateData.itPriority = itPriority;
    }
    if (status !== undefined) {
      updateData.status = status;
    }
    if (validatedResolutionSummary !== undefined) {
      updateData.resolutionSummary = validatedResolutionSummary;
    }

    // Atomic conditional update checking version (BR-16)
    const updateResult = await prisma.ticket.updateMany({
      where: {
        id: ticketId,
        version: suppliedVersion,
      },
      data: updateData,
    });

    if (updateResult.count === 0) {
      // Re-query to determine if ticket was deleted or version collided
      const currentTicket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true, version: true },
      });

      if (!currentTicket) {
        return res.status(404).json({
          error: {
            code: "TICKET_NOT_FOUND",
            message: `Ticket with ID ${ticketId} not found.`,
            correlationId,
          },
        });
      }

      return res.status(409).json({
        error: {
          code: "CONCURRENCY_CONFLICT",
          message: "Ticket has been modified by another transaction. Please reload.",
          correlationId,
        },
      });
    }

    // Retrieve updated record
    const updated = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        ticketNo: true,
        ownerId: true,
        itPriority: true,
        status: true,
        resolutionSummary: true,
        version: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      id: updated!.id,
      ticketNo: updated!.ticketNo,
      ownerId: updated!.ownerId,
      itPriority: updated!.itPriority,
      status: updated!.status,
      resolutionSummary: updated!.resolutionSummary,
      version: updated!.version,
      updatedAt: updated!.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error("Error updating ticket:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update ticket.",
        correlationId,
      },
    });
  }
}

/**
 * POST /api/v1/tickets/:id/resolve-indication
 * Records Requester confirmation that their issue appears resolved without mutating formal ticket status (FR-20, BR-05).
 * Only accessible to the Requester who owns the ticket.
 */
export async function indicateResolution(req: Request, res: Response): Promise<Response> {
  const correlationId = getCorrelationId();

  const rawTicketId = req.params.id;
  if (!rawTicketId || !/^\d+$/.test(rawTicketId.trim())) {
    return res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Invalid ticket ID parameter.",
        correlationId,
      },
    });
  }

  const ticketId = parseInt(rawTicketId.trim(), 10);

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, requesterId: true, status: true },
    });

    if (!ticket) {
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: `Ticket with ID ${ticketId} not found.`,
          correlationId,
        },
      });
    }

    // Validate ownership: Must be the requester who created the ticket
    const requesterId = req.user?.id;
    const headerId = req.headers["x-requester-id"]
      ? parseInt((req.headers["x-requester-id"] as string).trim(), 10)
      : undefined;

    const callerId = requesterId ?? headerId;

    if (!callerId || callerId !== ticket.requesterId || (req.user && req.user.role !== "REQUESTER")) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Only the ticket requester can indicate that the problem appears resolved.",
          correlationId,
        },
      });
    }

    // Validate active ticket status
    if (
      ticket.status === TicketStatus.RESOLVED ||
      ticket.status === TicketStatus.CLOSED ||
      ticket.status === TicketStatus.CANCELLED
    ) {
      return res.status(422).json({
        error: {
          code: "TICKET_INACTIVE_FOR_RESOLUTION",
          message: "Cannot indicate resolution on a ticket that is already resolved, closed, or cancelled.",
          correlationId,
        },
      });
    }

    // Idempotently record resolution confirmation
    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        requesterResolutionConfirmedAt: new Date(),
      },
      select: {
        requesterResolutionConfirmedAt: true,
      },
    });

    return res.status(200).json({
      message: "Resolution indication recorded.",
      requesterResolutionConfirmedAt: updated.requesterResolutionConfirmedAt!.toISOString(),
    });
  } catch (err) {
    console.error("Error recording resolution indication:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to record resolution indication.",
        correlationId,
      },
    });
  }
}
