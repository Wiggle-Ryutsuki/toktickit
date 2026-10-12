import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useContext } from "react";
import { AuthContext } from "../context/AuthContext.js";
import { useRequester } from "../context/RequesterContext.js";
import { getRequesterDashboardApi, } from "../api.js";
export default function RequesterDashboard({ onNavigate, onViewDetail }) {
    const auth = useContext(AuthContext);
    const { selectedRequester } = useRequester();
    const [metrics, setMetrics] = useState(null);
    const [recentTickets, setRecentTickets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const activeUser = auth?.user || selectedRequester;
    const fetchDashboardData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getRequesterDashboardApi();
            setMetrics(data.metrics);
            setRecentTickets(data.recentTickets || []);
        }
        catch (err) {
            console.error("Failed to load requester dashboard metrics:", err);
            setError(err instanceof Error ? err.message : "Failed to load dashboard metrics. Please try again.");
        }
        finally {
            setIsLoading(false);
        }
    }, []);
    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);
    const navigateToTickets = (statusFilter) => {
        if (statusFilter) {
            const newUrl = `${window.location.pathname}?status=${statusFilter}#/my-tickets?status=${statusFilter}`;
            window.history.pushState(null, "", newUrl);
        }
        else {
            window.history.pushState(null, "", `${window.location.pathname}#/my-tickets`);
        }
        if (onNavigate) {
            onNavigate("tickets");
        }
        else {
            window.location.href = statusFilter ? `/tickets?status=${statusFilter}` : `/tickets`;
        }
    };
    const getStatusBadge = (statusStr) => {
        switch (statusStr) {
            case "NEW":
                return { label: "● New", className: "badge-status-new" };
            case "ASSIGNED":
                return { label: "● Assigned", className: "badge-status-assigned" };
            case "IN_PROGRESS":
                return { label: "● In Progress", className: "badge-status-in-progress" };
            case "PENDING_REQUESTER":
                return { label: "● Waiting on You", className: "badge-status-pending-requester" };
            case "RESOLVED":
                return { label: "✓ Resolved", className: "badge-status-resolved" };
            case "CLOSED":
                return { label: "— Closed", className: "badge-status-closed" };
            case "CANCELLED":
                return { label: "× Cancelled", className: "badge-status-cancelled" };
            default:
                return { label: statusStr, className: "badge bg-secondary" };
        }
    };
    const formatDate = (iso) => {
        try {
            const d = new Date(iso);
            return d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            });
        }
        catch {
            return iso;
        }
    };
    // Loading skeleton
    if (isLoading) {
        return (_jsxs("div", { className: "container py-4", style: { maxWidth: 1280 }, "data-testid": "requester-dashboard-loading", children: [_jsxs("div", { className: "mb-4", children: [_jsx("div", { className: "placeholder-glow", children: _jsx("span", { className: "placeholder col-6", style: { height: "28px" } }) }), _jsx("div", { className: "placeholder-glow", children: _jsx("span", { className: "placeholder col-4", style: { height: "16px" } }) })] }), _jsx("div", { className: "row g-3 mb-4", children: [1, 2, 3, 4].map((i) => (_jsx("div", { className: "col-12 col-sm-6 col-md-3", children: _jsxs("div", { className: "card p-3 shadow-sm placeholder-glow", style: { minHeight: "110px", borderRadius: "10px" }, children: [_jsx("span", { className: "placeholder col-7 mb-2" }), _jsx("span", { className: "placeholder col-4 mb-2", style: { height: "30px" } }), _jsx("span", { className: "placeholder col-5" })] }) }, i))) })] }));
    }
    // Error state
    if (error && !metrics) {
        return (_jsx("div", { className: "container py-4", style: { maxWidth: 1280 }, children: _jsxs("div", { className: "alert alert-danger d-flex justify-content-between align-items-center", role: "alert", "data-testid": "requester-dashboard-error", children: [_jsxs("div", { children: [_jsx("strong", { children: "Error:" }), " ", error] }), _jsx("button", { type: "button", className: "btn btn-sm btn-outline-danger", onClick: fetchDashboardData, children: "Try Again" })] }) }));
    }
    return (_jsxs("div", { className: "container py-4", style: { maxWidth: 1280 }, children: [_jsxs("div", { className: "mb-4", children: [_jsxs("h1", { className: "h3 fw-bold mb-1", style: { color: "var(--color-text-primary, #1A2E24)" }, "data-testid": "requester-dashboard-welcome", children: ["Welcome, ", activeUser?.displayName || "Requester", "!"] }), _jsx("p", { className: "text-muted mb-0 small", children: "Here's the latest on your requests." })] }), _jsxs("div", { className: "row g-3 mb-4", children: [_jsx("div", { className: "col-12 col-sm-6 col-md-3", children: _jsxs("div", { className: "card h-100 p-3 shadow-sm", style: {
                                borderRadius: "10px",
                                border: "1px solid var(--color-border-subtle, #DDE5E1)",
                            }, "data-testid": "metric-card-my-open", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-1", children: [_jsx("span", { className: "text-muted small fw-semibold", children: "My Open Tickets" }), _jsx("span", { className: "badge rounded-pill bg-light text-success border", children: "\uD83D\uDCC2" })] }), _jsx("div", { className: "fs-2 fw-bold mb-2", style: { color: "var(--color-text-primary, #1A2E24)" }, "data-testid": "metric-count-my-open", children: metrics?.myOpenTickets ?? 0 }), _jsx("div", { children: _jsx("a", { href: "#/my-tickets", className: "text-decoration-none small fw-semibold", style: { color: "var(--color-secondary-green, #0B7A46)" }, onClick: (e) => {
                                            e.preventDefault();
                                            navigateToTickets();
                                        }, "data-testid": "drill-down-link-my-open", children: "[View all]" }) })] }) }), _jsx("div", { className: "col-12 col-sm-6 col-md-3", children: _jsxs("div", { className: "card h-100 p-3 shadow-sm", style: {
                                borderRadius: "10px",
                                border: "1px solid var(--color-border-subtle, #DDE5E1)",
                            }, "data-testid": "metric-card-in-progress", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-1", children: [_jsx("span", { className: "text-muted small fw-semibold", children: "In Progress" }), _jsx("span", { className: "badge rounded-pill bg-light text-info border", children: "\u26A1" })] }), _jsx("div", { className: "fs-2 fw-bold mb-2", style: { color: "var(--color-text-primary, #1A2E24)" }, "data-testid": "metric-count-in-progress", children: metrics?.inProgress ?? 0 }), _jsx("div", { children: _jsx("a", { href: "#/my-tickets?status=IN_PROGRESS", className: "text-decoration-none small fw-semibold", style: { color: "var(--color-secondary-green, #0B7A46)" }, onClick: (e) => {
                                            e.preventDefault();
                                            navigateToTickets("IN_PROGRESS");
                                        }, "data-testid": "drill-down-link-in-progress", children: "[View all]" }) })] }) }), _jsx("div", { className: "col-12 col-sm-6 col-md-3", children: _jsxs("div", { className: "card h-100 p-3 shadow-sm", style: {
                                borderRadius: "10px",
                                border: "1px solid var(--color-border-subtle, #DDE5E1)",
                            }, "data-testid": "metric-card-resolved", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-1", children: [_jsx("span", { className: "text-muted small fw-semibold", children: "Resolved" }), _jsx("span", { className: "badge rounded-pill bg-light text-success border", children: "\u2713" })] }), _jsx("div", { className: "fs-2 fw-bold mb-2", style: { color: "var(--color-text-primary, #1A2E24)" }, "data-testid": "metric-count-resolved", children: metrics?.resolved ?? 0 }), _jsx("div", { children: _jsx("a", { href: "#/my-tickets?status=RESOLVED", className: "text-decoration-none small fw-semibold", style: { color: "var(--color-secondary-green, #0B7A46)" }, onClick: (e) => {
                                            e.preventDefault();
                                            navigateToTickets("RESOLVED");
                                        }, "data-testid": "drill-down-link-resolved", children: "[View all]" }) })] }) }), _jsx("div", { className: "col-12 col-sm-6 col-md-3", children: _jsxs("div", { className: "card h-100 p-3 shadow-sm", style: {
                                borderRadius: "10px",
                                border: "1px solid var(--color-border-subtle, #DDE5E1)",
                            }, "data-testid": "metric-card-closed", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-1", children: [_jsx("span", { className: "text-muted small fw-semibold", children: "Closed" }), _jsx("span", { className: "badge rounded-pill bg-light text-secondary border", children: "\u2014" })] }), _jsx("div", { className: "fs-2 fw-bold mb-2", style: { color: "var(--color-text-primary, #1A2E24)" }, "data-testid": "metric-count-closed", children: metrics?.closed ?? 0 }), _jsx("div", { children: _jsx("a", { href: "#/my-tickets?status=CLOSED", className: "text-decoration-none small fw-semibold", style: { color: "var(--color-secondary-green, #0B7A46)" }, onClick: (e) => {
                                            e.preventDefault();
                                            navigateToTickets("CLOSED");
                                        }, "data-testid": "drill-down-link-closed", children: "[View all]" }) })] }) })] }), _jsxs("div", { className: "row g-4", children: [_jsx("div", { className: "col-12 col-lg-8", children: _jsxs("div", { className: "card h-100 shadow-sm", style: {
                                borderRadius: "10px",
                                border: "1px solid var(--color-border-subtle, #DDE5E1)",
                                backgroundColor: "var(--color-surface, #ffffff)",
                            }, children: [_jsxs("div", { className: "card-header bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom", children: [_jsx("h2", { className: "h5 fw-bold mb-0", style: { color: "var(--color-text-primary, #1A2E24)" }, children: "My Recent Tickets" }), recentTickets.length > 0 && (_jsx("a", { href: "#/my-tickets", className: "text-decoration-none small fw-semibold", style: { color: "var(--color-secondary-green, #0B7A46)" }, onClick: (e) => {
                                                e.preventDefault();
                                                navigateToTickets();
                                            }, "data-testid": "view-all-tickets-link", children: "View all \u2192" }))] }), _jsx("div", { className: "card-body p-0", children: recentTickets.length === 0 ? (
                                    /* Dedicated Empty State (AC-02, FR-51) */
                                    _jsxs("div", { className: "p-5 text-center", "data-testid": "requester-tickets-empty", children: [_jsx("div", { className: "fs-1 mb-2", children: "\uD83D\uDCCB" }), _jsx("h3", { className: "h6 fw-semibold text-muted mb-3", children: "You have not submitted any tickets yet." }), _jsx("button", { type: "button", className: "btn btn-zen-primary", onClick: () => onNavigate?.("create-ticket"), "data-testid": "create-first-ticket-btn", children: "+ Create Your First Ticket" })] })) : (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover align-middle mb-0", "data-testid": "requester-recent-tickets-table", children: [_jsx("thead", { className: "table-light", children: _jsxs("tr", { children: [_jsx("th", { scope: "col", className: "ps-4", children: "Ticket No" }), _jsx("th", { scope: "col", children: "Summary" }), _jsx("th", { scope: "col", children: "Status" }), _jsx("th", { scope: "col", className: "pe-4", children: "Date" })] }) }), _jsx("tbody", { children: recentTickets.map((ticket) => {
                                                        const statusBadge = getStatusBadge(ticket.status);
                                                        return (_jsxs("tr", { className: "cursor-pointer", onClick: () => onViewDetail?.(ticket.id), "data-testid": `requester-recent-ticket-${ticket.id}`, children: [_jsx("td", { className: "ps-4 fw-bold font-monospace small", style: { color: "var(--color-primary-green, #006B3C)" }, children: ticket.ticketNo }), _jsx("td", { children: _jsx("div", { className: "fw-semibold text-truncate", style: { maxWidth: "260px" }, title: ticket.title, children: ticket.title }) }), _jsx("td", { children: _jsx("span", { className: `badge ${statusBadge.className}`, children: statusBadge.label }) }), _jsx("td", { className: "pe-4 small text-muted", children: formatDate(ticket.createdAt) })] }, ticket.id));
                                                    }) })] }) })) })] }) }), _jsx("div", { className: "col-12 col-lg-4", children: _jsxs("div", { className: "card shadow-sm", style: {
                                borderRadius: "10px",
                                border: "1px solid var(--color-border-subtle, #DDE5E1)",
                                backgroundColor: "var(--color-surface, #ffffff)",
                            }, children: [_jsx("div", { className: "card-header bg-white py-3 px-4 border-bottom", children: _jsx("h2", { className: "h5 fw-bold mb-0", style: { color: "var(--color-text-primary, #1A2E24)" }, children: "Quick Actions" }) }), _jsxs("div", { className: "card-body p-4 d-flex flex-column gap-3", children: [_jsxs("button", { type: "button", className: "btn btn-zen-primary w-100 text-start p-3", onClick: () => onNavigate?.("create-ticket"), "data-testid": "requester-quick-action-create", children: [_jsx("div", { className: "fw-bold fs-6 mb-1", children: "+ Create Ticket" }), _jsx("div", { className: "small text-white-50", children: "Submit a new request" })] }), _jsxs("button", { type: "button", className: "btn btn-outline-success w-100 text-start p-3", style: {
                                                borderColor: "var(--color-border-subtle, #DDE5E1)",
                                                color: "var(--color-text-primary, #1A2E24)",
                                                backgroundColor: "var(--color-surface, #ffffff)",
                                            }, onClick: () => navigateToTickets(), "data-testid": "requester-quick-action-my-tickets", children: [_jsx("div", { className: "fw-bold fs-6 mb-1", children: "\uD83D\uDCC2 View My Tickets" }), _jsx("div", { className: "small text-muted", children: "Track existing requests" })] })] })] }) })] })] }));
}
