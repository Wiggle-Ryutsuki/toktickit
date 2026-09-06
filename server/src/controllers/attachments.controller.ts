import { Request, Response } from "express";
import path from "node:path";
import fs from "node:fs";
import { getPrisma } from "../prisma.js";
import { validateAttachment } from "../utils/attachment-validator.js";

function getCorrelationId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function parseRequesterId(req: Request): number | null {
  const header = req.headers["x-requester-id"] as string | undefined;
  const query = req.query.requesterId as string | undefined;
  const body = req.body?.uploadedById ?? req.body?.deletedById;
  const raw = header ?? query ?? (body !== undefined ? String(body) : undefined);

  if (!raw || !/^\d+$/.test(String(raw).trim())) {
    return null;
  }
  const parsed = parseInt(String(raw).trim(), 10);
  return parsed > 0 ? parsed : null;
}

// ---------------------------------------------------------------------------
// POST /api/tickets/:id/attachments
// ---------------------------------------------------------------------------
export async function uploadAttachment(req: Request, res: Response): Promise<Response> {
  const correlationId = getCorrelationId();
  const requesterId = parseRequesterId(req);

  if (!requesterId) {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
    }
    return res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Missing or invalid X-Requester-Id header.",
        correlationId,
      },
    });
  }

  const rawTicketId = req.params.id;
  if (!rawTicketId || !/^\d+$/.test(rawTicketId.trim())) {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
    }
    return res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Invalid ticket ID parameter. Expected a positive integer.",
        correlationId,
      },
    });
  }
  const ticketId = parseInt(rawTicketId.trim(), 10);

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

    if (!ticket) {
      if (req.file && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
      }
      return res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: `Ticket with ID ${ticketId} not found.`,
          correlationId,
        },
      });
    }

    if (ticket.requesterId !== requesterId) {
      if (req.file && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
      }
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to attach files to this ticket.",
          correlationId,
        },
      });
    }

    if (ticket.status === "CLOSED") {
      if (req.file && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
      }
      return res.status(403).json({
        error: {
          code: "TICKET_IMMUTABLE",
          message: "Cannot add attachments to a closed ticket.",
          correlationId,
        },
      });
    }

    // Validate file presence
    if (!req.file) {
      return res.status(400).json({
        error: {
          code: "FILE_REQUIRED",
          message: "No file was uploaded.",
          correlationId,
        },
      });
    }

    // Check active attachment count (< 5 active files allowed)
    const activeCount = await prisma.attachment.count({
      where: {
        ticketId,
        deletedAt: null,
      },
    });

    if (activeCount >= 5) {
      if (fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
      }
      return res.status(422).json({
        error: {
          code: "ATTACHMENT_LIMIT_EXCEEDED",
          message: "Maximum limit of 5 active attachments reached for this ticket.",
          correlationId,
        },
      });
    }

    // Validate file type and size
    const validation = validateAttachment({
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    if (!validation.valid) {
      if (fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
      }
      const statusCode = validation.error?.code === "FILE_TOO_LARGE" ? 413 : 415;
      const errorCode = validation.error?.code === "FILE_TOO_LARGE" ? "PAYLOAD_TOO_LARGE" : "UNSUPPORTED_MEDIA_TYPE";
      return res.status(statusCode).json({
        error: {
          code: errorCode,
          message: validation.error?.message ?? "Invalid attachment file.",
          correlationId,
        },
      });
    }

    const attachment = await prisma.attachment.create({
      data: {
        ticketId,
        uploadedById: requesterId,
        originalFilename: req.file.originalname,
        storedFilename: req.file.filename,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        storagePath: `uploads/${req.file.filename}`,
        deletedAt: null,
      },
    });

    return res.status(201).json({
      id: attachment.id,
      ticketId: attachment.ticketId,
      originalFilename: attachment.originalFilename,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      uploadedById: attachment.uploadedById,
      isDeleted: false,
      isRemoved: false,
      deletedAt: null,
      removedAt: null,
      removalReason: null,
      createdAt: attachment.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Error uploading attachment:", err);
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
    }
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to upload attachment.",
        correlationId,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// GET /api/tickets/:id/attachments/:attachmentId & GET /api/attachments/:id/download
// ---------------------------------------------------------------------------
export async function downloadAttachment(req: Request, res: Response): Promise<void> {
  const correlationId = getCorrelationId();
  const requesterId = parseRequesterId(req);

  if (!requesterId) {
    res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Missing or invalid X-Requester-Id header.",
        correlationId,
      },
    });
    return;
  }

  const rawAttachmentId = req.params.attachmentId ?? req.params.id;
  if (!rawAttachmentId || !/^\d+$/.test(rawAttachmentId.trim())) {
    res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Invalid attachment ID parameter. Expected a positive integer.",
        correlationId,
      },
    });
    return;
  }
  const attachmentId = parseInt(rawAttachmentId.trim(), 10);

  const rawTicketId = req.params.attachmentId ? req.params.id : undefined;
  const ticketId = rawTicketId ? parseInt(rawTicketId.trim(), 10) : undefined;

  try {
    const prisma = getPrisma();
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: true },
    });

    if (!attachment) {
      res.status(404).json({
        error: {
          code: "ATTACHMENT_NOT_FOUND",
          message: `Attachment with ID ${attachmentId} not found.`,
          correlationId,
        },
      });
      return;
    }

    // Relational check when nested under /api/tickets/:id/attachments/:attachmentId
    if (ticketId !== undefined && attachment.ticketId !== ticketId) {
      res.status(404).json({
        error: {
          code: "ATTACHMENT_NOT_FOUND",
          message: `Attachment with ID ${attachmentId} does not belong to ticket ${ticketId}.`,
          correlationId,
        },
      });
      return;
    }

    // Ownership check
    if (attachment.ticket.requesterId !== requesterId) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to download this attachment.",
          correlationId,
        },
      });
      return;
    }

    // Soft-removed check: HTTP 410 Gone
    if (attachment.deletedAt !== null) {
      res.status(410).json({
        error: {
          code: "ATTACHMENT_REMOVED",
          message: "This attachment was removed and is no longer available for download.",
          removedAt: attachment.deletedAt.toISOString(),
          removalReason: attachment.removalReason,
          correlationId,
        },
      });
      return;
    }

    // Stream file binary
    const filePath = path.resolve(process.cwd(), "uploads", path.basename(attachment.storedFilename));
    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        error: {
          code: "FILE_NOT_FOUND_ON_DISK",
          message: "Attachment file missing from storage.",
          correlationId,
        },
      });
      return;
    }

    res.setHeader("Content-Type", attachment.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(attachment.originalFilename)}"`);
    res.setHeader("Content-Length", attachment.sizeBytes);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    console.error("Error downloading attachment:", err);
    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to download attachment.",
        correlationId,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/tickets/:id/attachments/:attachmentId & DELETE /api/attachments/:id
// ---------------------------------------------------------------------------
export async function softRemoveAttachment(req: Request, res: Response): Promise<Response> {
  const correlationId = getCorrelationId();
  const requesterId = parseRequesterId(req);

  if (!requesterId) {
    return res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Missing or invalid X-Requester-Id header.",
        correlationId,
      },
    });
  }

  const rawAttachmentId = req.params.attachmentId ?? req.params.id;
  if (!rawAttachmentId || !/^\d+$/.test(rawAttachmentId.trim())) {
    return res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Invalid attachment ID parameter. Expected a positive integer.",
        correlationId,
      },
    });
  }
  const attachmentId = parseInt(rawAttachmentId.trim(), 10);

  const rawTicketId = req.params.attachmentId ? req.params.id : undefined;
  const ticketId = rawTicketId ? parseInt(rawTicketId.trim(), 10) : undefined;

  try {
    const prisma = getPrisma();
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: true },
    });

    if (!attachment) {
      return res.status(404).json({
        error: {
          code: "ATTACHMENT_NOT_FOUND",
          message: `Attachment with ID ${attachmentId} not found.`,
          correlationId,
        },
      });
    }

    // Relational check
    if (ticketId !== undefined && attachment.ticketId !== ticketId) {
      return res.status(404).json({
        error: {
          code: "ATTACHMENT_NOT_FOUND",
          message: `Attachment with ID ${attachmentId} does not belong to ticket ${ticketId}.`,
          correlationId,
        },
      });
    }

    // Ownership check
    if (attachment.ticket.requesterId !== requesterId) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to remove this attachment.",
          correlationId,
        },
      });
    }

    // Closed ticket check
    if (attachment.ticket.status === "CLOSED") {
      return res.status(403).json({
        error: {
          code: "TICKET_IMMUTABLE",
          message: "Cannot modify attachments on a closed ticket.",
          correlationId,
        },
      });
    }

    // Already removed check
    if (attachment.deletedAt !== null) {
      return res.status(422).json({
        error: {
          code: "ALREADY_REMOVED",
          message: "This attachment has already been removed.",
          correlationId,
        },
      });
    }

    // Validate removal reason (3-255 chars)
    const reason = req.body?.removalReason;
    if (!reason || typeof reason !== "string" || reason.trim().length < 3 || reason.trim().length > 255) {
      return res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Removal reason is required and must be between 3 and 255 characters.",
          correlationId,
        },
      });
    }

    const updated = await prisma.attachment.update({
      where: { id: attachmentId },
      data: {
        deletedAt: new Date(),
        deletedById: requesterId,
        removalReason: reason.trim(),
      },
    });

    return res.status(200).json({
      id: updated.id,
      ticketId: updated.ticketId,
      originalFilename: updated.originalFilename,
      mimeType: updated.mimeType,
      sizeBytes: updated.sizeBytes,
      uploadedById: updated.uploadedById,
      isDeleted: true,
      isRemoved: true,
      deletedAt: updated.deletedAt!.toISOString(),
      removedAt: updated.deletedAt!.toISOString(),
      removalReason: updated.removalReason,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Error soft-removing attachment:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to remove attachment.",
        correlationId,
      },
    });
  }
}
