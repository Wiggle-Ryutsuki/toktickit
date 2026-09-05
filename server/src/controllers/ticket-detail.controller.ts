import { Request, Response } from "express";
import { getPrisma } from "../prisma.js";

function getCorrelationId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function getTicketDetail(req: Request, res: Response): Promise<Response> {
  const correlationId = getCorrelationId();

  // 1. Validate X-Requester-Id header
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

  const requesterId = parseInt(rawRequesterId.trim(), 10);
  if (requesterId <= 0) {
    return res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "X-Requester-Id must be a positive integer.",
        correlationId,
      },
    });
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
    if (ticket.requesterId !== requesterId) {
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

    return res.status(200).json({
      id: ticket.id,
      ticketNo: ticket.ticketNo,
      summary: ticket.title,
      description: ticket.description,
      status: ticket.status,
      requestedPriority: ticket.requestedPriority,
      itPriority: ticket.itPriority,
      ticketOwner: null,
      resolutionSummary: null,
      requester: ticket.requester,
      category: ticket.category,
      relatedSystem: ticket.relatedSystem,
      attachments: serializedAttachments,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    });
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
