import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useContext } from "react";
import { AuthContext } from "../context/AuthContext.js";
import AttachmentSection from "./AttachmentSection.js";
import { getTicketDetailApi, getStaffAssigneesApi, updateTicketOperationalApi, postCommentApi, postNoteApi, } from "../api.js";
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
function getRoleBadgeClass(role) {
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
const TRANSITION_MAP = {
    NEW: ["ASSIGNED", "IN_PROGRESS", "CANCELLED"],
    ASSIGNED: ["IN_PROGRESS", "PENDING_REQUESTER", "CANCELLED"],
    IN_PROGRESS: ["PENDING_REQUESTER", "RESOLVED", "CANCELLED"],
    PENDING_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
    RESOLVED: ["CLOSED", "IN_PROGRESS"],
    CLOSED: ["IN_PROGRESS"],
    CANCELLED: [],
};
export default function StaffTicketDetail({ ticketId, onBack }) {
    const auth = useContext(AuthContext);
    const [ticket, setTicket] = useState(null);
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorCode, setErrorCode] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    // Operational form state
    const [selectedOwnerId, setSelectedOwnerId] = useState("");
    const [selectedItPriority, setSelectedItPriority] = useState("LOW");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [resolutionSummaryInput, setResolutionSummaryInput] = useState("");
    const [resolutionError, setResolutionError] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateSuccessMessage, setUpdateSuccessMessage] = useState(null);
    const [concurrencyConflict, setConcurrencyConflict] = useState(false);
    // Active tab state: 'comments' | 'notes' | 'attachments'
    const [activeTab, setActiveTab] = useState("comments");
    // Comment submission state
    const [newComment, setNewComment] = useState("");
    const [commentSubmitting, setCommentSubmitting] = useState(false);
    const [commentError, setCommentError] = useState(null);
    // Note submission state
    const [newNote, setNewNote] = useState("");
    const [noteSubmitting, setNoteSubmitting] = useState(false);
    const [noteError, setNoteError] = useState(null);
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
        }
        catch (err) {
            setErrorCode(err.code || (err.status === 403 ? "FORBIDDEN" : err.status === 404 ? "TICKET_NOT_FOUND" : "ERROR"));
            setErrorMessage(err.message || "Failed to load ticket details.");
        }
        finally {
            setLoading(false);
        }
    }, [ticketId]);
    // Fetch staff assignees
    const fetchStaffList = useCallback(async () => {
        try {
            const staff = await getStaffAssigneesApi();
            setStaffList(staff);
        }
        catch (err) {
            console.warn("Could not load staff assignees:", err);
        }
    }, []);
    // Sticky top offset: stays a few pixels (10px) below the sticky navbar when scrolling down,
    // and smoothly snaps back into its natural grid place when scrolled back up.
    const [stickyTopOffset, setStickyTopOffset] = useState("calc(var(--zen-header-height, 58px) + 10px)");
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
        if (!ticket || !auth?.user)
            return;
        setIsUpdating(true);
        setUpdateSuccessMessage(null);
        setConcurrencyConflict(false);
        try {
            const updated = await updateTicketOperationalApi(ticket.id, {
                ownerId: auth.user.id,
                version: ticket.version,
            });
            setTicket((prev) => {
                if (!prev)
                    return prev;
                const newOwner = staffList.find((s) => s.id === auth.user.id) || {
                    id: auth.user.id,
                    displayName: auth.user.displayName,
                    email: auth.user.email,
                    role: auth.user.role,
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
        }
        catch (err) {
            if (err.status === 409 || err.code === "CONFLICT") {
                setConcurrencyConflict(true);
                setTimeout(() => fetchTicket(), 1500);
            }
            else {
                setErrorMessage(err.message || "Failed to claim ticket.");
            }
        }
        finally {
            setIsUpdating(false);
        }
    };
    // Save Operational Controls (Owner, IT Priority, Status, Resolution Summary)
    const handleSaveOperational = async (e) => {
        e.preventDefault();
        if (!ticket)
            return;
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
            const payload = {
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
                if (!prev)
                    return prev;
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
        }
        catch (err) {
            if (err.status === 409 || err.code === "CONFLICT") {
                setConcurrencyConflict(true);
                setTimeout(() => fetchTicket(), 1500);
            }
            else {
                setErrorMessage(err.message || "Failed to update ticket.");
            }
        }
        finally {
            setIsUpdating(false);
        }
    };
    // Post Public Comment
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
            const posted = await postCommentApi(ticket.id, trimmed);
            setNewComment("");
            setTicket((prev) => {
                if (!prev)
                    return prev;
                const currentComments = prev.comments || [];
                return {
                    ...prev,
                    comments: [...currentComments, posted],
                };
            });
        }
        catch (err) {
            setCommentError(err.message || "Failed to post comment.");
        }
        finally {
            setCommentSubmitting(false);
        }
    };
    // Post Internal Note
    const handlePostNote = async (e) => {
        e.preventDefault();
        if (!ticket)
            return;
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
                if (!prev)
                    return prev;
                const currentNotes = prev.notes || [];
                return {
                    ...prev,
                    notes: [...currentNotes, posted],
                };
            });
        }
        catch (err) {
            setNoteError(err.message || "Failed to add internal note.");
        }
        finally {
            setNoteSubmitting(false);
        }
    };
    // Loading State
    if (loading) {
        return (_jsxs("div", { className: "container py-4", style: { maxWidth: 1280 }, children: [_jsx("div", { className: "d-flex align-items-center mb-4", children: _jsx("button", { type: "button", className: "btn btn-zen-secondary btn-sm", onClick: onBack, children: "\u2190 Back to Ticket Queue" }) }), _jsxs("div", { className: "card border-0 shadow-sm p-5 text-center bg-white", children: [_jsx("div", { className: "spinner-border text-success mx-auto mb-3", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Loading..." }) }), _jsx("p", { className: "text-muted mb-0", children: "Loading IT Staff Ticket Detail..." })] })] }));
    }
    // Error / 403 Forbidden State
    if (errorCode === "FORBIDDEN") {
        return (_jsxs("div", { className: "container py-4", style: { maxWidth: 1280 }, children: [_jsx("div", { className: "d-flex align-items-center mb-4", children: _jsx("button", { type: "button", className: "btn btn-zen-secondary btn-sm", onClick: onBack, children: "\u2190 Back to Ticket Queue" }) }), _jsxs("div", { className: "alert alert-danger shadow-sm p-4 text-center bg-white border border-danger-subtle rounded-3", children: [_jsx("span", { className: "fs-1 text-danger mb-2 d-block", children: "\uD83D\uDD12" }), _jsx("h4", { className: "fw-semibold text-danger mb-2", children: "Access Forbidden" }), _jsx("p", { className: "text-muted mb-4", children: "You do not have permission to access or operate on this ticket." }), _jsx("button", { type: "button", className: "btn btn-zen-primary", onClick: onBack, children: "Back to Ticket Queue" })] })] }));
    }
    if (!ticket) {
        return (_jsxs("div", { className: "container py-4", style: { maxWidth: 1280 }, children: [_jsx("div", { className: "d-flex align-items-center mb-4", children: _jsx("button", { type: "button", className: "btn btn-zen-secondary btn-sm", onClick: onBack, children: "\u2190 Back to Ticket Queue" }) }), _jsxs("div", { className: "alert alert-warning shadow-sm p-4 text-center bg-white border border-warning-subtle rounded-3", children: [_jsx("span", { className: "fs-1 text-warning mb-2 d-block", children: "\uD83D\uDD0D" }), _jsx("h4", { className: "fw-semibold text-dark mb-2", children: "Ticket Not Found" }), _jsx("p", { className: "text-muted mb-4", children: errorMessage || "The requested ticket does not exist." }), _jsx("button", { type: "button", className: "btn btn-zen-primary", onClick: onBack, children: "Back to Ticket Queue" })] })] }));
    }
    const allowedTransitions = TRANSITION_MAP[ticket.status] || [];
    const publicComments = ticket.comments || [];
    const internalNotes = ticket.notes || [];
    const isTicketClosed = ticket.status === "CLOSED";
    const isTargetResolvedOrClosed = selectedStatus === "RESOLVED" || selectedStatus === "CLOSED";
    return (_jsxs("div", { className: "container py-4", style: { maxWidth: 1280 }, "data-testid": "staff-ticket-detail-view", children: [_jsxs("div", { className: "d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2", children: [_jsx("nav", { "aria-label": "breadcrumb", children: _jsxs("ol", { className: "breadcrumb mb-0", children: [_jsx("li", { className: "breadcrumb-item", children: _jsx("button", { type: "button", className: "btn btn-link p-0 text-decoration-none text-muted small", onClick: onBack, children: "Ticket Queue" }) }), _jsx("li", { className: "breadcrumb-item active small", "aria-current": "page", children: ticket.ticketNo })] }) }), _jsx("button", { type: "button", className: "btn btn-zen-secondary btn-sm", onClick: onBack, children: "\u2190 Back to Ticket Queue" })] }), concurrencyConflict && (_jsxs("div", { className: "alert alert-danger d-flex align-items-center mb-4 shadow-sm", role: "alert", children: [_jsx("span", { className: "me-2 fs-5", children: "\u26A0\uFE0F" }), _jsxs("div", { children: [_jsx("strong", { children: "Concurrency Conflict:" }), " This ticket was modified by another user. Reloading latest version..."] })] })), updateSuccessMessage && (_jsxs("div", { className: "alert alert-success alert-dismissible fade show mb-4 shadow-sm", role: "alert", children: [_jsxs("span", { children: ["\u2713 ", updateSuccessMessage] }), _jsx("button", { type: "button", className: "btn-close", onClick: () => setUpdateSuccessMessage(null), "aria-label": "Close" })] })), _jsxs("div", { className: "row g-4", children: [_jsxs("div", { className: "col-12 col-lg-8", children: [_jsx("div", { className: "card border-0 shadow-sm mb-4", children: _jsxs("div", { className: "card-body p-4", children: [ticket.requesterResolutionConfirmedAt && (_jsxs("div", { className: "zen-resolved-indication-banner mb-3", "data-testid": "requester-resolved-indication", children: [_jsx("span", { className: "fs-5", children: "\u2713" }), _jsxs("div", { children: [_jsx("strong", { children: "Requester Confirmation:" }), " The requester indicated this problem appears resolved on", " ", formatDate(ticket.requesterResolutionConfirmedAt), "."] })] })), _jsxs("div", { className: "d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3", children: [_jsxs("div", { children: [_jsxs("div", { className: "d-flex align-items-center gap-2 mb-2 flex-wrap", children: [_jsx("h3", { className: "fw-bold mb-0", style: { color: "var(--color-primary-green)" }, children: ticket.ticketNo }), _jsx("span", { className: `badge ${getStatusBadgeClass(ticket.status)}`, "data-testid": "ticket-status-badge", children: ticket.status }), _jsxs("span", { className: `badge ${getPriorityBadgeClass(ticket.itPriority)}`, "data-testid": "it-priority-badge", children: ["IT Priority: ", ticket.itPriority] }), _jsxs("span", { className: "badge bg-light text-muted border", children: ["Requester Priority: ", ticket.requestedPriority] })] }), _jsx("h4", { className: "fw-semibold text-dark mb-1", children: ticket.summary })] }), _jsxs("div", { className: "text-sm-end text-muted small", children: [_jsxs("div", { children: ["Created: ", formatDate(ticket.createdAt)] }), _jsxs("div", { children: ["Last Updated: ", formatDate(ticket.updatedAt)] }), _jsxs("div", { className: "text-muted opacity-75", children: ["Version: #", ticket.version] })] })] }), _jsx("hr", { className: "my-3 text-muted opacity-25" }), _jsxs("div", { className: "row g-3 small mb-4", children: [_jsxs("div", { className: "col-sm-6 col-md-4", children: [_jsx("span", { className: "text-muted fw-medium d-block", children: "Requester" }), _jsxs("span", { className: "text-dark fw-semibold", children: [ticket.requester.displayName, " (", ticket.requester.email, ")"] })] }), _jsxs("div", { className: "col-sm-6 col-md-4", children: [_jsx("span", { className: "text-muted fw-medium d-block", children: "Category" }), _jsx("span", { className: "badge bg-light text-dark border", children: ticket.category.name })] }), _jsxs("div", { className: "col-sm-6 col-md-4", children: [_jsx("span", { className: "text-muted fw-medium d-block", children: "Related System" }), _jsx("span", { className: "badge bg-light text-dark border", children: ticket.relatedSystem.name })] })] }), _jsxs("div", { className: "mb-3", children: [_jsx("h6", { className: "fw-bold text-muted text-uppercase small mb-2", children: "Original Description" }), _jsx("div", { className: "p-3 bg-light rounded text-dark border", style: { minHeight: "80px", whiteSpace: "pre-wrap", lineHeight: 1.6 }, children: ticket.description })] }), ticket.resolutionSummary && (_jsxs("div", { className: "mt-3 p-3 bg-success-subtle border border-success-subtle rounded", children: [_jsx("h6", { className: "fw-bold text-success text-uppercase small mb-1", children: "Recorded Resolution Summary" }), _jsx("p", { className: "mb-0 text-dark small", style: { whiteSpace: "pre-wrap" }, children: ticket.resolutionSummary })] }))] }) }), _jsxs("div", { className: "card border-0 shadow-sm mb-4", children: [_jsx("div", { className: "card-header bg-white border-bottom-0 pb-0 pt-3 px-4", children: _jsxs("div", { className: "zen-detail-tabs mb-0", role: "tablist", children: [_jsxs("button", { type: "button", role: "tab", "aria-selected": activeTab === "comments", className: `zen-detail-tab-btn ${activeTab === "comments" ? "active" : ""}`, onClick: () => setActiveTab("comments"), "data-testid": "tab-comments", children: [_jsx("span", { children: "\uD83D\uDCAC Public Comments" }), _jsx("span", { className: "badge bg-light text-dark border", children: publicComments.length })] }), _jsxs("button", { type: "button", role: "tab", "aria-selected": activeTab === "notes", className: `zen-detail-tab-btn tab-notes ${activeTab === "notes" ? "active" : ""}`, onClick: () => setActiveTab("notes"), "data-testid": "tab-notes", children: [_jsx("span", { children: "\uD83D\uDD12 Internal Notes" }), _jsx("span", { className: "badge bg-warning-subtle text-dark border border-warning-subtle", children: internalNotes.length })] }), _jsxs("button", { type: "button", role: "tab", "aria-selected": activeTab === "attachments", className: `zen-detail-tab-btn ${activeTab === "attachments" ? "active" : ""}`, onClick: () => setActiveTab("attachments"), "data-testid": "tab-attachments", children: [_jsx("span", { children: "\uD83D\uDCCE Attachments" }), _jsx("span", { className: "badge bg-light text-dark border", children: ticket.attachments?.length || 0 })] })] }) }), _jsxs("div", { className: "card-body p-4", children: [activeTab === "comments" && (_jsxs("div", { "data-testid": "public-comments-section", children: [_jsxs("div", { className: "mb-3 d-flex justify-content-between align-items-center", children: [_jsx("h6", { className: "fw-bold text-dark mb-0", children: "Public Comments Thread" }), _jsx("span", { className: "text-muted small", children: "Visible to Requester and IT Staff" })] }), publicComments.length === 0 ? (_jsx("div", { className: "text-center py-4 text-muted bg-light rounded border mb-4 small", children: "No public comments posted yet." })) : (_jsx("div", { className: "comments-list mb-4", children: publicComments.map((c) => (_jsxs("div", { className: "zen-comment-item", "data-testid": "public-comment-item", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-2", children: [_jsxs("div", { className: "d-flex align-items-center gap-2", children: [_jsx("span", { className: "fw-semibold text-dark small", children: c.author?.displayName }), _jsx("span", { className: `badge ${getRoleBadgeClass(c.author?.role)}`, children: c.author?.role === "IT_STAFF" ? "IT Staff" : c.author?.role === "ADMINISTRATOR" ? "Admin" : "Requester" })] }), _jsx("span", { className: "text-muted small", children: formatDate(c.createdAt) })] }), _jsx("div", { className: "text-dark small", style: { whiteSpace: "pre-wrap", lineHeight: 1.5 }, children: c.content })] }, c.id))) })), _jsxs("form", { onSubmit: handlePostComment, className: "border-top pt-3", children: [_jsx("label", { htmlFor: "new-comment-input", className: "form-label fw-semibold small text-dark", children: "Add Public Comment" }), _jsx("textarea", { id: "new-comment-input", className: `form-control ${commentError ? "is-invalid" : ""}`, rows: 3, placeholder: "Type a comment to communicate with the requester... (1-2000 characters)", value: newComment, onChange: (e) => {
                                                                    setNewComment(e.target.value);
                                                                    if (commentError)
                                                                        setCommentError(null);
                                                                }, disabled: commentSubmitting, maxLength: 2000 }), _jsxs("div", { className: "d-flex justify-content-between align-items-center mt-2", children: [_jsxs("span", { className: "text-muted small", children: [newComment.length, " / 2000 characters"] }), _jsx("button", { type: "submit", className: "btn btn-zen-primary btn-sm", disabled: commentSubmitting || !newComment.trim(), children: commentSubmitting ? "Posting..." : "Post Public Comment" })] }), commentError && _jsx("div", { className: "zen-field-error mt-2", children: commentError })] })] })), activeTab === "notes" && (_jsxs("div", { "data-testid": "internal-notes-section", children: [_jsxs("div", { className: "zen-confidential-banner", "data-testid": "internal-notes-confidential-banner", children: [_jsx("span", { className: "fs-5", children: "\uD83D\uDD12" }), _jsxs("div", { children: [_jsx("strong", { children: "Strictly Confidential:" }), " Internal Notes are only visible to IT Staff and Administrators. They are never exposed to Requesters."] })] }), internalNotes.length === 0 ? (_jsx("div", { className: "text-center py-4 text-muted bg-light rounded border mb-4 small", children: "No internal notes recorded yet." })) : (_jsx("div", { className: "notes-list mb-4", children: internalNotes.map((n) => (_jsxs("div", { className: "zen-note-item", "data-testid": "internal-note-item", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-2", children: [_jsxs("div", { className: "d-flex align-items-center gap-2", children: [_jsx("span", { className: "fw-semibold text-dark small", children: n.author?.displayName }), _jsx("span", { className: `badge ${getRoleBadgeClass(n.author?.role)}`, children: n.author?.role === "IT_STAFF" ? "IT Staff" : "Admin" }), _jsx("span", { className: "badge bg-warning text-dark small", children: "\uD83D\uDD12 Internal" })] }), _jsx("span", { className: "text-muted small", children: formatDate(n.createdAt) })] }), _jsx("div", { className: "text-dark small", style: { whiteSpace: "pre-wrap", lineHeight: 1.5 }, children: n.content })] }, n.id))) })), _jsxs("form", { onSubmit: handlePostNote, className: "border-top pt-3", children: [_jsx("label", { htmlFor: "new-note-input", className: "form-label fw-semibold small text-dark", children: "Add Confidential Internal Note" }), _jsx("textarea", { id: "new-note-input", className: `form-control border-warning ${noteError ? "is-invalid" : ""}`, style: { backgroundColor: "#fffdf5" }, rows: 3, placeholder: "Record diagnostic findings, internal escalation notes, vendor tickets... (1-2000 characters)", value: newNote, onChange: (e) => {
                                                                    setNewNote(e.target.value);
                                                                    if (noteError)
                                                                        setNoteError(null);
                                                                }, disabled: noteSubmitting, maxLength: 2000 }), _jsxs("div", { className: "d-flex justify-content-between align-items-center mt-2", children: [_jsxs("span", { className: "text-muted small", children: [newNote.length, " / 2000 characters"] }), _jsx("button", { type: "submit", className: "btn btn-warning text-dark fw-semibold btn-sm", disabled: noteSubmitting || !newNote.trim(), children: noteSubmitting ? "Saving..." : "Add Internal Note" })] }), noteError && _jsx("div", { className: "zen-field-error mt-2", children: noteError })] })] })), activeTab === "attachments" && (_jsx("div", { "data-testid": "attachments-section", children: _jsx(AttachmentSection, { ticketId: ticket.id, attachments: ticket.attachments || [], onAttachmentChanged: fetchTicket, isClosed: isTicketClosed }) }))] })] })] }), _jsx("div", { className: "col-12 col-lg-4", children: _jsxs("div", { className: "zen-operational-card p-4 sticky-top", style: { top: stickyTopOffset }, children: [_jsx("h5", { className: "fw-bold mb-3", style: { color: "var(--color-primary-green)" }, children: "Ticket Operations" }), _jsxs("form", { onSubmit: handleSaveOperational, children: [_jsxs("div", { className: "mb-3", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-1", children: [_jsx("label", { htmlFor: "owner-select", className: "form-label fw-semibold small mb-0", children: "Assignee / Owner" }), auth?.user && ticket.owner?.id !== auth.user.id && (_jsx("button", { type: "button", className: "btn btn-claim-ticket", onClick: handleClaimTicket, disabled: isUpdating, "data-testid": "claim-ticket-button", children: "[ Claim Ticket ]" }))] }), _jsxs("select", { id: "owner-select", className: "form-select form-select-sm", value: selectedOwnerId, onChange: (e) => setSelectedOwnerId(e.target.value), disabled: isUpdating, "data-testid": "ticket-owner-select", children: [_jsx("option", { value: "", children: "(Unassigned)" }), staffList.map((s) => (_jsxs("option", { value: String(s.id), children: [s.displayName, " (", s.role === "ADMINISTRATOR" ? "Admin" : "IT Staff", ")"] }, s.id)))] }), _jsxs("div", { className: "form-text small text-muted", children: ["Current: ", ticket.owner ? ticket.owner.displayName : "Unassigned"] })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { htmlFor: "it-priority-select", className: "form-label fw-semibold small mb-1", children: "IT Priority" }), _jsxs("select", { id: "it-priority-select", className: "form-select form-select-sm", value: selectedItPriority, onChange: (e) => setSelectedItPriority(e.target.value), disabled: isUpdating, "data-testid": "it-priority-select", children: [_jsx("option", { value: "LOW", children: "LOW" }), _jsx("option", { value: "MEDIUM", children: "MEDIUM" }), _jsx("option", { value: "HIGH", children: "HIGH" }), _jsx("option", { value: "CRITICAL", children: "CRITICAL" })] }), _jsxs("div", { className: "form-text small text-muted", children: ["Requester requested: ", _jsx("strong", { children: ticket.requestedPriority })] })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { htmlFor: "status-select", className: "form-label fw-semibold small mb-1", children: "Status Transition" }), _jsxs("select", { id: "status-select", className: "form-select form-select-sm", value: selectedStatus, onChange: (e) => {
                                                        setSelectedStatus(e.target.value);
                                                        if (resolutionError)
                                                            setResolutionError(null);
                                                    }, disabled: isUpdating, "data-testid": "status-transition-select", children: [_jsxs("option", { value: ticket.status, children: [ticket.status, " (Current)"] }), allowedTransitions.map((nextStatus) => (_jsxs("option", { value: nextStatus, children: ["\u2192 Transition to ", nextStatus] }, nextStatus)))] }), allowedTransitions.length === 0 && (_jsxs("div", { className: "form-text small text-muted", children: ["No further transitions available from ", ticket.status, "."] }))] }), isTargetResolvedOrClosed && (_jsxs("div", { className: "mb-3 p-3 bg-light rounded border", "data-testid": "resolution-summary-container", children: [_jsxs("label", { htmlFor: "resolution-summary-input", className: "form-label fw-semibold small text-danger mb-1", children: ["* Resolution Summary (Required for ", selectedStatus, ")"] }), _jsx("textarea", { id: "resolution-summary-input", className: `form-control form-control-sm ${resolutionError ? "is-invalid" : ""}`, rows: 4, placeholder: "Describe how the problem was resolved or reason for closing (10-2000 characters)...", value: resolutionSummaryInput, onChange: (e) => {
                                                        setResolutionSummaryInput(e.target.value);
                                                        if (resolutionError)
                                                            setResolutionError(null);
                                                    }, maxLength: 2000, disabled: isUpdating, "data-testid": "resolution-summary-input" }), _jsx("div", { className: "d-flex justify-content-between align-items-center mt-1", children: _jsxs("span", { className: "text-muted small", style: { fontSize: "0.75rem" }, children: ["Min 10 chars (", resolutionSummaryInput.trim().length, "/2000)"] }) }), resolutionError && (_jsx("div", { className: "zen-field-error mt-1", "data-testid": "resolution-summary-error", children: resolutionError }))] })), _jsx("div", { className: "d-grid mt-4", children: _jsx("button", { type: "submit", className: "btn btn-zen-primary btn-sm py-2", disabled: isUpdating, "data-testid": "save-operations-button", children: isUpdating ? "Saving Changes..." : "Save Operations" }) })] }), _jsx("hr", { className: "my-3 text-muted opacity-25" }), _jsxs("div", { className: "small text-muted", children: [_jsxs("div", { className: "mb-1", children: [_jsx("strong", { children: "Ticket ID:" }), " #", ticket.id] }), _jsxs("div", { className: "mb-1", children: [_jsx("strong", { children: "Optimistic Version:" }), " ", ticket.version] }), _jsxs("div", { children: [_jsx("strong", { children: "Active Attachments:" }), " ", ticket.attachments?.filter((a) => !a.deletedAt).length || 0, " / 5"] })] })] }) })] })] }));
}
