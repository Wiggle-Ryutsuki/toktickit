import React, { useState, useEffect, useCallback, useContext } from "react";
import { useRequester } from "../context/RequesterContext.js";
import { AuthContext } from "../context/AuthContext.js";
import AttachmentSection, { AttachmentDto } from "./AttachmentSection.js";

export interface RequesterTicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

export interface TicketDetailDto {
  id: number;
  ticketNo: string;
  summary: string;
  description: string;
  status: string;
  requestedPriority: string;
  itPriority: string;
  ticketOwner: string | null;
  resolutionSummary: string | null;
  requesterResolutionConfirmedAt: string | null;
  comments?: any[];
  requester: {
    id: number;
    displayName: string;
    email: string;
  };
  category: {
    id: number;
    name: string;
    code?: string;
  };
  relatedSystem: {
    id: number;
    name: string;
  };
  attachments: AttachmentDto[];
  createdAt: string;
  updatedAt: string;
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

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
    case "URGENT":
    case "CRITICAL":
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

export default function RequesterTicketDetail({ ticketId, onBack }: RequesterTicketDetailProps) {
  const { selectedRequester } = useRequester();
  const auth = useContext(AuthContext);
  const isStaffOrAdmin = auth?.user?.role === "IT_STAFF" || auth?.user?.role === "ADMINISTRATOR";

  const [ticket, setTicket] = useState<TicketDetailDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Requester resolution indication state
  const [indicatingResolution, setIndicatingResolution] = useState<boolean>(false);
  const [resolveSuccessMessage, setResolveSuccessMessage] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  // Public comments state
  const [newComment, setNewComment] = useState<string>("");
  const [commentSubmitting, setCommentSubmitting] = useState<boolean>(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const fetchTicket = useCallback(async () => {
    setLoading(true);
    setErrorCode(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
        credentials: "include",
        headers: {
          "X-Requester-Id": selectedRequester ? String(selectedRequester.id) : "1",
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorCode(data.error?.code ?? (res.status === 403 ? "FORBIDDEN" : res.status === 404 ? "TICKET_NOT_FOUND" : "ERROR"));
        setErrorMessage(data.error?.message ?? (res.status === 403 ? "You do not have permission to view this ticket." : "Ticket not found."));
        return;
      }

      setTicket(data);
    } catch (err) {
      setErrorCode("FETCH_FAILED");
      setErrorMessage(err instanceof Error ? err.message : "Failed to load ticket details.");
    } finally {
      setLoading(false);
    }
  }, [ticketId, selectedRequester?.id]);

  const handleIndicateResolved = async () => {
    if (!ticket) return;
    setIndicatingResolution(true);
    setResolveError(null);
    setResolveSuccessMessage(null);

    try {
      const res = await fetch(`${API_URL}/api/v1/tickets/${ticket.id}/resolve-indication`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to submit resolution indication.");
      }
      setTicket((prev) => (prev ? { ...prev, requesterResolutionConfirmedAt: data.requesterResolutionConfirmedAt } : prev));
      setResolveSuccessMessage("Thank you! Your indication that the problem appears resolved has been recorded for IT Staff.");
    } catch (err: any) {
      setResolveError(err.message || "Failed to submit resolution indication.");
    } finally {
      setIndicatingResolution(false);
    }
  };

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
      const res = await fetch(`${API_URL}/api/v1/tickets/${ticket.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to post comment.");
      }
      setNewComment("");
      setTicket((prev) => {
        if (!prev) return prev;
        const current = prev.comments || [];
        return { ...prev, comments: [...current, data] };
      });
    } catch (err: any) {
      setCommentError(err.message || "Failed to post comment.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  // Loading Skeleton
  if (loading) {
    return (
      <div className="container py-4" style={{ maxWidth: 1140 }}>
        <div className="d-flex align-items-center mb-4">
          <button
            type="button"
            className="btn btn-zen-secondary btn-sm"
            onClick={onBack}
          >
            &larr; {isStaffOrAdmin ? "Back to Ticket Queue" : "Back to My Tickets"}
          </button>
        </div>
        <div className="card border-0 shadow-sm p-5 text-center bg-white">
          <div className="spinner-border text-success mx-auto mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted mb-0">Loading ticket details...</p>
        </div>
      </div>
    );
  }

  // 403 Forbidden State
  if (errorCode === "FORBIDDEN") {
    return (
      <div className="container py-4" style={{ maxWidth: 1140 }}>
        <div className="d-flex align-items-center mb-4">
          <button
            type="button"
            className="btn btn-zen-secondary btn-sm"
            onClick={onBack}
          >
            &larr; {isStaffOrAdmin ? "Back to Ticket Queue" : "Back to My Tickets"}
          </button>
        </div>
        <div className="alert alert-danger shadow-sm p-4 text-center bg-white border border-danger-subtle rounded-3">
          <span className="fs-1 text-danger mb-2 d-block">🔒</span>
          <h4 className="fw-semibold text-danger mb-2">
            You do not have permission to view this ticket.
          </h4>
          <p className="text-muted mb-4">
            This ticket belongs to another requester and cannot be accessed.
          </p>
          <button type="button" className="btn btn-zen-primary" onClick={onBack}>
            {isStaffOrAdmin ? "Back to Ticket Queue" : "Back to My Tickets"}
          </button>
        </div>
      </div>
    );
  }

  // 404 Not Found State
  if (errorCode === "TICKET_NOT_FOUND" || (!ticket && !loading)) {
    return (
      <div className="container py-4" style={{ maxWidth: 1140 }}>
        <div className="d-flex align-items-center mb-4">
          <button
            type="button"
            className="btn btn-zen-secondary btn-sm"
            onClick={onBack}
          >
            &larr; {isStaffOrAdmin ? "Back to Ticket Queue" : "Back to My Tickets"}
          </button>
        </div>
        <div className="alert alert-warning shadow-sm p-4 text-center bg-white border border-warning-subtle rounded-3">
          <span className="fs-1 text-warning mb-2 d-block">🔍</span>
          <h4 className="fw-semibold text-dark mb-2">Record Not Found</h4>
          <p className="text-muted mb-4">
            {errorMessage || "Ticket not found."}
          </p>
          <button type="button" className="btn btn-zen-primary" onClick={onBack}>
            {isStaffOrAdmin ? "Back to Ticket Queue" : "Back to My Tickets"}
          </button>
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div className="container py-4" style={{ maxWidth: 1140 }}>
      {/* Navigation & Breadcrumbs */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item">
              <button
                type="button"
                className="btn btn-link p-0 text-decoration-none text-muted small"
                onClick={onBack}
              >
                {isStaffOrAdmin ? "Ticket Queue" : "My Tickets"}
              </button>
            </li>
            <li className="breadcrumb-item active small" aria-current="page">
              Ticket Details
            </li>
          </ol>
        </nav>
        <button
          type="button"
          className="btn btn-zen-secondary btn-sm"
          onClick={onBack}
        >
          &larr; {isStaffOrAdmin ? "Back to Ticket Queue" : "Back to My Tickets"}
        </button>
      </div>

      {/* Ticket Header Card */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          {/* Requester Resolution Confirmation Banner / Action */}
          {ticket.requesterResolutionConfirmedAt ? (
            <div className="zen-resolved-indication-banner mb-3" data-testid="requester-resolved-indication">
              <span className="fs-5">✓</span>
              <div>
                <strong>Problem Appears Resolved:</strong> You confirmed that this problem appears resolved on{" "}
                {formatDate(ticket.requesterResolutionConfirmedAt)}.
              </div>
            </div>
          ) : ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" ? (
            <div className="alert alert-light border d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 py-2 px-3">
              <div className="small text-muted">
                <span className="me-2">💡</span>
                Has your problem been solved? Let IT Staff know that you are satisfied:
              </div>
              <button
                type="button"
                className="btn btn-outline-success btn-sm fw-semibold"
                onClick={handleIndicateResolved}
                disabled={indicatingResolution}
                data-testid="problem-appears-resolved-btn"
              >
                {indicatingResolution ? "Submitting..." : "✓ Problem Appears Resolved"}
              </button>
            </div>
          ) : null}

          {resolveSuccessMessage && (
            <div className="alert alert-success alert-dismissible fade show mb-3 small" role="alert">
              <span>{resolveSuccessMessage}</span>
              <button
                type="button"
                className="btn-close"
                onClick={() => setResolveSuccessMessage(null)}
                aria-label="Close"
              ></button>
            </div>
          )}

          {resolveError && (
            <div className="alert alert-danger alert-dismissible fade show mb-3 small" role="alert">
              <span>{resolveError}</span>
              <button
                type="button"
                className="btn-close"
                onClick={() => setResolveError(null)}
                aria-label="Close"
              ></button>
            </div>
          )}

          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
            <div>
              <div className="d-flex align-items-center gap-2 mb-2">
                <h3 className="fw-bold mb-0" style={{ color: "var(--color-primary-green)" }}>
                  {ticket.ticketNo}
                </h3>
                <span className={`badge ${getStatusBadgeClass(ticket.status)}`}>
                  {ticket.status}
                </span>
                <span className={`badge ${getPriorityBadgeClass(ticket.requestedPriority)}`}>
                  {ticket.requestedPriority} Priority
                </span>
              </div>
              <h4 className="fw-semibold text-dark mb-1">{ticket.summary}</h4>
            </div>

            <div className="text-sm-end text-muted small">
              <div>Created: {formatDate(ticket.createdAt)}</div>
              <div>Last Updated: {formatDate(ticket.updatedAt)}</div>
            </div>
          </div>

          <hr className="my-3 text-muted opacity-25" />

          {/* Classification & Metadata Two-Column Grid */}
          <div className="row g-4">
            <div className="col-12 col-lg-6">
              <div className="bg-light p-3 rounded h-100">
                <h6 className="fw-bold text-muted text-uppercase small mb-3">Requester & System Information</h6>
                <div className="row g-2 small">
                  <div className="col-sm-4 text-muted fw-medium">Requester:</div>
                  <div className="col-sm-8 text-dark fw-semibold">
                    {ticket.requester.displayName} ({ticket.requester.email})
                  </div>

                  <div className="col-sm-4 text-muted fw-medium">Category:</div>
                  <div className="col-sm-8 text-dark">
                    <span className="badge bg-light text-dark border me-1">
                      {ticket.category.name}
                    </span>
                  </div>

                  <div className="col-sm-4 text-muted fw-medium">Related System:</div>
                  <div className="col-sm-8 text-dark">
                    <span className="badge bg-light text-dark border">
                      {ticket.relatedSystem.name}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <div className="bg-light p-3 rounded h-100">
                <h6 className="fw-bold text-muted text-uppercase small mb-3">Assignment & Resolution</h6>
                <div className="row g-2 small">
                  <div className="col-sm-4 text-muted fw-medium">IT Priority:</div>
                  <div className="col-sm-8 text-dark">
                    <span className={`badge ${getPriorityBadgeClass(ticket.itPriority)}`}>
                      {ticket.itPriority}
                    </span>
                  </div>

                  <div className="col-sm-4 text-muted fw-medium">Ticket Owner:</div>
                  <div className="col-sm-8 text-dark">
                    {ticket.ticketOwner ?? "—"}
                  </div>

                  <div className="col-sm-4 text-muted fw-medium">Resolution:</div>
                  <div className="col-sm-8 text-muted fst-italic">
                    {ticket.resolutionSummary ?? "No resolution recorded yet"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Full Description Section */}
          <div className="mt-4">
            <h6 className="fw-bold text-muted text-uppercase small mb-2">Description</h6>
            <div
              className="p-3 bg-white rounded border text-dark"
              style={{ minHeight: "90px", whiteSpace: "pre-wrap", lineHeight: 1.6 }}
            >
              {ticket.description}
            </div>
          </div>
        </div>
      </div>

      {/* Attachments Section */}
      <AttachmentSection
        ticketId={ticket.id}
        attachments={ticket.attachments}
        onAttachmentChanged={fetchTicket}
        isClosed={ticket.status === "CLOSED"}
      />

      {/* Public Comments Communication Thread */}
      <div className="card border-0 shadow-sm mb-4" data-testid="requester-comments-card">
        <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
          <h5 className="fw-bold mb-0 text-dark small text-uppercase">
            💬 Public Comments ({(ticket.comments || []).length})
          </h5>
          <span className="text-muted small">Communicate directly with IT Staff handling your ticket</span>
        </div>

        <div className="card-body p-4">
          {(!ticket.comments || ticket.comments.length === 0) ? (
            <div className="text-center py-4 text-muted bg-light rounded border mb-4 small">
              No public comments posted yet. Add a comment below if you have additional information.
            </div>
          ) : (
            <div className="comments-list mb-4">
              {ticket.comments.map((c: any) => (
                <div key={c.id} className="zen-comment-item" data-testid="public-comment-item">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="d-flex align-items-center gap-2">
                      <span className="fw-semibold text-dark small">{c.author?.displayName}</span>
                      <span
                        className={`badge ${
                          c.author?.role === "IT_STAFF"
                            ? "badge-role-staff"
                            : c.author?.role === "ADMINISTRATOR"
                            ? "badge-role-admin"
                            : "badge-role-requester"
                        }`}
                      >
                        {c.author?.role === "IT_STAFF"
                          ? "IT Staff"
                          : c.author?.role === "ADMINISTRATOR"
                          ? "Admin"
                          : "Requester"}
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
            <label htmlFor="requester-comment-input" className="form-label fw-semibold small text-dark">
              Add Public Comment
            </label>
            <textarea
              id="requester-comment-input"
              className={`form-control ${commentError ? "is-invalid" : ""}`}
              rows={3}
              placeholder="Type your message to IT Staff... (1-2000 characters)"
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
      </div>
    </div>
  );
}
