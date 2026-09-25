import React, { useState, useEffect, useCallback, useContext } from "react";
import { AuthContext } from "../context/AuthContext.js";
import AttachmentSection from "./AttachmentSection.js";
import {
  getTicketDetailApi,
  getStaffAssigneesApi,
  updateTicketOperationalApi,
  postCommentApi,
  postNoteApi,
  TicketDetailFullDto,
  StaffAssigneeDto,
  TicketCommentDto,
} from "../api.js";

export interface StaffTicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "NEW":
      return "badge-status-new";
    case "ASSIGNED":
      return "badge-status-assigned";
    case "IN_PROGRESS":
      return "badge-status-in-progress";
    case "PENDING_REQUESTER":
      return "badge-status-pending-requester";
    case "RESOLVED":
      return "badge-status-resolved";
    case "CLOSED":
      return "badge-status-closed";
    case "CANCELLED":
      return "badge-status-cancelled";
    default:
      return "bg-secondary text-white";
  }
}

function getPriorityBadgeClass(priority: string): string {
  switch (priority) {
    case "CRITICAL":
    case "URGENT":
      return "badge-priority-urgent";
    case "HIGH":
      return "badge-priority-high";
    case "MEDIUM":
      return "badge-priority-medium";
    case "LOW":
      return "badge-priority-low";
    default:
      return "bg-light text-dark border";
  }
}

function getRoleBadgeClass(role: string): string {
  switch (role) {
    case "ADMINISTRATOR":
      return "badge-role-admin";
    case "IT_STAFF":
      return "badge-role-staff";
    default:
      return "badge-role-requester";
  }
}

// Allowed state machine transitions according to BR-08
const TRANSITION_MAP: Record<string, string[]> = {
  NEW: ["ASSIGNED", "IN_PROGRESS", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "PENDING_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["PENDING_REQUESTER", "RESOLVED", "CANCELLED"],
  PENDING_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: ["IN_PROGRESS"],
  CANCELLED: [],
};

export default function StaffTicketDetail({ ticketId, onBack }: StaffTicketDetailProps) {
  const auth = useContext(AuthContext);

  const [ticket, setTicket] = useState<TicketDetailFullDto | null>(null);
  const [staffList, setStaffList] = useState<StaffAssigneeDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Operational form state
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");
  const [selectedItPriority, setSelectedItPriority] = useState<string>("LOW");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [resolutionSummaryInput, setResolutionSummaryInput] = useState<string>("");
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateSuccessMessage, setUpdateSuccessMessage] = useState<string | null>(null);
  const [concurrencyConflict, setConcurrencyConflict] = useState<boolean>(false);

  // Active tab state: 'comments' | 'notes' | 'attachments'
  const [activeTab, setActiveTab] = useState<"comments" | "notes" | "attachments">("comments");

  // Comment submission state
  const [newComment, setNewComment] = useState<string>("");
  const [commentSubmitting, setCommentSubmitting] = useState<boolean>(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Note submission state
  const [newNote, setNewNote] = useState<string>("");
  const [noteSubmitting, setNoteSubmitting] = useState<boolean>(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Fetch ticket details
  const fetchTicket = useCallback(async () => {
    setLoading(true);
    setErrorCode(null);
    setErrorMessage(null);
    setConcurrencyConflict(false);

    try {
      const data = await getTicketDetailApi(ticketId);
      setTicket(data);
      setSelectedOwnerId(data.ownerId ? String(data.ownerId) : "");
      setSelectedItPriority(data.itPriority || "LOW");
      setSelectedStatus(data.status);
      setResolutionSummaryInput(data.resolutionSummary || "");
    } catch (err: any) {
      setErrorCode(err.code || (err.status === 403 ? "FORBIDDEN" : err.status === 404 ? "TICKET_NOT_FOUND" : "ERROR"));
      setErrorMessage(err.message || "Failed to load ticket details.");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  // Fetch staff assignees
  const fetchStaffList = useCallback(async () => {
    try {
      const staff = await getStaffAssigneesApi();
      setStaffList(staff);
    } catch (err) {
      console.warn("Could not load staff assignees:", err);
    }
  }, []);

  // Sticky top offset: stays a few pixels (10px) below the sticky navbar when scrolling down,
  // and smoothly snaps back into its natural grid place when scrolled back up.
  const [stickyTopOffset, setStickyTopOffset] = useState<string>("calc(var(--zen-header-height, 58px) + 10px)");

  useEffect(() => {
    fetchTicket();
    fetchStaffList();
  }, [fetchTicket, fetchStaffList]);

  useEffect(() => {
    const updateOffset = () => {
      if (typeof window === "undefined" || window.innerWidth < 992) {
        setStickyTopOffset("auto");
        return;
      }
      const header = document.querySelector(".zen-header");
      if (header) {
        const headerHeight = header.getBoundingClientRect().height;
        if (headerHeight > 0) {
          // Exactly 10px below the bottom of the navbar
          setStickyTopOffset(`${headerHeight + 10}px`);
        }
      }
    };

    updateOffset();
    window.addEventListener("resize", updateOffset);
    return () => window.removeEventListener("resize", updateOffset);
  }, []);

  // Quick Claim Ticket
  const handleClaimTicket = async () => {
    if (!ticket || !auth?.user) return;
    setIsUpdating(true);
    setUpdateSuccessMessage(null);
    setConcurrencyConflict(false);

    try {
      const updated = await updateTicketOperationalApi(ticket.id, {
        ownerId: auth.user.id,
        version: ticket.version,
      });
      setTicket((prev) => {
        if (!prev) return prev;
        const newOwner = staffList.find((s) => s.id === auth.user!.id) || {
          id: auth.user!.id,
          displayName: auth.user!.displayName,
          email: auth.user!.email,
          role: auth.user!.role,
        };
        return {
          ...prev,
          ownerId: updated.ownerId,
          version: updated.version,
          updatedAt: updated.updatedAt,
          owner: newOwner,
        };
      });
      setSelectedOwnerId(String(auth.user.id));
      setUpdateSuccessMessage(`Ticket claimed successfully by ${auth.user.displayName}.`);
    } catch (err: any) {
      if (err.status === 409 || err.code === "CONFLICT") {
        setConcurrencyConflict(true);
        setTimeout(() => fetchTicket(), 1500);
      } else {
        setErrorMessage(err.message || "Failed to claim ticket.");
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Save Operational Controls (Owner, IT Priority, Status, Resolution Summary)
  const handleSaveOperational = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;

    setResolutionError(null);
    setUpdateSuccessMessage(null);
    setConcurrencyConflict(false);

    const isMovingToResolvedOrClosed = selectedStatus === "RESOLVED" || selectedStatus === "CLOSED";
    if (isMovingToResolvedOrClosed) {
      const trimmed = resolutionSummaryInput.trim();
      if (trimmed.length < 10 || trimmed.length > 2000) {
        setResolutionError("Resolution summary is required and must be between 10 and 2000 characters.");
        return;
      }
    }

    setIsUpdating(true);
    try {
      const payload: {
        ownerId?: number | null;
        itPriority?: string;
        status?: string;
        resolutionSummary?: string;
        version: number;
      } = {
        ownerId: selectedOwnerId ? parseInt(selectedOwnerId, 10) : null,
        itPriority: selectedItPriority,
        version: ticket.version,
      };

      if (selectedStatus !== ticket.status) {
        payload.status = selectedStatus;
      }

      if (isMovingToResolvedOrClosed || (resolutionSummaryInput.trim() && resolutionSummaryInput.trim() !== ticket.resolutionSummary)) {
        payload.resolutionSummary = resolutionSummaryInput.trim();
      }

      const updated = await updateTicketOperationalApi(ticket.id, payload);
      setTicket((prev) => {
        if (!prev) return prev;
        const newOwner = updated.ownerId ? staffList.find((s) => s.id === updated.ownerId) || prev.owner : null;
        return {
          ...prev,
          ownerId: updated.ownerId,
          itPriority: updated.itPriority,
          status: updated.status,
          resolutionSummary: updated.resolutionSummary,
          version: updated.version,
          updatedAt: updated.updatedAt,
          owner: newOwner,
        };
      });
      setSelectedOwnerId(updated.ownerId ? String(updated.ownerId) : "");
      setSelectedItPriority(updated.itPriority);
      setSelectedStatus(updated.status);
      setResolutionSummaryInput(updated.resolutionSummary || "");
      setUpdateSuccessMessage("Ticket operations updated successfully.");
    } catch (err: any) {
      if (err.status === 409 || err.code === "CONFLICT") {
        setConcurrencyConflict(true);
        setTimeout(() => fetchTicket(), 1500);
      } else {
        setErrorMessage(err.message || "Failed to update ticket.");
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Post Public Comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;
    const trimmed = newComment.trim();
    if (!trimmed) {
      setCommentError("Comment content cannot be empty or whitespace-only.");
      return;
    }
    if (trimmed.length > 2000) {
      setCommentError("Comment content cannot exceed 2000 characters.");
      return;
    }

    setCommentSubmitting(true);
    setCommentError(null);
    try {
      const posted = await postCommentApi(ticket.id, trimmed);
      setNewComment("");
      setTicket((prev) => {
        if (!prev) return prev;
        const currentComments = prev.comments || [];
        return {
          ...prev,
          comments: [...currentComments, posted],
        };
      });
    } catch (err: any) {
      setCommentError(err.message || "Failed to post comment.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  // Post Internal Note
  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;
    const trimmed = newNote.trim();
    if (!trimmed) {
      setNoteError("Internal note content cannot be empty or whitespace-only.");
      return;
    }
    if (trimmed.length > 2000) {
      setNoteError("Internal note content cannot exceed 2000 characters.");
      return;
    }

    setNoteSubmitting(true);
    setNoteError(null);
    try {
      const posted = await postNoteApi(ticket.id, trimmed);
      setNewNote("");
      setTicket((prev) => {
        if (!prev) return prev;
        const currentNotes = prev.notes || [];
        return {
          ...prev,
          notes: [...currentNotes, posted],
        };
      });
    } catch (err: any) {
      setNoteError(err.message || "Failed to add internal note.");
    } finally {
      setNoteSubmitting(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="container py-4" style={{ maxWidth: 1280 }}>
        <div className="d-flex align-items-center mb-4">
          <button type="button" className="btn btn-zen-secondary btn-sm" onClick={onBack}>
            &larr; Back to Ticket Queue
          </button>
        </div>
        <div className="card border-0 shadow-sm p-5 text-center bg-white">
          <div className="spinner-border text-success mx-auto mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted mb-0">Loading IT Staff Ticket Detail...</p>
        </div>
      </div>
    );
  }

  // Error / 403 Forbidden State
  if (errorCode === "FORBIDDEN") {
    return (
      <div className="container py-4" style={{ maxWidth: 1280 }}>
        <div className="d-flex align-items-center mb-4">
          <button type="button" className="btn btn-zen-secondary btn-sm" onClick={onBack}>
            &larr; Back to Ticket Queue
          </button>
        </div>
        <div className="alert alert-danger shadow-sm p-4 text-center bg-white border border-danger-subtle rounded-3">
          <span className="fs-1 text-danger mb-2 d-block">🔒</span>
          <h4 className="fw-semibold text-danger mb-2">Access Forbidden</h4>
          <p className="text-muted mb-4">You do not have permission to access or operate on this ticket.</p>
          <button type="button" className="btn btn-zen-primary" onClick={onBack}>
            Back to Ticket Queue
          </button>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="container py-4" style={{ maxWidth: 1280 }}>
        <div className="d-flex align-items-center mb-4">
          <button type="button" className="btn btn-zen-secondary btn-sm" onClick={onBack}>
            &larr; Back to Ticket Queue
          </button>
        </div>
        <div className="alert alert-warning shadow-sm p-4 text-center bg-white border border-warning-subtle rounded-3">
          <span className="fs-1 text-warning mb-2 d-block">🔍</span>
          <h4 className="fw-semibold text-dark mb-2">Ticket Not Found</h4>
          <p className="text-muted mb-4">{errorMessage || "The requested ticket does not exist."}</p>
          <button type="button" className="btn btn-zen-primary" onClick={onBack}>
            Back to Ticket Queue
          </button>
        </div>
      </div>
    );
  }

  const allowedTransitions = TRANSITION_MAP[ticket.status] || [];
  const publicComments = ticket.comments || [];
  const internalNotes = ticket.notes || [];
  const isTicketClosed = ticket.status === "CLOSED";
  const isTargetResolvedOrClosed = selectedStatus === "RESOLVED" || selectedStatus === "CLOSED";

  return (
    <div className="container py-4" style={{ maxWidth: 1280 }} data-testid="staff-ticket-detail-view">
      {/* Breadcrumb & Navigation */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item">
              <button
                type="button"
                className="btn btn-link p-0 text-decoration-none text-muted small"
                onClick={onBack}
              >
                Ticket Queue
              </button>
            </li>
            <li className="breadcrumb-item active small" aria-current="page">
              {ticket.ticketNo}
            </li>
          </ol>
        </nav>
        <button type="button" className="btn btn-zen-secondary btn-sm" onClick={onBack}>
          &larr; Back to Ticket Queue
        </button>
      </div>

      {/* Concurrency Conflict Banner */}
      {concurrencyConflict && (
        <div className="alert alert-danger d-flex align-items-center mb-4 shadow-sm" role="alert">
          <span className="me-2 fs-5">⚠️</span>
          <div>
            <strong>Concurrency Conflict:</strong> This ticket was modified by another user. Reloading latest
            version...
          </div>
        </div>
      )}

      {/* Update Success Alert */}
      {updateSuccessMessage && (
        <div className="alert alert-success alert-dismissible fade show mb-4 shadow-sm" role="alert">
          <span>✓ {updateSuccessMessage}</span>
          <button
            type="button"
            className="btn-close"
            onClick={() => setUpdateSuccessMessage(null)}
            aria-label="Close"
          ></button>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="row g-4">
        {/* Left Column: Ticket Core Information, Tabs (Comments, Notes, Attachments) */}
        <div className="col-12 col-lg-8">
          {/* Ticket Header & Core Details Card */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body p-4">
              {/* Requester Resolution Confirmed Indicator */}
              {ticket.requesterResolutionConfirmedAt && (
                <div className="zen-resolved-indication-banner mb-3" data-testid="requester-resolved-indication">
                  <span className="fs-5">✓</span>
                  <div>
                    <strong>Requester Confirmation:</strong> The requester indicated this problem appears resolved on{" "}
                    {formatDate(ticket.requesterResolutionConfirmedAt)}.
                  </div>
                </div>
              )}

              <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                    <h3 className="fw-bold mb-0" style={{ color: "var(--color-primary-green)" }}>
                      {ticket.ticketNo}
                    </h3>
                    <span className={`badge ${getStatusBadgeClass(ticket.status)}`} data-testid="ticket-status-badge">
                      {ticket.status}
                    </span>
                    <span
                      className={`badge ${getPriorityBadgeClass(ticket.itPriority)}`}
                      data-testid="it-priority-badge"
                    >
                      IT Priority: {ticket.itPriority}
                    </span>
                    <span className="badge bg-light text-muted border">
                      Requester Priority: {ticket.requestedPriority}
                    </span>
                  </div>
                  <h4 className="fw-semibold text-dark mb-1">{ticket.summary}</h4>
                </div>

                <div className="text-sm-end text-muted small">
                  <div>Created: {formatDate(ticket.createdAt)}</div>
                  <div>Last Updated: {formatDate(ticket.updatedAt)}</div>
                  <div className="text-muted opacity-75">Version: #{ticket.version}</div>
                </div>
              </div>

              <hr className="my-3 text-muted opacity-25" />

              {/* Requester, Category, System Details */}
              <div className="row g-3 small mb-4">
                <div className="col-sm-6 col-md-4">
                  <span className="text-muted fw-medium d-block">Requester</span>
                  <span className="text-dark fw-semibold">
                    {ticket.requester.displayName} ({ticket.requester.email})
                  </span>
                </div>
                <div className="col-sm-6 col-md-4">
                  <span className="text-muted fw-medium d-block">Category</span>
                  <span className="badge bg-light text-dark border">{ticket.category.name}</span>
                </div>
                <div className="col-sm-6 col-md-4">
                  <span className="text-muted fw-medium d-block">Related System</span>
                  <span className="badge bg-light text-dark border">{ticket.relatedSystem.name}</span>
                </div>
              </div>

              {/* Original Description */}
              <div className="mb-3">
                <h6 className="fw-bold text-muted text-uppercase small mb-2">Original Description</h6>
                <div
                  className="p-3 bg-light rounded text-dark border"
                  style={{ minHeight: "80px", whiteSpace: "pre-wrap", lineHeight: 1.6 }}
                >
                  {ticket.description}
                </div>
              </div>

              {/* Recorded Resolution Summary Card (if any) */}
              {ticket.resolutionSummary && (
                <div className="mt-3 p-3 bg-success-subtle border border-success-subtle rounded">
                  <h6 className="fw-bold text-success text-uppercase small mb-1">Recorded Resolution Summary</h6>
                  <p className="mb-0 text-dark small" style={{ whiteSpace: "pre-wrap" }}>
                    {ticket.resolutionSummary}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Segregated Communication & Attachment Tabs */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white border-bottom-0 pb-0 pt-3 px-4">
              <div className="zen-detail-tabs mb-0" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "comments"}
                  className={`zen-detail-tab-btn ${activeTab === "comments" ? "active" : ""}`}
                  onClick={() => setActiveTab("comments")}
                  data-testid="tab-comments"
                >
                  <span>💬 Public Comments</span>
                  <span className="badge bg-light text-dark border">{publicComments.length}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "notes"}
                  className={`zen-detail-tab-btn tab-notes ${activeTab === "notes" ? "active" : ""}`}
                  onClick={() => setActiveTab("notes")}
                  data-testid="tab-notes"
                >
                  <span>🔒 Internal Notes</span>
                  <span className="badge bg-warning-subtle text-dark border border-warning-subtle">
                    {internalNotes.length}
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "attachments"}
                  className={`zen-detail-tab-btn ${activeTab === "attachments" ? "active" : ""}`}
                  onClick={() => setActiveTab("attachments")}
                  data-testid="tab-attachments"
                >
                  <span>📎 Attachments</span>
                  <span className="badge bg-light text-dark border">{ticket.attachments?.length || 0}</span>
                </button>
              </div>
            </div>

            <div className="card-body p-4">
              {/* TAB 1: Public Comments */}
              {activeTab === "comments" && (
                <div data-testid="public-comments-section">
                  <div className="mb-3 d-flex justify-content-between align-items-center">
                    <h6 className="fw-bold text-dark mb-0">Public Comments Thread</h6>
                    <span className="text-muted small">Visible to Requester and IT Staff</span>
                  </div>

                  {/* Thread list */}
                  {publicComments.length === 0 ? (
                    <div className="text-center py-4 text-muted bg-light rounded border mb-4 small">
                      No public comments posted yet.
                    </div>
                  ) : (
                    <div className="comments-list mb-4">
                      {publicComments.map((c) => (
                        <div key={c.id} className="zen-comment-item" data-testid="public-comment-item">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <div className="d-flex align-items-center gap-2">
                              <span className="fw-semibold text-dark small">{c.author?.displayName}</span>
                              <span className={`badge ${getRoleBadgeClass(c.author?.role)}`}>
                                {c.author?.role === "IT_STAFF" ? "IT Staff" : c.author?.role === "ADMINISTRATOR" ? "Admin" : "Requester"}
                              </span>
                            </div>
                            <span className="text-muted small">{formatDate(c.createdAt)}</span>
                          </div>
                          <div className="text-dark small" style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                            {c.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Public Comment Form */}
                  <form onSubmit={handlePostComment} className="border-top pt-3">
                    <label htmlFor="new-comment-input" className="form-label fw-semibold small text-dark">
                      Add Public Comment
                    </label>
                    <textarea
                      id="new-comment-input"
                      className={`form-control ${commentError ? "is-invalid" : ""}`}
                      rows={3}
                      placeholder="Type a comment to communicate with the requester... (1-2000 characters)"
                      value={newComment}
                      onChange={(e) => {
                        setNewComment(e.target.value);
                        if (commentError) setCommentError(null);
                      }}
                      disabled={commentSubmitting}
                      maxLength={2000}
                    />
                    <div className="d-flex justify-content-between align-items-center mt-2">
                      <span className="text-muted small">{newComment.length} / 2000 characters</span>
                      <button
                        type="submit"
                        className="btn btn-zen-primary btn-sm"
                        disabled={commentSubmitting || !newComment.trim()}
                      >
                        {commentSubmitting ? "Posting..." : "Post Public Comment"}
                      </button>
                    </div>
                    {commentError && <div className="zen-field-error mt-2">{commentError}</div>}
                  </form>
                </div>
              )}

              {/* TAB 2: Internal Notes (Confidential) */}
              {activeTab === "notes" && (
                <div data-testid="internal-notes-section">
                  {/* Confidential Amber Banner */}
                  <div className="zen-confidential-banner" data-testid="internal-notes-confidential-banner">
                    <span className="fs-5">🔒</span>
                    <div>
                      <strong>Strictly Confidential:</strong> Internal Notes are only visible to IT Staff and
                      Administrators. They are never exposed to Requesters.
                    </div>
                  </div>

                  {/* Notes list */}
                  {internalNotes.length === 0 ? (
                    <div className="text-center py-4 text-muted bg-light rounded border mb-4 small">
                      No internal notes recorded yet.
                    </div>
                  ) : (
                    <div className="notes-list mb-4">
                      {internalNotes.map((n) => (
                        <div key={n.id} className="zen-note-item" data-testid="internal-note-item">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <div className="d-flex align-items-center gap-2">
                              <span className="fw-semibold text-dark small">{n.author?.displayName}</span>
                              <span className={`badge ${getRoleBadgeClass(n.author?.role)}`}>
                                {n.author?.role === "ADMINISTRATOR" ? "Admin" : "IT Staff"}
                              </span>
                              <span className="badge bg-warning text-dark small">🔒 Internal</span>
                            </div>
                            <span className="text-muted small">{formatDate(n.createdAt)}</span>
                          </div>
                          <div className="text-dark small" style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                            {n.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Internal Note Form */}
                  <form onSubmit={handlePostNote} className="border-top pt-3">
                    <label htmlFor="new-note-input" className="form-label fw-semibold small text-dark">
                      Add Confidential Internal Note
                    </label>
                    <textarea
                      id="new-note-input"
                      className={`form-control border-warning ${noteError ? "is-invalid" : ""}`}
                      style={{ backgroundColor: "#fffdf5" }}
                      rows={3}
                      placeholder="Record diagnostic findings, internal escalation notes, vendor tickets... (1-2000 characters)"
                      value={newNote}
                      onChange={(e) => {
                        setNewNote(e.target.value);
                        if (noteError) setNoteError(null);
                      }}
                      disabled={noteSubmitting}
                      maxLength={2000}
                    />
                    <div className="d-flex justify-content-between align-items-center mt-2">
                      <span className="text-muted small">{newNote.length} / 2000 characters</span>
                      <button
                        type="submit"
                        className="btn btn-warning text-dark fw-semibold btn-sm"
                        disabled={noteSubmitting || !newNote.trim()}
                      >
                        {noteSubmitting ? "Saving..." : "Add Internal Note"}
                      </button>
                    </div>
                    {noteError && <div className="zen-field-error mt-2">{noteError}</div>}
                  </form>
                </div>
              )}

              {/* TAB 3: Attachments (Preserved from Lab 2) */}
              {activeTab === "attachments" && (
                <div data-testid="attachments-section">
                  <AttachmentSection
                    ticketId={ticket.id}
                    attachments={ticket.attachments || []}
                    onAttachmentChanged={fetchTicket}
                    isClosed={isTicketClosed}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Operational Controls Sidebar (~35% width) */}
        <div className="col-12 col-lg-4">
          <div className="zen-operational-card p-4 sticky-top" style={{ top: stickyTopOffset }}>
            <h5 className="fw-bold mb-3" style={{ color: "var(--color-primary-green)" }}>
              Ticket Operations
            </h5>

            <form onSubmit={handleSaveOperational}>
              {/* 1. Ticket Ownership & Claim Action */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label htmlFor="owner-select" className="form-label fw-semibold small mb-0">
                    Assignee / Owner
                  </label>
                  {auth?.user && ticket.owner?.id !== auth.user.id && (
                    <button
                      type="button"
                      className="btn btn-claim-ticket"
                      onClick={handleClaimTicket}
                      disabled={isUpdating}
                      data-testid="claim-ticket-button"
                    >
                      [ Claim Ticket ]
                    </button>
                  )}
                </div>
                <select
                  id="owner-select"
                  className="form-select form-select-sm"
                  value={selectedOwnerId}
                  onChange={(e) => setSelectedOwnerId(e.target.value)}
                  disabled={isUpdating}
                  data-testid="ticket-owner-select"
                >
                  <option value="">(Unassigned)</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.displayName} ({s.role === "ADMINISTRATOR" ? "Admin" : "IT Staff"})
                    </option>
                  ))}
                </select>
                <div className="form-text small text-muted">
                  Current: {ticket.owner ? ticket.owner.displayName : "Unassigned"}
                </div>
              </div>

              {/* 2. IT Priority (Independent of Requester Priority) */}
              <div className="mb-3">
                <label htmlFor="it-priority-select" className="form-label fw-semibold small mb-1">
                  IT Priority
                </label>
                <select
                  id="it-priority-select"
                  className="form-select form-select-sm"
                  value={selectedItPriority}
                  onChange={(e) => setSelectedItPriority(e.target.value)}
                  disabled={isUpdating}
                  data-testid="it-priority-select"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
                <div className="form-text small text-muted">
                  Requester requested: <strong>{ticket.requestedPriority}</strong>
                </div>
              </div>

              {/* 3. Status Transition State Machine */}
              <div className="mb-3">
                <label htmlFor="status-select" className="form-label fw-semibold small mb-1">
                  Status Transition
                </label>
                <select
                  id="status-select"
                  className="form-select form-select-sm"
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    if (resolutionError) setResolutionError(null);
                  }}
                  disabled={isUpdating}
                  data-testid="status-transition-select"
                >
                  <option value={ticket.status}>{ticket.status} (Current)</option>
                  {allowedTransitions.map((nextStatus) => (
                    <option key={nextStatus} value={nextStatus}>
                      &rarr; Transition to {nextStatus}
                    </option>
                  ))}
                </select>
                {allowedTransitions.length === 0 && (
                  <div className="form-text small text-muted">
                    No further transitions available from {ticket.status}.
                  </div>
                )}
              </div>

              {/* 4. Mandatory Resolution Summary when target is RESOLVED or CLOSED */}
              {isTargetResolvedOrClosed && (
                <div className="mb-3 p-3 bg-light rounded border" data-testid="resolution-summary-container">
                  <label htmlFor="resolution-summary-input" className="form-label fw-semibold small text-danger mb-1">
                    * Resolution Summary (Required for {selectedStatus})
                  </label>
                  <textarea
                    id="resolution-summary-input"
                    className={`form-control form-control-sm ${resolutionError ? "is-invalid" : ""}`}
                    rows={4}
                    placeholder="Describe how the problem was resolved or reason for closing (10-2000 characters)..."
                    value={resolutionSummaryInput}
                    onChange={(e) => {
                      setResolutionSummaryInput(e.target.value);
                      if (resolutionError) setResolutionError(null);
                    }}
                    maxLength={2000}
                    disabled={isUpdating}
                    data-testid="resolution-summary-input"
                  />
                  <div className="d-flex justify-content-between align-items-center mt-1">
                    <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                      Min 10 chars ({resolutionSummaryInput.trim().length}/2000)
                    </span>
                  </div>
                  {resolutionError && (
                    <div className="zen-field-error mt-1" data-testid="resolution-summary-error">
                      {resolutionError}
                    </div>
                  )}
                </div>
              )}

              {/* Save Button */}
              <div className="d-grid mt-4">
                <button
                  type="submit"
                  className="btn btn-zen-primary btn-sm py-2"
                  disabled={isUpdating}
                  data-testid="save-operations-button"
                >
                  {isUpdating ? "Saving Changes..." : "Save Operations"}
                </button>
              </div>
            </form>

            <hr className="my-3 text-muted opacity-25" />

            {/* Quick Metadata Summary */}
            <div className="small text-muted">
              <div className="mb-1">
                <strong>Ticket ID:</strong> #{ticket.id}
              </div>
              <div className="mb-1">
                <strong>Optimistic Version:</strong> {ticket.version}
              </div>
              <div>
                <strong>Active Attachments:</strong> {ticket.attachments?.filter((a: any) => !a.deletedAt).length || 0} / 5
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
