import { Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { validateCommentContent } from "../utils/validation.js";

function getCorrelationId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Helper to check whether the calling user has access to view the ticket.
 * - IT Staff and Admin can view any ticket.
 * - Requester can only view tickets they created.
 */
async function getTicketAccess(ticketId: number, req: Request) {
  const prisma = getPrisma();
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, requesterId: true, status: true },
  });

  if (!ticket) {
    return { ticket: null, allowed: false };
  }

  const role = req.user?.role;
  const isStaffOrAdmin = role === "IT_STAFF" || role === "ADMINISTRATOR";

  if (isStaffOrAdmin) {
    return { ticket, allowed: true };
  }

  if (role === "REQUESTER" && ticket.requesterId === req.user?.id) {
    return { ticket, allowed: true };
  }

  // Lab 2 unauthenticated requester fallback header
  const requesterIdHeader = req.headers["x-requester-id"] as string | undefined;
  if (!role && requesterIdHeader) {
    const rawId = parseInt(requesterIdHeader.trim(), 10);
    if (rawId === ticket.requesterId) {
      return { ticket, allowed: true };
    }
  }

  return { ticket, allowed: false };
}

/**
 * GET /api/v1/tickets/:id/comments
 * Retrieves chronological Public Comments for a ticket.
 */
export async function getComments(req: Request, res: Response): Promise<Response> {
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
    const { ticket, allowed } = await getTicketAccess(ticketId, req);

    if (!ticket) {
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: `Ticket with ID ${ticketId} not found.`,
          correlationId,
        },
      });
    }

    if (!allowed) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to view comments on this ticket.",
          correlationId,
        },
      });
    }

    const prisma = getPrisma();
    const comments = await prisma.ticketComment.findMany({
      where: {
        ticketId,
        type: "PUBLIC",
      },
      select: {
        id: true,
        ticketId: true,
        content: true,
        createdAt: true,
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
    });

    const serialized = comments.map((c) => ({
      id: c.id,
      ticketId: c.ticketId,
      author: c.author,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
    }));

    return res.status(200).json(serialized);
  } catch (err) {
    console.error("Error retrieving comments:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve comments.",
        correlationId,
      },
    });
  }
}

/**
 * POST /api/v1/tickets/:id/comments
 * Posts an append-only Public Comment on a ticket.
 */
export async function postComment(req: Request, res: Response): Promise<Response> {
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
    const { ticket, allowed } = await getTicketAccess(ticketId, req);

    if (!ticket) {
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: `Ticket with ID ${ticketId} not found.`,
          correlationId,
        },
      });
    }

    if (!allowed) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to post comments on this ticket.",
          correlationId,
        },
      });
    }

    // Validate comment content
    const validation = validateCommentContent(req.body?.content);
    if (!validation.isValid) {
      return res.status(422).json({
        error: {
          code: validation.code || "UNPROCESSABLE_ENTITY",
          message: validation.error || "Invalid comment content.",
          correlationId,
        },
      });
    }

    const authorId = req.user?.id ?? 1; // Fallback to 1 for unauthenticated Lab 2 dev test

    const prisma = getPrisma();
    const newComment = await prisma.ticketComment.create({
      data: {
        ticketId,
        authorId,
        type: "PUBLIC",
        content: validation.trimmed!,
      },
      select: {
        id: true,
        ticketId: true,
        authorId: true,
        content: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            displayName: true,
            role: true,
          },
        },
      },
    });

    return res.status(201).json({
      id: newComment.id,
      ticketId: newComment.ticketId,
      authorId: newComment.authorId,
      author: newComment.author,
      content: newComment.content,
      createdAt: newComment.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Error creating comment:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to post comment.",
        correlationId,
      },
    });
  }
}

/**
 * GET /api/v1/tickets/:id/notes
 * Retrieves chronological Internal Notes for a ticket.
 * Restricted strictly to IT_STAFF and ADMINISTRATOR roles.
 */
export async function getNotes(req: Request, res: Response): Promise<Response> {
  const correlationId = getCorrelationId();

  // Role Boundary Check (FR-19, AC-04)
  const role = req.user?.role;
  if (role !== "IT_STAFF" && role !== "ADMINISTRATOR") {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Access denied. Internal notes are restricted to IT Staff and Administrators.",
        correlationId,
      },
    });
  }

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
      select: { id: true },
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

    const notes = await prisma.ticketComment.findMany({
      where: {
        ticketId,
        type: "INTERNAL_NOTE",
      },
      select: {
        id: true,
        ticketId: true,
        content: true,
        createdAt: true,
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
    });

    const serialized = notes.map((n) => ({
      id: n.id,
      ticketId: n.ticketId,
      author: n.author,
      content: n.content,
      createdAt: n.createdAt.toISOString(),
    }));

    return res.status(200).json(serialized);
  } catch (err) {
    console.error("Error retrieving internal notes:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve internal notes.",
        correlationId,
      },
    });
  }
}

/**
 * POST /api/v1/tickets/:id/notes
 * Posts an append-only Internal Note on a ticket.
 * Restricted strictly to IT_STAFF and ADMINISTRATOR roles.
 */
export async function postNote(req: Request, res: Response): Promise<Response> {
  const correlationId = getCorrelationId();

  // Role Boundary Check (FR-19, AC-04)
  const role = req.user?.role;
  if (role !== "IT_STAFF" && role !== "ADMINISTRATOR") {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Access denied. Internal notes are restricted to IT Staff and Administrators.",
        correlationId,
      },
    });
  }

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
      select: { id: true },
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

    // Validate note content
    const validation = validateCommentContent(req.body?.content);
    if (!validation.isValid) {
      return res.status(422).json({
        error: {
          code: validation.code || "UNPROCESSABLE_ENTITY",
          message: validation.error || "Invalid internal note content.",
          correlationId,
        },
      });
    }

    const authorId = req.user!.id;

    const newNote = await prisma.ticketComment.create({
      data: {
        ticketId,
        authorId,
        type: "INTERNAL_NOTE",
        content: validation.trimmed!,
      },
      select: {
        id: true,
        ticketId: true,
        authorId: true,
        content: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            displayName: true,
            role: true,
          },
        },
      },
    });

    return res.status(201).json({
      id: newNote.id,
      ticketId: newNote.ticketId,
      authorId: newNote.authorId,
      author: newNote.author,
      content: newNote.content,
      createdAt: newNote.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Error posting internal note:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to post internal note.",
        correlationId,
      },
    });
  }
}
