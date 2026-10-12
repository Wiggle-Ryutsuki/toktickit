import { Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { TicketStatus } from "@prisma/client";

export async function getRequesterDashboard(req: Request, res: Response): Promise<void> {
  const prisma = getPrisma();
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required. Please log in.",
        fieldErrors: [],
        correlationId: `req-${Date.now()}-unauth`,
      },
    });
    return;
  }

  try {
    // Authoritative counts scoped strictly to requesterId == req.user.id
    const [myOpenTickets, inProgress, resolved, closed, recentTicketsData] = await Promise.all([
      prisma.ticket.count({
        where: {
          requesterId: userId,
          status: {
            in: [
              TicketStatus.NEW,
              TicketStatus.ASSIGNED,
              TicketStatus.IN_PROGRESS,
              TicketStatus.PENDING_REQUESTER,
            ],
          },
        },
      }),
      prisma.ticket.count({
        where: {
          requesterId: userId,
          status: TicketStatus.IN_PROGRESS,
        },
      }),
      prisma.ticket.count({
        where: {
          requesterId: userId,
          status: TicketStatus.RESOLVED,
        },
      }),
      prisma.ticket.count({
        where: {
          requesterId: userId,
          status: TicketStatus.CLOSED,
        },
      }),
      prisma.ticket.findMany({
        where: {
          requesterId: userId,
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: 5,
        include: {
          category: true,
          relatedSystem: true,
        },
      }),
    ]);

    const recentTickets = recentTicketsData.map((t) => ({
      id: t.id,
      ticketNo: t.ticketNo,
      title: t.title,
      summary: t.title, // backward compatible alias
      status: t.status,
      priority: t.requestedPriority,
      requestedPriority: t.requestedPriority,
      itPriority: t.itPriority,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    res.status(200).json({
      metrics: {
        myOpenTickets,
        inProgress,
        resolved,
        closed,
      },
      recentTickets,
    });
  } catch (err: any) {
    console.error("Error fetching requester dashboard:", err);
    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve requester dashboard metrics.",
        fieldErrors: [],
        correlationId: `req-${Date.now()}-err`,
      },
    });
  }
}

export async function getStaffDashboard(req: Request, res: Response): Promise<void> {
  const prisma = getPrisma();
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required. Please log in.",
        fieldErrors: [],
        correlationId: `req-${Date.now()}-unauth`,
      },
    });
    return;
  }

  // Role enforcement
  if (req.user?.role !== "IT_STAFF" && req.user?.role !== "ADMINISTRATOR") {
    res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Access denied. IT Staff or Administrator role required.",
        fieldErrors: [],
        correlationId: `req-${Date.now()}-forbidden`,
      },
    });
    return;
  }

  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      newTicketsCount,
      newTicketsDelta,
      openTicketsCount,
      openTicketsDelta,
      inProgressCount,
      inProgressDelta,
      waitingForRequesterCount,
      waitingForRequesterDelta,
      myAssignedCount,
      myAssignedDelta,
      recentTicketsData,
    ] = await Promise.all([
      // 1. New Tickets
      prisma.ticket.count({ where: { status: TicketStatus.NEW } }),
      prisma.ticket.count({ where: { status: TicketStatus.NEW, updatedAt: { gte: yesterday } } }),

      // 2. Open Tickets (ASSIGNED)
      prisma.ticket.count({ where: { status: TicketStatus.ASSIGNED } }),
      prisma.ticket.count({ where: { status: TicketStatus.ASSIGNED, updatedAt: { gte: yesterday } } }),

      // 3. In Progress
      prisma.ticket.count({ where: { status: TicketStatus.IN_PROGRESS } }),
      prisma.ticket.count({ where: { status: TicketStatus.IN_PROGRESS, updatedAt: { gte: yesterday } } }),

      // 4. Waiting for Requester (PENDING_REQUESTER)
      prisma.ticket.count({ where: { status: TicketStatus.PENDING_REQUESTER } }),
      prisma.ticket.count({ where: { status: TicketStatus.PENDING_REQUESTER, updatedAt: { gte: yesterday } } }),

      // 5. My Assigned (current user non-terminal/non-closed/non-cancelled)
      prisma.ticket.count({
        where: {
          ownerId: userId,
          status: { notIn: [TicketStatus.CLOSED, TicketStatus.CANCELLED] },
        },
      }),
      prisma.ticket.count({
        where: {
          ownerId: userId,
          status: { notIn: [TicketStatus.CLOSED, TicketStatus.CANCELLED] },
          updatedAt: { gte: yesterday },
        },
      }),

      // 6. Recent Tickets triage (up to 5)
      prisma.ticket.findMany({
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: 5,
        include: {
          requester: true,
          owner: true,
        },
      }),
    ]);

    const recentTickets = recentTicketsData.map((t) => ({
      id: t.id,
      ticketNo: t.ticketNo,
      title: t.title,
      summary: t.title, // compatibility alias
      status: t.status,
      itPriority: t.itPriority,
      priority: t.itPriority, // compatibility alias
      requestedPriority: t.requestedPriority, // compatibility alias
      requesterName: t.requester?.displayName || "Unknown",
      ownerName: t.owner?.displayName || null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    res.status(200).json({
      metrics: {
        newTickets: {
          count: newTicketsCount,
          deltaYesterday: newTicketsDelta,
        },
        openTickets: {
          count: openTicketsCount,
          deltaYesterday: openTicketsDelta,
        },
        inProgress: {
          count: inProgressCount,
          deltaYesterday: inProgressDelta,
        },
        waitingForRequester: {
          count: waitingForRequesterCount,
          deltaYesterday: waitingForRequesterDelta,
        },
        myAssigned: {
          count: myAssignedCount,
          deltaYesterday: myAssignedDelta,
        },
      },
      recentTickets,
    });
  } catch (err: any) {
    console.error("Error fetching staff dashboard:", err);
    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve staff dashboard metrics.",
        fieldErrors: [],
        correlationId: `req-${Date.now()}-err`,
      },
    });
  }
}
