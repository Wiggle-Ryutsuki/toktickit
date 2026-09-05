import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from "react";
import { useRequester } from "../context/RequesterContext.js";
import AttachmentSection from "./AttachmentSection.js";
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
function formatDate(isoString) {
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
            return "bg-info-subtle text-info-emphasis border border-info-subtle";
        case "ASSIGNED":
        case "IN_PROGRESS":
            return "bg-primary-subtle text-primary-emphasis border border-primary-subtle";
        case "PENDING_REQUESTER":
            return "bg-warning-subtle text-warning-emphasis border border-warning-subtle";
        case "RESOLVED":
            return "bg-success-subtle text-success-emphasis border border-success-subtle";
        case "CLOSED":
            return "bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle";
        case "CANCELLED":
            return "bg-dark-subtle text-dark-emphasis border border-dark-subtle";
        default:
            return "bg-light text-dark border";
    }
}
function getPriorityBadgeClass(priority) {
    switch (priority) {
        case "LOW":
            return "bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle";
        case "MEDIUM":
            return "bg-primary-subtle text-primary-emphasis border border-primary-subtle";
        case "HIGH":
            return "bg-warning-subtle text-warning-emphasis border border-warning-subtle";
        case "URGENT":
            return "bg-danger-subtle text-danger-emphasis border border-danger-subtle";
        default:
            return "bg-light text-dark border";
    }
}
export default function RequesterTicketDetail({ ticketId, onBack }) {
    const { selectedRequester } = useRequester();
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorCode, setErrorCode] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const fetchTicket = useCallback(async () => {
        setLoading(true);
        setErrorCode(null);
        setErrorMessage(null);
        try {
            const res = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
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
    }, [ticketId, selectedRequester]);
    useEffect(() => {
        fetchTicket();
    }, [fetchTicket]);
    // Loading Skeleton
    if (loading) {
        return (_jsxs("div", { className: "container py-4", style: { maxWidth: 1140 }, children: [_jsx("div", { className: "d-flex align-items-center mb-4", children: _jsx("button", { type: "button", className: "btn btn-outline-secondary btn-sm", onClick: onBack, children: "\u2190 Back to My Tickets" }) }), _jsxs("div", { className: "card border-0 shadow-sm p-5 text-center bg-white", children: [_jsx("div", { className: "spinner-border text-success mx-auto mb-3", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Loading..." }) }), _jsx("p", { className: "text-muted mb-0", children: "Loading ticket details..." })] })] }));
    }
    // 403 Forbidden State
    if (errorCode === "FORBIDDEN") {
        return (_jsxs("div", { className: "container py-4", style: { maxWidth: 1140 }, children: [_jsx("div", { className: "d-flex align-items-center mb-4", children: _jsx("button", { type: "button", className: "btn btn-outline-secondary btn-sm", onClick: onBack, children: "\u2190 Back to My Tickets" }) }), _jsxs("div", { className: "alert alert-danger shadow-sm p-4 text-center bg-white border border-danger-subtle rounded-3", children: [_jsx("span", { className: "fs-1 text-danger mb-2 d-block", children: "\uD83D\uDD12" }), _jsx("h4", { className: "fw-semibold text-danger mb-2", children: "You do not have permission to view this ticket." }), _jsx("p", { className: "text-muted mb-4", children: "This ticket belongs to another requester and cannot be accessed." }), _jsx("button", { type: "button", className: "btn btn-zen-primary", onClick: onBack, children: "Back to My Tickets" })] })] }));
    }
    // 404 Not Found State
    if (errorCode === "TICKET_NOT_FOUND" || (!ticket && !loading)) {
        return (_jsxs("div", { className: "container py-4", style: { maxWidth: 1140 }, children: [_jsx("div", { className: "d-flex align-items-center mb-4", children: _jsx("button", { type: "button", className: "btn btn-outline-secondary btn-sm", onClick: onBack, children: "\u2190 Back to My Tickets" }) }), _jsxs("div", { className: "alert alert-warning shadow-sm p-4 text-center bg-white border border-warning-subtle rounded-3", children: [_jsx("span", { className: "fs-1 text-warning mb-2 d-block", children: "\uD83D\uDD0D" }), _jsx("h4", { className: "fw-semibold text-dark mb-2", children: "Record Not Found" }), _jsx("p", { className: "text-muted mb-4", children: errorMessage || "Ticket not found." }), _jsx("button", { type: "button", className: "btn btn-zen-primary", onClick: onBack, children: "Back to My Tickets" })] })] }));
    }
    if (!ticket)
        return null;
    return (_jsxs("div", { className: "container py-4", style: { maxWidth: 1140 }, children: [_jsxs("div", { className: "d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2", children: [_jsx("nav", { "aria-label": "breadcrumb", children: _jsxs("ol", { className: "breadcrumb mb-0", children: [_jsx("li", { className: "breadcrumb-item", children: _jsx("button", { type: "button", className: "btn btn-link p-0 text-decoration-none text-muted small", onClick: onBack, children: "My Tickets" }) }), _jsx("li", { className: "breadcrumb-item active small", "aria-current": "page", children: "Ticket Details" })] }) }), _jsx("button", { type: "button", className: "btn btn-outline-secondary btn-sm", onClick: onBack, children: "\u2190 Back to My Tickets" })] }), _jsx("div", { className: "card border-0 shadow-sm mb-4", children: _jsxs("div", { className: "card-body p-4", children: [_jsxs("div", { className: "d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3", children: [_jsxs("div", { children: [_jsxs("div", { className: "d-flex align-items-center gap-2 mb-2", children: [_jsx("h3", { className: "fw-bold mb-0", style: { color: "var(--color-primary-green)" }, children: ticket.ticketNo }), _jsx("span", { className: `badge ${getStatusBadgeClass(ticket.status)}`, children: ticket.status }), _jsxs("span", { className: `badge ${getPriorityBadgeClass(ticket.requestedPriority)}`, children: [ticket.requestedPriority, " Priority"] })] }), _jsx("h4", { className: "fw-semibold text-dark mb-1", children: ticket.summary })] }), _jsxs("div", { className: "text-sm-end text-muted small", children: [_jsxs("div", { children: ["Created: ", formatDate(ticket.createdAt)] }), _jsxs("div", { children: ["Last Updated: ", formatDate(ticket.updatedAt)] })] })] }), _jsx("hr", { className: "my-3 text-muted opacity-25" }), _jsxs("div", { className: "row g-4", children: [_jsx("div", { className: "col-12 col-lg-6", children: _jsxs("div", { className: "bg-light p-3 rounded h-100", children: [_jsx("h6", { className: "fw-bold text-muted text-uppercase small mb-3", children: "Requester & System Information" }), _jsxs("div", { className: "row g-2 small", children: [_jsx("div", { className: "col-sm-4 text-muted fw-medium", children: "Requester:" }), _jsxs("div", { className: "col-sm-8 text-dark fw-semibold", children: [ticket.requester.displayName, " (", ticket.requester.email, ")"] }), _jsx("div", { className: "col-sm-4 text-muted fw-medium", children: "Category:" }), _jsx("div", { className: "col-sm-8 text-dark", children: _jsx("span", { className: "badge bg-white text-dark border me-1", children: ticket.category.name }) }), _jsx("div", { className: "col-sm-4 text-muted fw-medium", children: "Related System:" }), _jsx("div", { className: "col-sm-8 text-dark", children: _jsx("span", { className: "badge bg-white text-dark border", children: ticket.relatedSystem.name }) })] })] }) }), _jsx("div", { className: "col-12 col-lg-6", children: _jsxs("div", { className: "bg-light p-3 rounded h-100", children: [_jsx("h6", { className: "fw-bold text-muted text-uppercase small mb-3", children: "Assignment & Resolution" }), _jsxs("div", { className: "row g-2 small", children: [_jsx("div", { className: "col-sm-4 text-muted fw-medium", children: "IT Priority:" }), _jsx("div", { className: "col-sm-8 text-dark", children: _jsx("span", { className: `badge ${getPriorityBadgeClass(ticket.itPriority)}`, children: ticket.itPriority }) }), _jsx("div", { className: "col-sm-4 text-muted fw-medium", children: "Ticket Owner:" }), _jsx("div", { className: "col-sm-8 text-dark", children: ticket.ticketOwner ?? "—" }), _jsx("div", { className: "col-sm-4 text-muted fw-medium", children: "Resolution:" }), _jsx("div", { className: "col-sm-8 text-muted fst-italic", children: ticket.resolutionSummary ?? "No resolution recorded yet" })] })] }) })] }), _jsxs("div", { className: "mt-4", children: [_jsx("h6", { className: "fw-bold text-muted text-uppercase small mb-2", children: "Description" }), _jsx("div", { className: "p-3 bg-white rounded border text-dark", style: { minHeight: "90px", whiteSpace: "pre-wrap", lineHeight: 1.6 }, children: ticket.description })] })] }) }), _jsx(AttachmentSection, { ticketId: ticket.id, attachments: ticket.attachments, onAttachmentChanged: fetchTicket, isClosed: ticket.status === "CLOSED" }), _jsxs("div", { className: "card border-0 shadow-sm opacity-75 mb-4", style: { pointerEvents: "none" }, children: [_jsxs("div", { className: "card-header bg-white border-bottom py-2 d-flex justify-content-between align-items-center", children: [_jsxs("ul", { className: "nav nav-tabs card-header-tabs", children: [_jsx("li", { className: "nav-item", children: _jsx("span", { className: "nav-link active fw-semibold small", children: "Public Comments" }) }), _jsx("li", { className: "nav-item", children: _jsx("span", { className: "nav-link text-muted small", children: "Internal Notes" }) }), _jsx("li", { className: "nav-item", children: _jsx("span", { className: "nav-link text-muted small", children: "Activity Log" }) })] }), _jsx("span", { className: "badge bg-secondary-subtle text-secondary small", children: "Available in Lab 3" })] }), _jsx("div", { className: "card-body p-4 text-center text-muted small bg-light", children: "Ticket communication threads, IT internal notes, and event audit logging will become active in Lab 3." })] })] }));
}
