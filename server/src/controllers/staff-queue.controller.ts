import { Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { TicketStatus, Priority, Prisma } from "@prisma/client";

const VALID_STATUSES = Object.values(TicketStatus);
const VALID_PRIORITIES = Object.values(Priority);
const VALID_SORT_FIELDS = [
  "createdAt",
  "ticketNo",
  "updatedAt",
  "status",
  "requestedPriority",
  "itPriority",
];

export async function getStaffQueue(req: Request, res: Response): Promise<void> {
  const correlationId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const fieldErrors: { field: string; message: string }[] = [];

  const {
    search,
    categoryId: rawCategoryId,
    status: rawStatus,
    requestedPriority: rawRequestedPriority,
    itPriority: rawItPriority,
    assigned: rawAssigned,
    sortBy: rawSortBy,
    sortOrder: rawSortOrder,
    page: rawPage,
    limit: rawLimit,
    pageSize: rawPageSize,
  } = req.query;

  // 1. Validate categoryId
  let categoryId: number | undefined;
  if (rawCategoryId !== undefined && rawCategoryId !== "" && rawCategoryId !== "ALL") {
    const parsed = Number(rawCategoryId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      fieldErrors.push({
        field: "categoryId",
        message: "categoryId must be a positive integer",
      });
    } else {
      categoryId = parsed;
    }
  }

  // 2. Validate status
  let status: TicketStatus | undefined;
  if (rawStatus !== undefined && rawStatus !== "" && rawStatus !== "ALL") {
    const upper = String(rawStatus).toUpperCase();
    if (!VALID_STATUSES.includes(upper as TicketStatus)) {
      fieldErrors.push({
        field: "status",
        message: `status must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    } else {
      status = upper as TicketStatus;
    }
  }

  // 3. Validate requestedPriority
  let requestedPriority: Priority | undefined;
  if (rawRequestedPriority !== undefined && rawRequestedPriority !== "" && rawRequestedPriority !== "ALL") {
    const upper = String(rawRequestedPriority).toUpperCase();
    if (!VALID_PRIORITIES.includes(upper as Priority)) {
      fieldErrors.push({
        field: "requestedPriority",
        message: `requestedPriority must be one of: ${VALID_PRIORITIES.join(", ")}`,
      });
    } else {
      requestedPriority = upper as Priority;
    }
  }

  // 4. Validate itPriority
  let itPriority: Priority | undefined;
  if (rawItPriority !== undefined && rawItPriority !== "" && rawItPriority !== "ALL") {
    const upper = String(rawItPriority).toUpperCase();
    if (!VALID_PRIORITIES.includes(upper as Priority)) {
      fieldErrors.push({
        field: "itPriority",
        message: `itPriority must be one of: ${VALID_PRIORITIES.join(", ")}`,
      });
    } else {
      itPriority = upper as Priority;
    }
  }

  // 5. Validate assigned
  const assigned = rawAssigned ? String(rawAssigned).toLowerCase() : "all";
  if (!["all", "unassigned", "mine"].includes(assigned)) {
    fieldErrors.push({
      field: "assigned",
      message: "assigned must be one of: all, unassigned, mine",
    });
  }

  // 6. Validate sortBy
  const sortBy = rawSortBy ? String(rawSortBy) : "createdAt";
  if (!VALID_SORT_FIELDS.includes(sortBy)) {
    fieldErrors.push({
      field: "sortBy",
      message: `sortBy must be one of: ${VALID_SORT_FIELDS.join(", ")}`,
    });
  }

  // 7. Validate sortOrder
  let sortOrder: "asc" | "desc" = "desc";
  if (rawSortOrder !== undefined) {
    const lower = String(rawSortOrder).toLowerCase();
    if (lower !== "asc" && lower !== "desc") {
      fieldErrors.push({
        field: "sortOrder",
        message: "sortOrder must be 'asc' or 'desc'",
      });
    } else {
      sortOrder = lower as "asc" | "desc";
    }
  } else {
    // Default desc for dates, asc for text/statuses
    sortOrder = sortBy === "createdAt" || sortBy === "updatedAt" ? "desc" : "asc";
  }

  // 8. Validate page
  let page = 1;
  if (rawPage !== undefined) {
    const parsedPage = Number(rawPage);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      fieldErrors.push({
        field: "page",
        message: "page must be an integer greater than or equal to 1",
      });
    } else {
      page = parsedPage;
    }
  }

  // 9. Validate limit / pageSize
  let limit = 10;
  const rawLimitVal = rawLimit ?? rawPageSize;
  if (rawLimitVal !== undefined) {
    const parsedLimit = Number(rawLimitVal);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      fieldErrors.push({
        field: "limit",
        message: "limit must be an integer between 1 and 100",
      });
    } else {
      limit = parsedLimit;
    }
  }

  if (fieldErrors.length > 0) {
    res.status(400).json({
      error: {
        code: "INVALID_QUERY_PARAMS",
        message: "Invalid query parameters provided.",
        fieldErrors,
        correlationId,
      },
    });
    return;
  }

  try {
    const prisma = getPrisma();
    const where: Prisma.TicketWhereInput = {};

    // Text search on ticketNo or title (case-insensitive substring)
    if (search && typeof search === "string" && search.trim().length > 0) {
      const term = search.trim();
      where.OR = [
        { ticketNo: { contains: term, mode: "insensitive" } },
        { title: { contains: term, mode: "insensitive" } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (status) {
      where.status = status;
    }

    if (requestedPriority) {
      where.requestedPriority = requestedPriority;
    }

    if (itPriority) {
      where.itPriority = itPriority;
    }

    // Assignment filter
    if (assigned === "unassigned") {
      where.ownerId = null;
    } else if (assigned === "mine") {
      where.ownerId = req.user!.id;
    }

    // Execute count and paginated query concurrently
    const [totalCount, ticketRecords] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          ticketNo: true,
          title: true,
          description: true,
          status: true,
          requestedPriority: true,
          itPriority: true,
          version: true,
          createdAt: true,
          updatedAt: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          relatedSystem: {
            select: {
              id: true,
              name: true,
            },
          },
          requester: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
          owner: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    // Map title to summary for UI clarity while keeping both
    const tickets = ticketRecords.map((t) => ({
      id: t.id,
      ticketNo: t.ticketNo,
      summary: t.title,
      title: t.title,
      description: t.description,
      category: t.category,
      relatedSystem: t.relatedSystem,
      requester: t.requester,
      owner: t.owner,
      requestedPriority: t.requestedPriority,
      itPriority: t.itPriority,
      status: t.status,
      version: t.version,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    res.status(200).json({
      tickets,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred while retrieving tickets.",
        fieldErrors: [],
        correlationId,
      },
    });
  }
}
