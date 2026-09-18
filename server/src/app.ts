import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
// getPrisma() is your lazy database handle. Call it INSIDE a route when you
// need the DB (Issue 4). It is intentionally unused until then.
void getPrisma;

import cookieParser from "cookie-parser";
import { authenticateSession, requirePasswordChangeClear } from "./middleware/auth.js";
import { login, logout, getCurrentUser, changePassword } from "./controllers/auth.controller.js";

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(authenticateSession);
app.use(requirePasswordChangeClear);

// ---------------------------------------------------------------------------
// Feature 9 — Authentication & Password Change Endpoints
// ---------------------------------------------------------------------------
app.post("/api/v1/auth/login", login);
app.post("/api/auth/login", login);

app.post("/api/v1/auth/logout", logout);
app.post("/api/auth/logout", logout);

app.get("/api/v1/auth/me", getCurrentUser);
app.get("/api/auth/me", getCurrentUser);

app.post("/api/v1/auth/change-password", changePassword);
app.post("/api/auth/change-password", changePassword);

// Standard Error Helper
function sendError(res: Response, status: number, code: string, message: string, fieldErrors: { field: string; message: string }[] = []) {
  const correlationId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  return res.status(status).json({
    error: {
      code,
      message,
      fieldErrors,
      correlationId,
    },
  });
}

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// Make the test in tests/lab-01/health.test.ts pass.
// It must return HTTP 200 with JSON: { status: "ok", service: "TokTickIT API" }
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  // TODO(Issue 2): replace this stub with the required 200 response.
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Issue 4 — Category list
// Add:  GET /api/categories
//   -> read categories from PostgreSQL via getPrisma().category.findMany(...)
//   -> return each { id, name } in a predictable (id) order
//   -> on failure, respond 500 with a safe message (no internal details)
// TODO(Issue 4): implement the route here.
// ---------------------------------------------------------------------------

// GET /api/requesters — retrieve active development requesters
app.get("/api/requesters", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const requesters = await prisma.user.findMany({
      where: {
        isActive: true,
        role: "REQUESTER",
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
      },
      orderBy: { id: "asc" },
    });
    res.status(200).json(requesters);
  } catch (error) {
    sendError(res, 500, "INTERNAL_SERVER_ERROR", "Failed to retrieve development requesters.");
  }
});

// GET /api/categories — retrieve active categories
app.get("/api/categories", async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const includeCode = req.query.includeCode === "true";
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        ...(includeCode ? { code: true } : {}),
      },
      orderBy: { id: "asc" },
    });
    res.status(200).json(categories);
  } catch (error) {
    sendError(res, 500, "INTERNAL_SERVER_ERROR", "Failed to fetch categories");
  }
});

// GET /api/related-systems — retrieve active related systems
app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const systems = await prisma.relatedSystem.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: { id: "asc" },
    });
    res.status(200).json(systems);
  } catch (error) {
    sendError(res, 500, "INTERNAL_SERVER_ERROR", "Failed to fetch related systems");
  }
});

// ---------------------------------------------------------------------------
// Feature 6 — Create Ticket Screen & Submission API (POST /api/tickets)
// ---------------------------------------------------------------------------
import { uploadMiddleware } from "./middleware/upload.js";
import { createTicket } from "./controllers/tickets.controller.js";
import { listTickets } from "./controllers/tickets-list.controller.js";

const handleTicketUpload = (req: Request, res: Response, next: express.NextFunction) => {
  uploadMiddleware.array("attachments", 5)(req, res, (err: any) => {
    if (err) {
      const correlationId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: "File exceeds the maximum allowed size of 5 MB (5,242,880 bytes).",
            correlationId,
          },
        });
      }
      if (err.code === "UNSUPPORTED_MEDIA_TYPE") {
        return res.status(415).json({
          error: {
            code: "UNSUPPORTED_MEDIA_TYPE",
            message: err.message,
            correlationId,
          },
        });
      }
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: err.message || "Failed to process multipart form upload.",
          correlationId,
        },
      });
    }
    next();
  });
};

app.post("/api/tickets", handleTicketUpload, createTicket);
app.post("/api/v1/tickets", handleTicketUpload, createTicket);

// ---------------------------------------------------------------------------
// Feature 7 — My Tickets List, Search, Filters, Sorting & Pagination
// ---------------------------------------------------------------------------
app.get("/api/tickets", listTickets);

// ---------------------------------------------------------------------------
// Feature 10 — IT Staff Ticket Queue (GET /api/v1/tickets & /api/v1/staff/tickets)
// ---------------------------------------------------------------------------
import { requireRole } from "./middleware/auth.js";
import { getStaffQueue } from "./controllers/staff-queue.controller.js";

app.get("/api/v1/tickets", (req, res, next) => {
  if (req.query.requesterId) {
    return listTickets(req, res);
  }
  return requireRole("IT_STAFF", "ADMINISTRATOR")(req, res, () => getStaffQueue(req, res));
});
app.get("/api/v1/staff/tickets", requireRole("IT_STAFF", "ADMINISTRATOR"), getStaffQueue);
app.get("/api/staff/tickets", requireRole("IT_STAFF", "ADMINISTRATOR"), getStaffQueue);

// ---------------------------------------------------------------------------
// Feature 8 & 11 — Ticket Detail, Operations, Comments & Notes
// ---------------------------------------------------------------------------
import {
  getTicketDetail,
  updateTicketOperational,
  indicateResolution,
} from "./controllers/ticket-detail.controller.js";
import {
  getComments,
  postComment,
  getNotes,
  postNote,
} from "./controllers/comments-notes.controller.js";
import { getStaffAssignees } from "./controllers/staff-assignees.controller.js";
import {
  uploadAttachment,
  downloadAttachment,
  softRemoveAttachment,
} from "./controllers/attachments.controller.js";

const handleSingleAttachmentUpload = (req: Request, res: Response, next: express.NextFunction) => {
  uploadMiddleware.fields([
    { name: "file", maxCount: 1 },
    { name: "attachment", maxCount: 1 },
  ])(req, res, (err: any) => {
    if (err) {
      const correlationId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: "File exceeds the maximum allowed size of 5 MB (5,242,880 bytes).",
            correlationId,
          },
        });
      }
      if (err.code === "UNSUPPORTED_MEDIA_TYPE") {
        return res.status(415).json({
          error: {
            code: "UNSUPPORTED_MEDIA_TYPE",
            message: err.message,
            correlationId,
          },
        });
      }
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: err.message || "Failed to process multipart form upload.",
          correlationId,
        },
      });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files) {
      if (files["file"] && files["file"].length > 0) {
        req.file = files["file"][0];
      } else if (files["attachment"] && files["attachment"].length > 0) {
        req.file = files["attachment"][0];
      }
    }
    next();
  });
};

// Staff Assignees List
app.get("/api/users/staff", getStaffAssignees);
app.get("/api/v1/users/staff", getStaffAssignees);
app.get("/api/staff", getStaffAssignees);
app.get("/api/v1/staff", getStaffAssignees);

// Ticket Detail & Operational Updates
app.get("/api/tickets/:id", getTicketDetail);
app.get("/api/v1/tickets/:id", getTicketDetail);
app.patch("/api/tickets/:id", updateTicketOperational);
app.patch("/api/v1/tickets/:id", updateTicketOperational);

// Requester Resolution Indication
app.post("/api/tickets/:id/resolve-indication", indicateResolution);
app.post("/api/v1/tickets/:id/resolve-indication", indicateResolution);

// Public Comments
app.get("/api/tickets/:id/comments", getComments);
app.get("/api/v1/tickets/:id/comments", getComments);
app.post("/api/tickets/:id/comments", postComment);
app.post("/api/v1/tickets/:id/comments", postComment);

// Internal Notes
app.get("/api/tickets/:id/notes", getNotes);
app.get("/api/v1/tickets/:id/notes", getNotes);
app.post("/api/tickets/:id/notes", postNote);
app.post("/api/v1/tickets/:id/notes", postNote);

// Attachment Upload
app.post("/api/tickets/:id/attachments", handleSingleAttachmentUpload, uploadAttachment);
app.post("/api/v1/tickets/:id/attachments", handleSingleAttachmentUpload, uploadAttachment);

// Attachment Download (Nested & Direct Alias)
app.get("/api/tickets/:id/attachments/:attachmentId", downloadAttachment);
app.get("/api/v1/tickets/:id/attachments/:attachmentId", downloadAttachment);
app.get("/api/attachments/:id/download", downloadAttachment);
app.get("/api/v1/attachments/:id/download", downloadAttachment);

// Attachment Soft-Removal (Nested & Direct Alias)
app.delete("/api/tickets/:id/attachments/:attachmentId", softRemoveAttachment);
app.delete("/api/v1/tickets/:id/attachments/:attachmentId", softRemoveAttachment);
app.delete("/api/attachments/:id", softRemoveAttachment);
app.delete("/api/v1/attachments/:id", softRemoveAttachment);

export default app;


