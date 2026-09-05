import { Request, Response } from "express";
import crypto from "node:crypto";
import { getPrisma } from "../prisma.js";
import { formatTicketNumber } from "../utils/ticket-number.js";
import { validateCreateTicketInput } from "../utils/ticket-validator.js";
import { MAX_ATTACHMENTS_PER_TICKET } from "../utils/attachment-validator.js";

export async function createTicket(req: Request, res: Response): Promise<void> {
  const correlationId = `req-${crypto.randomUUID()}`;
  const prisma = getPrisma();

  try {
    const rawRequesterId = req.body.requesterId ?? req.headers["x-requester-id"];
    const requesterId = Number(rawRequesterId);
    const categoryId = Number(req.body.categoryId);
    const relatedSystemId = Number(req.body.relatedSystemId);
    const requestedPriority = req.body.requestedPriority;
    const summary = typeof req.body.summary === "string" ? req.body.summary.trim() : "";
    const description = typeof req.body.description === "string" ? req.body.description.trim() : "";

    const validation = validateCreateTicketInput({
      requesterId,
      categoryId,
      relatedSystemId,
      requestedPriority,
      summary,
      description,
    });

    if (!validation.valid) {
      res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "The ticket submission failed validation.",
          fieldErrors: validation.fieldErrors,
          correlationId,
        },
      });
      return;
    }

    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length > MAX_ATTACHMENTS_PER_TICKET) {
      res.status(413).json({
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: `Maximum of ${MAX_ATTACHMENTS_PER_TICKET} attachments per ticket exceeded.`,
          correlationId,
        },
      });
      return;
    }

    // Check active references in DB
    const [requester, category, relatedSystem] = await Promise.all([
      prisma.user.findFirst({ where: { id: requesterId, isActive: true } }),
      prisma.category.findFirst({ where: { id: categoryId, isActive: true } }),
      prisma.relatedSystem.findFirst({ where: { id: relatedSystemId, isActive: true } }),
    ]);

    const referenceErrors: Array<{ field: string; message: string }> = [];
    if (!requester) {
      referenceErrors.push({
        field: "requesterId",
        message: `Requester ID ${requesterId} does not exist or is inactive.`,
      });
    }
    if (!category) {
      referenceErrors.push({
        field: "categoryId",
        message: `Category ID ${categoryId} does not exist or is inactive.`,
      });
    }
    if (!relatedSystem) {
      referenceErrors.push({
        field: "relatedSystemId",
        message: `Related System ID ${relatedSystemId} does not exist or is inactive.`,
      });
    }

    if (referenceErrors.length > 0) {
      res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "One or more referenced entities are invalid or inactive.",
          fieldErrors: referenceErrors,
          correlationId,
        },
      });
      return;
    }

    // Transactional creation
    const createdTicket = await prisma.$transaction(async (tx) => {
      const currentYear = new Date().getUTCFullYear();

      const sequenceRecord = await tx.ticketSequence.upsert({
        where: { year: currentYear },
        update: { lastValue: { increment: 1 } },
        create: { year: currentYear, lastValue: 1 },
      });

      const ticketNo = formatTicketNumber(currentYear, sequenceRecord.lastValue);

      const ticket = await tx.ticket.create({
        data: {
          ticketNo,
          title: summary,
          description,
          requesterId,
          categoryId,
          relatedSystemId,
          requestedPriority: requestedPriority as any,
          itPriority: requestedPriority as any,
          status: "NEW",
          attachments: {
            create: files.map((file) => ({
              uploadedById: requesterId,
              originalFilename: file.originalname,
              storedFilename: file.filename,
              mimeType: file.mimetype,
              sizeBytes: file.size,
              storagePath: file.path,
            })),
          },
        },
        include: {
          requester: { select: { id: true, displayName: true, email: true } },
          category: { select: { id: true, name: true, code: true } },
          relatedSystem: { select: { id: true, name: true } },
          attachments: {
            select: {
              id: true,
              originalFilename: true,
              mimeType: true,
              sizeBytes: true,
              createdAt: true,
            },
          },
        },
      });

      return ticket;
    });

    res.status(201).json({
      id: createdTicket.id,
      ticketNo: createdTicket.ticketNo,
      summary: createdTicket.title,
      description: createdTicket.description,
      status: createdTicket.status,
      requestedPriority: createdTicket.requestedPriority,
      itPriority: createdTicket.itPriority,
      requester: createdTicket.requester,
      category: createdTicket.category,
      relatedSystem: createdTicket.relatedSystem,
      attachments: createdTicket.attachments,
      createdAt: createdTicket.createdAt,
      updatedAt: createdTicket.updatedAt,
    });
  } catch (err: any) {
    console.error(`[${correlationId}] Failed to create ticket:`, err);
    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred while saving the ticket. Please try again.",
        correlationId,
      },
    });
  }
}
