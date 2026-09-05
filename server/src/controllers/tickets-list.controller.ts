import { Request, Response } from "express";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { getPrisma } from "../prisma.js";

const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const VALID_STATUSES = [
  "NEW",
  "ASSIGNED",
  "IN_PROGRESS",
  "PENDING_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "CANCELLED",
] as const;

const SORT_FIELD_MAP: Record<string, string> = {
  createdAt: "createdAt",
  ticketNo: "ticketNo",
  updatedAt: "updatedAt",
  summary: "title", // Maps public 'summary' to schema 'title'
  status: "status",
  requestedPriority: "requestedPriority",
  priority: "requestedPriority",
};

export async function listTickets(req: Request, res: Response): Promise<void> {
  const correlationId = `req-${crypto.randomUUID()}`;
  const prisma = getPrisma();

  try {
    const rawRequesterId = req.query.requesterId ?? req.headers["x-requester-id"];

    if (!rawRequesterId) {
      res.status(400).json({
        error: {
          code: "MISSING_REQUESTER_ID",
          message: "A valid requesterId query parameter or X-Requester-Id header is required.",
          fieldErrors: [{ field: "requesterId", message: "requesterId is required" }],
          correlationId,
        },
      });
      return;
    }

    const requesterId = Number(rawRequesterId);
    if (!Number.isInteger(requesterId) || requesterId <= 0) {
      res.status(400).json({
        error: {
          code: "INVALID_REQUESTER_ID",
          message: "requesterId must be a positive integer.",
          fieldErrors: [{ field: "requesterId", message: "requesterId must be a positive integer" }],
          correlationId,
        },
      });
      return;
    }

    // Pagination bounds
    let page = 1;
    if (req.query.page !== undefined && req.query.page !== "") {
      page = Number(req.query.page);
      if (!Number.isInteger(page) || page < 1) {
        res.status(400).json({
          error: {
            code: "INVALID_PAGINATION",
            message: "Page parameter must be an integer greater than or equal to 1.",
            fieldErrors: [{ field: "page", message: "page must be an integer >= 1" }],
            correlationId,
          },
        });
        return;
      }
    }

    let limit = 10;
    if (req.query.limit !== undefined && req.query.limit !== "") {
      limit = Number(req.query.limit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
        res.status(400).json({
          error: {
            code: "INVALID_PAGINATION",
            message: "Limit parameter must be an integer between 1 and 50.",
            fieldErrors: [{ field: "limit", message: "limit must be between 1 and 50" }],
            correlationId,
          },
        });
        return;
      }
    }

    // Sorting parameters
    const rawSortBy = typeof req.query.sortBy === "string" ? req.query.sortBy.trim() : "createdAt";
    if (!SORT_FIELD_MAP[rawSortBy]) {
      res.status(400).json({
        error: {
          code: "INVALID_SORT_FIELD",
          message: `Invalid sortBy field '${rawSortBy}'. Allowed fields: ${Object.keys(SORT_FIELD_MAP).join(", ")}.`,
          fieldErrors: [{ field: "sortBy", message: `Allowed fields: ${Object.keys(SORT_FIELD_MAP).join(", ")}` }],
          correlationId,
        },
      });
      return;
    }
    const sortField = SORT_FIELD_MAP[rawSortBy];

    const rawSortOrder = typeof req.query.sortOrder === "string" ? req.query.sortOrder.trim().toLowerCase() : "desc";
    if (rawSortOrder !== "asc" && rawSortOrder !== "desc") {
      res.status(400).json({
        error: {
          code: "INVALID_SORT_ORDER",
          message: "sortOrder must be either 'asc' or 'desc'.",
          fieldErrors: [{ field: "sortOrder", message: "sortOrder must be 'asc' or 'desc'" }],
          correlationId,
        },
      });
      return;
    }

    // Filter validation
    let categoryId: number | undefined;
    if (req.query.categoryId !== undefined && req.query.categoryId !== "") {
      categoryId = Number(req.query.categoryId);
      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        res.status(400).json({
          error: {
            code: "INVALID_FILTER",
            message: "categoryId must be a positive integer.",
            fieldErrors: [{ field: "categoryId", message: "categoryId must be a positive integer" }],
            correlationId,
          },
        });
        return;
      }
    }

    const priorityParam = req.query.priority ?? req.query.requestedPriority;
    let requestedPriority: (typeof VALID_PRIORITIES)[number] | undefined;
    if (typeof priorityParam === "string" && priorityParam.trim() !== "") {
      const p = priorityParam.trim().toUpperCase() as any;
      if (!VALID_PRIORITIES.includes(p)) {
        res.status(400).json({
          error: {
            code: "INVALID_FILTER",
            message: `priority must be one of: ${VALID_PRIORITIES.join(", ")}.`,
            fieldErrors: [{ field: "priority", message: `Allowed priorities: ${VALID_PRIORITIES.join(", ")}` }],
            correlationId,
          },
        });
        return;
      }
      requestedPriority = p;
    }

    let itPriority: (typeof VALID_PRIORITIES)[number] | undefined;
    if (typeof req.query.itPriority === "string" && req.query.itPriority.trim() !== "") {
      const itp = req.query.itPriority.trim().toUpperCase() as any;
      if (!VALID_PRIORITIES.includes(itp)) {
        res.status(400).json({
          error: {
            code: "INVALID_FILTER",
            message: `itPriority must be one of: ${VALID_PRIORITIES.join(", ")}.`,
            fieldErrors: [{ field: "itPriority", message: `Allowed priorities: ${VALID_PRIORITIES.join(", ")}` }],
            correlationId,
          },
        });
        return;
      }
      itPriority = itp;
    }

    let status: (typeof VALID_STATUSES)[number] | undefined;
    if (typeof req.query.status === "string" && req.query.status.trim() !== "") {
      const s = req.query.status.trim().toUpperCase() as any;
      if (!VALID_STATUSES.includes(s)) {
        res.status(400).json({
          error: {
            code: "INVALID_FILTER",
            message: `status must be one of: ${VALID_STATUSES.join(", ")}.`,
            fieldErrors: [{ field: "status", message: `Allowed statuses: ${VALID_STATUSES.join(", ")}` }],
            correlationId,
          },
        });
        return;
      }
      status = s;
    }

    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    // Mandatory Requester Isolation (BR-04, AC-03)
    const where: Prisma.TicketWhereInput = {
      requesterId,
      ...(search && {
        OR: [
          { ticketNo: { contains: search, mode: "insensitive" } },
          { title: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(categoryId && { categoryId }),
      ...(requestedPriority && { requestedPriority }),
      ...(itPriority && { itPriority }),
      ...(status && { status }),
    };

    // Deterministic ordering: primary sort + secondary tie-breaker on id DESC (BR-13, BR-14)
    const orderBy: Prisma.TicketOrderByWithRelationInput[] = [
      { [sortField]: rawSortOrder },
      { id: "desc" },
    ];

    const [totalItems, tickets] = await prisma.$transaction([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        select: {
          id: true,
          ticketNo: true,
          title: true, // mapped to summary in public DTO
          status: true,
          requestedPriority: true,
          itPriority: true,
          createdAt: true,
          updatedAt: true,
          category: { select: { id: true, name: true, code: true } },
          relatedSystem: { select: { id: true, name: true } },
          requester: { select: { id: true, displayName: true, email: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    const data = tickets.map((t) => ({
      id: t.id,
      ticketNo: t.ticketNo,
      summary: t.title,
      status: t.status,
      requestedPriority: t.requestedPriority,
      itPriority: t.itPriority,
      categoryName: t.category.name,
      category: t.category,
      relatedSystemName: t.relatedSystem.name,
      relatedSystem: t.relatedSystem,
      ticketOwner: null, // Assigned IT staff (unassigned in Lab 2)
      requester: t.requester,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    res.status(200).json({
      data,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (err: any) {
    console.error(`[${correlationId}] Failed to list tickets:`, err);
    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred while retrieving tickets.",
        correlationId,
      },
    });
  }
}
