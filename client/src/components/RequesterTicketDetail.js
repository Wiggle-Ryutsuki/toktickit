import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useContext } from "react";
import { useRequester } from "../context/RequesterContext.js";
import { AuthContext } from "../context/AuthContext.js";
import AttachmentSection from "./AttachmentSection.js";
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
function formatDate(isoString) {
    if (!isoString)
        return "—";
    try {
        const d = new Date(isoString);
        return d.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }
    catch {
        return isoString;
    }
}
function getStatusBadgeClass(status) {
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
function getPriorityBadgeClass(priority) {
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
export default function RequesterTicketDetail({ ticketId, onBack }) {
    const { selectedRequester } = useRequester();
    const auth = useContext(AuthContext);
    const isStaffOrAdmin = auth?.user?.role === "IT_STAFF" || auth?.user?.role === "ADMINISTRATOR";
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorCode, setErrorCode] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    // Requester resolution indication state
    const [indicatingResolution, setIndicatingResolution] = useState(false);
    const [resolveSuccessMessage, setResolveSuccessMessage] = useState(null);
    const [resolveError, setResolveError] = useState(null);
    // Public comments state
    const [newComment, setNewComment] = useState("");
    const [commentSubmitting, setCommentSubmitting] = useState(false);
    const [commentError, setCommentError] = useState(null);
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
        }
        catch (err) {
            setErrorCode("FETCH_FAILED");
            setErrorMessage(err instanceof Error ? err.message : "Failed to load ticket details.");
        }
        finally {
            setLoading(false);
        }
    }, [ticketId, selectedRequester?.id]);
    const handleIndicateResolved = async () => {
        if (!ticket)
            return;
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
        }
        catch (err) {
            setResolveError(err.message || "Failed to submit resolution indication.");
        }
        finally {
            setIndicatingResolution(false);
        }
    };
    const handlePostComment = async (e) => {
        e.preventDefault();
        if (!ticket)
            return;
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
                if (!prev)
                    return prev;
                const current = prev.comments || [];
                return { ...prev, comments: [...current, data] };
            });
        }
        catch (err) {
            setCommentError(err.message || "Failed to post comment.");
        }
        finally {
            setCommentSubmitting(false);
        }
    };
    useEffect(() => {
        fetchTicket();
    }, [fetchTicket]);
    // Loading Skeleton
    if (loading) {
        return (_jsxs("div", { className: "container py-4", style: { maxWidth: 1140 }, children: [_jsx("div", { className: "d-flex align-items-center mb-4", children: _jsxs("button", { type: "button", className: "btn btn-zen-secondary btn-sm", onClick: onBack, children: ["\u2190 ", isStaffOrAdmin ? "Back to Ticket Queue" : "Back to My Tickets"] }) }), _jsxs("div", { className: "card border-0 shadow-sm p-5 text-center bg-white", children: [_jsx("div", { className: "spinner-border text-success mx-auto mb-3", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Loading..." }) }), _jsx("p", { className: "text-muted mb-0", children: "Loading ticket details..." })] })] }));
    }
    // 403 Forbidden State
    if (errorCode === "FORBIDDEN") {
        return (_jsxs("div", { className: "container py-4", style: { maxWidth: 1140 }, children: [_jsx("div", { className: "d-flex align-items-center mb-4", children: _jsxs("button", { type: "button", className: "btn btn-zen-secondary btn-sm", onClick: onBack, children: ["\u2190 ", isStaffOrAdmin ? "Back to Ticket Queue" : "Back to My Tickets"] }) }), _jsxs("div", { className: "alert alert-danger shadow-sm p-4 text-center bg-white border border-danger-subtle rounded-3", children: [_jsx("span", { className: "fs-1 text-danger mb-2 d-block", children: "\uD83D\uDD12" }), _jsx("h4", { className: "fw-semibold text-danger mb-2", children: "You do not have permission to view this ticket." }), _jsx("p", { className: "text-muted mb-4", children: "This ticket belongs to another requester and cannot be accessed." }), _jsx("button", { type: "button", className: "btn btn-zen-primary", onClick: onBack, children: isStaffOrAdmin ? "Back to Ticket Queue" : "Back to My Tickets" })] })] }));
    }
    // 404 Not Found State
    if (errorCode === "TICKET_NOT_FOUND" || (!ticket && !loading)) {
        return (_jsxs("div", { className: "container py-4", style: { maxWidth: 1140 }, children: [_jsx("div", { className: "d-flex align-items-center mb-4", children: _jsxs("button", { type: "button", className: "btn btn-zen-secondary btn-sm", onClick: onBack, children: ["\u2190 ", isStaffOrAdmin ? "Back to Ticket Queue" : "Back to My Tickets"] }) }), _jsxs("div", { className: "alert alert-warning shadow-sm p-4 text-center bg-white border border-warning-subtle rounded-3", children: [_jsx("span", { className: "fs-1 text-warning mb-2 d-block", children: "\uD83D\uDD0D" }), _jsx("h4", { className: "fw-semibold text-dark mb-2", children: "Record Not Found" }), _jsx("p", { className: "text-muted mb-4", children: errorMessage || "Ticket not found." }), _jsx("button", { type: "button", className: "btn btn-zen-primary", onClick: onBack, children: isStaffOrAdmin ? "Back to Ticket Queue" : "Back to My Tickets" })] })] }));
    }
    if (!ticket)
        return null;
    return (_jsxs("div", { className: "container py-4", style: { maxWidth: 1140 }, children: [_jsxs("div", { className: "d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2", children: [_jsx("nav", { "aria-label": "breadcrumb", children: _jsxs("ol", { className: "breadcrumb mb-0", children: [_jsx("li", { className: "breadcrumb-item", children: _jsx("button", { type: "button", className: "btn btn-link p-0 text-decoration-none text-muted small", onClick: onBack, children: isStaffOrAdmin ? "Ticket Queue" : "My Tickets" }) }), _jsx("li", { className: "breadcrumb-item active small", "aria-current": "page", children: "Ticket Details" })] }) }), _jsxs("button", { type: "button", className: "btn btn-zen-secondary btn-sm", onClick: onBack, children: ["\u2190 ", isStaffOrAdmin ? "Back to Ticket Queue" : "Back to My Tickets"] })] }), _jsx("div", { className: "card border-0 shadow-sm mb-4", children: _jsxs("div", { className: "card-body p-4", children: [ticket.requesterResolutionConfirmedAt ? (_jsxs("div", { className: "zen-resolved-indication-banner mb-3", "data-testid": "requester-resolved-indication", children: [_jsx("span", { className: "fs-5", children: "\u2713" }), _jsxs("div", { children: [_jsx("strong", { children: "Problem Appears Resolved:" }), " You confirmed that this problem appears resolved on", " ", formatDate(ticket.requesterResolutionConfirmedAt), "."] })] })) : ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" ? (_jsxs("div", { className: "alert alert-light border d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 py-2 px-3", children: [_jsxs("div", { className: "small text-muted", children: [_jsx("span", { className: "me-2", children: "\uD83D\uDCA1" }), "Has your problem been solved? Let IT Staff know that you are satisfied:"] }), _jsx("button", { type: "button", className: "btn btn-outline-success btn-sm fw-semibold", onClick: handleIndicateResolved, disabled: indicatingResolution, "data-testid": "problem-appears-resolved-btn", children: indicatingResolution ? "Submitting..." : "✓ Problem Appears Resolved" })] })) : null, resolveSuccessMessage && (_jsxs("div", { className: "alert alert-success alert-dismissible fade show mb-3 small", role: "alert", children: [_jsx("span", { children: resolveSuccessMessage }), _jsx("button", { type: "button", className: "btn-close", onClick: () => setResolveSuccessMessage(null), "aria-label": "Close" })] })), resolveError && (_jsxs("div", { className: "alert alert-danger alert-dismissible fade show mb-3 small", role: "alert", children: [_jsx("span", { children: resolveError }), _jsx("button", { type: "button", className: "btn-close", onClick: () => setResolveError(null), "aria-label": "Close" })] })), _jsxs("div", { className: "d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3", children: [_jsxs("div", { children: [_jsxs("div", { className: "d-flex align-items-center gap-2 mb-2", children: [_jsx("h3", { className: "fw-bold mb-0", style: { color: "var(--color-primary-green)" }, children: ticket.ticketNo }), _jsx("span", { className: `badge ${getStatusBadgeClass(ticket.status)}`, children: ticket.status }), _jsxs("span", { className: `badge ${getPriorityBadgeClass(ticket.requestedPriority)}`, children: [ticket.requestedPriority, " Priority"] })] }), _jsx("h4", { className: "fw-semibold text-dark mb-1", children: ticket.summary })] }), _jsxs("div", { className: "text-sm-end text-muted small", children: [_jsxs("div", { children: ["Created: ", formatDate(ticket.createdAt)] }), _jsxs("div", { children: ["Last Updated: ", formatDate(ticket.updatedAt)] })] })] }), _jsx("hr", { className: "my-3 text-muted opacity-25" }), _jsxs("div", { className: "row g-4", children: [_jsx("div", { className: "col-12 col-lg-6", children: _jsxs("div", { className: "bg-light p-3 rounded h-100", children: [_jsx("h6", { className: "fw-bold text-muted text-uppercase small mb-3", children: "Requester & System Information" }), _jsxs("div", { className: "row g-2 small", children: [_jsx("div", { className: "col-sm-4 text-muted fw-medium", children: "Requester:" }), _jsxs("div", { className: "col-sm-8 text-dark fw-semibold", children: [ticket.requester.displayName, " (", ticket.requester.email, ")"] }), _jsx("div", { className: "col-sm-4 text-muted fw-medium", children: "Category:" }), _jsx("div", { className: "col-sm-8 text-dark", children: _jsx("span", { className: "badge bg-light text-dark border me-1", children: ticket.category.name }) }), _jsx("div", { className: "col-sm-4 text-muted fw-medium", children: "Related System:" }), _jsx("div", { className: "col-sm-8 text-dark", children: _jsx("span", { className: "badge bg-light text-dark border", children: ticket.relatedSystem.name }) })] })] }) }), _jsx("div", { className: "col-12 col-lg-6", children: _jsxs("div", { className: "bg-light p-3 rounded h-100", children: [_jsx("h6", { className: "fw-bold text-muted text-uppercase small mb-3", children: "Assignment & Resolution" }), _jsxs("div", { className: "row g-2 small", children: [_jsx("div", { className: "col-sm-4 text-muted fw-medium", children: "IT Priority:" }), _jsx("div", { className: "col-sm-8 text-dark", children: _jsx("span", { className: `badge ${getPriorityBadgeClass(ticket.itPriority)}`, children: ticket.itPriority }) }), _jsx("div", { className: "col-sm-4 text-muted fw-medium", children: "Ticket Owner:" }), _jsx("div", { className: "col-sm-8 text-dark", children: ticket.ticketOwner ?? "—" }), _jsx("div", { className: "col-sm-4 text-muted fw-medium", children: "Resolution:" }), _jsx("div", { className: "col-sm-8 text-muted fst-italic", children: ticket.resolutionSummary ?? "No resolution recorded yet" })] })] }) })] }), _jsxs("div", { className: "mt-4", children: [_jsx("h6", { className: "fw-bold text-muted text-uppercase small mb-2", children: "Description" }), _jsx("div", { className: "p-3 bg-white rounded border text-dark", style: { minHeight: "90px", whiteSpace: "pre-wrap", lineHeight: 1.6 }, children: ticket.description })] })] }) }), _jsx(AttachmentSection, { ticketId: ticket.id, attachments: ticket.attachments, onAttachmentChanged: fetchTicket, isClosed: ticket.status === "CLOSED" }), _jsxs("div", { className: "card border-0 shadow-sm mb-4", "data-testid": "requester-comments-card", children: [_jsxs("div", { className: "card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center", children: [_jsxs("h5", { className: "fw-bold mb-0 text-dark small text-uppercase", children: ["\uD83D\uDCAC Public Comments (", (ticket.comments || []).length, ")"] }), _jsx("span", { className: "text-muted small", children: "Communicate directly with IT Staff handling your ticket" })] }), _jsxs("div", { className: "card-body p-4", children: [(!ticket.comments || ticket.comments.length === 0) ? (_jsx("div", { className: "text-center py-4 text-muted bg-light rounded border mb-4 small", children: "No public comments posted yet. Add a comment below if you have additional information." })) : (_jsx("div", { className: "comments-list mb-4", children: ticket.comments.map((c) => (_jsxs("div", { className: "zen-comment-item", "data-testid": "public-comment-item", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-2", children: [_jsxs("div", { className: "d-flex align-items-center gap-2", children: [_jsx("span", { className: "fw-semibold text-dark small", children: c.author?.displayName }), _jsx("span", { className: `badge ${c.author?.role === "IT_STAFF"
                                                                ? "badge-role-staff"
                                                                : c.author?.role === "ADMINISTRATOR"
                                                                    ? "badge-role-admin"
                                                                    : "badge-role-requester"}`, children: c.author?.role === "IT_STAFF"
                                                                ? "IT Staff"
                                                                : c.author?.role === "ADMINISTRATOR"
                                                                    ? "Admin"
                                                                    : "Requester" })] }), _jsx("span", { className: "text-muted small", children: formatDate(c.createdAt) })] }), _jsx("div", { className: "text-dark small", style: { whiteSpace: "pre-wrap", lineHeight: 1.5 }, children: c.content })] }, c.id))) })), _jsxs("form", { onSubmit: handlePostComment, className: "border-top pt-3", children: [_jsx("label", { htmlFor: "requester-comment-input", className: "form-label fw-semibold small text-dark", children: "Add Public Comment" }), _jsx("textarea", { id: "requester-comment-input", className: `form-control ${commentError ? "is-invalid" : ""}`, rows: 3, placeholder: "Type your message to IT Staff... (1-2000 characters)", value: newComment, onChange: (e) => {
                                            setNewComment(e.target.value);
                                            if (commentError)
                                                setCommentError(null);
                                        }, disabled: commentSubmitting, maxLength: 2000 }), _jsxs("div", { className: "d-flex justify-content-between align-items-center mt-2", children: [_jsxs("span", { className: "text-muted small", children: [newComment.length, " / 2000 characters"] }), _jsx("button", { type: "submit", className: "btn btn-zen-primary btn-sm", disabled: commentSubmitting || !newComment.trim(), children: commentSubmitting ? "Posting..." : "Post Public Comment" })] }), commentError && _jsx("div", { className: "zen-field-error mt-2", children: commentError })] })] })] })] }));
}
