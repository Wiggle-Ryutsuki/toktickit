import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useContext } from "react";
import { AuthContext } from "../context/AuthContext.js";
import { getStaffDashboardApi, } from "../api.js";
export default function StaffDashboard({ onNavigate, onViewDetail }) {
    const auth = useContext(AuthContext);
    const [metrics, setMetrics] = useState(null);
    const [recentTickets, setRecentTickets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const fetchDashboardData = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setIsRefreshing(true);
        }
        else {
            setIsLoading(true);
        }
        setError(null);
        try {
            const data = await getStaffDashboardApi();
            setMetrics(data.metrics);
            setRecentTickets(data.recentTickets || []);
        }
        catch (err) {
            console.error("Failed to fetch staff dashboard metrics:", err);
            setError(err instanceof Error ? err.message : "Failed to load dashboard data. Please try again.");
        }
        finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);
    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);
    const navigateToQueue = (params) => {
        const searchParams = new URLSearchParams(params).toString();
        const newUrl = `${window.location.pathname}?${searchParams}#/queue?${searchParams}`;
        window.history.pushState(null, "", newUrl);
        if (onNavigate) {
            onNavigate("queue");
        }
        else {
            window.location.href = `/queue?${searchParams}`;
        }
    };
    const formatDelta = (delta) => {
        if (delta > 0)
            return `+${delta} from yesterday`;
        if (delta < 0)
            return `${delta} from yesterday`;
        return `0 from yesterday`;
    };
    const getStatusBadge = (statusStr) => {
        switch (statusStr) {
            case "NEW":
                return { label: "● New", className: "badge-status-new" };
            case "ASSIGNED":
                return { label: "● Open", className: "badge-status-assigned" };
            case "IN_PROGRESS":
                return { label: "● In Progress", className: "badge-status-in-progress" };
            case "PENDING_REQUESTER":
                return { label: "● Waiting for Requester", className: "badge-status-pending-requester" };
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
    const getPriorityBadge = (priorityStr) => {
        switch (priorityStr) {
            case "URGENT":
                return { label: "▲ Urgent", className: "badge-priority-urgent" };
            case "HIGH":
                return { label: "↑ High", className: "badge-priority-high" };
            case "MEDIUM":
                return { label: "→ Medium", className: "badge-priority-medium" };
            case "LOW":
                return { label: "↓ Low", className: "badge-priority-low" };
            default:
                return { label: priorityStr, className: "badge bg-light text-dark border" };
        }
    };
    const formatDateTime = (iso) => {
        try {
            const d = new Date(iso);
            return d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        }
        catch {
            return iso;
        }
    };
    // Loading skeleton state
    if (isLoading) {
        return (_jsxs("div", { className: "container py-4", style: { maxWidth: 1280 }, "data-testid": "dashboard-loading-skeleton", children: [_jsx("div", { className: "d-flex justify-content-between align-items-center mb-4", children: _jsxs("div", { children: [_jsx("div", { className: "placeholder-glow", children: _jsx("span", { className: "placeholder col-6", style: { height: "28px" } }) }), _jsx("div", { className: "placeholder-glow", children: _jsx("span", { className: "placeholder col-4", style: { height: "16px" } }) })] }) }), _jsx("div", { className: "row g-3 mb-4", children: [1, 2, 3, 4, 5].map((i) => (_jsx("div", { className: "col-12 col-sm-6 col-lg", children: _jsxs("div", { className: "card p-3 shadow-sm placeholder-glow", style: { minHeight: "110px", borderRadius: "10px" }, children: [_jsx("span", { className: "placeholder col-7 mb-2" }), _jsx("span", { className: "placeholder col-4 mb-2", style: { height: "30px" } }), _jsx("span", { className: "placeholder col-8" })] }) }, i))) })] }));
    }
    // Error state
    if (error && !metrics) {
        return (_jsx("div", { className: "container py-4", style: { maxWidth: 1280 }, children: _jsxs("div", { className: "alert alert-danger d-flex justify-content-between align-items-center", role: "alert", "data-testid": "dashboard-error-banner", children: [_jsxs("div", { children: [_jsx("strong", { children: "Error:" }), " ", error] }), _jsx("button", { type: "button", className: "btn btn-sm btn-outline-danger", onClick: () => fetchDashboardData(), children: "Try Again" })] }) }));
    }
    return (_jsxs("div", { className: "container py-4", style: { maxWidth: 1280 }, children: [_jsxs("div", { className: "d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4", children: [_jsxs("div", { children: [_jsxs("h1", { className: "h3 fw-bold mb-1", style: { color: "var(--color-text-primary, #1A2E24)" }, "data-testid": "staff-dashboard-welcome", children: ["Welcome back, ", auth?.user?.displayName || "IT Staff", "!"] }), _jsx("p", { className: "text-muted mb-0 small", children: "Here's what's happening with your queue today." })] }), _jsx("div", { children: _jsxs("button", { type: "button", className: "btn btn-sm d-flex align-items-center gap-2", style: {
                                backgroundColor: "var(--color-surface, #ffffff)",
                                border: "1px solid var(--color-border-subtle, #DDE5E1)",
                                color: "var(--color-text-primary, #1A2E24)",
                                fontWeight: 500,
                            }, onClick: () => fetchDashboardData(true), disabled: isRefreshing, "data-testid": "dashboard-refresh-btn", "aria-label": "Refresh operational metrics", children: [_jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round", style: {
                                        animation: isRefreshing ? "spin 1s linear infinite" : "none",
                                    }, "aria-hidden": "true", children: [_jsx("polyline", { points: "23 4 23 10 17 10" }), _jsx("polyline", { points: "1 20 1 14 7 14" }), _jsx("path", { d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" })] }), _jsx("span", { children: "Refresh" })] }) })] }), _jsxs("div", { className: "row g-3 mb-4", children: [_jsx("div", { className: "col-12 col-sm-6 col-lg", children: _jsxs("div", { className: "card h-100 p-3 shadow-sm cursor-pointer dashboard-metric-card", style: {
                                borderRadius: "10px",
                                border: "1px solid var(--color-border-subtle, #DDE5E1)",
                                transition: "transform 0.15s ease, box-shadow 0.15s ease",
                            }, tabIndex: 0, role: "button", "data-testid": "metric-card-new", "aria-label": `New tickets: ${metrics?.newTickets.count ?? 0}. Drill down to new queue.`, onClick: () => navigateToQueue({ status: "NEW" }), onKeyDown: (e) => (e.key === "Enter" || e.key === " ") && navigateToQueue({ status: "NEW" }), children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-1", children: [_jsx("span", { className: "text-muted small fw-semibold", children: "New" }), _jsx("span", { className: "badge rounded-pill bg-light text-success border", children: "\u2728" })] }), _jsx("div", { className: "fs-2 fw-bold mb-1", style: { color: "var(--color-text-primary, #1A2E24)" }, "data-testid": "metric-count-new", children: metrics?.newTickets.count ?? 0 }), _jsx("div", { className: "text-muted small", style: { fontSize: "0.8rem" }, "data-testid": "metric-delta-new", children: formatDelta(metrics?.newTickets.deltaYesterday ?? 0) })] }) }), _jsx("div", { className: "col-12 col-sm-6 col-lg", children: _jsxs("div", { className: "card h-100 p-3 shadow-sm cursor-pointer dashboard-metric-card", style: {
                                borderRadius: "10px",
                                border: "1px solid var(--color-border-subtle, #DDE5E1)",
                                transition: "transform 0.15s ease, box-shadow 0.15s ease",
                            }, tabIndex: 0, role: "button", "data-testid": "metric-card-open", "aria-label": `Open tickets: ${metrics?.openTickets.count ?? 0}. Drill down to open queue.`, onClick: () => navigateToQueue({ status: "ASSIGNED" }), onKeyDown: (e) => (e.key === "Enter" || e.key === " ") && navigateToQueue({ status: "ASSIGNED" }), children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-1", children: [_jsx("span", { className: "text-muted small fw-semibold", children: "Open" }), _jsx("span", { className: "badge rounded-pill bg-light text-primary border", children: "\uD83D\uDCC2" })] }), _jsx("div", { className: "fs-2 fw-bold mb-1", style: { color: "var(--color-text-primary, #1A2E24)" }, "data-testid": "metric-count-open", children: metrics?.openTickets.count ?? 0 }), _jsx("div", { className: "text-muted small", style: { fontSize: "0.8rem" }, "data-testid": "metric-delta-open", children: formatDelta(metrics?.openTickets.deltaYesterday ?? 0) })] }) }), _jsx("div", { className: "col-12 col-sm-6 col-lg", children: _jsxs("div", { className: "card h-100 p-3 shadow-sm cursor-pointer dashboard-metric-card", style: {
                                borderRadius: "10px",
                                border: "1px solid var(--color-border-subtle, #DDE5E1)",
                                transition: "transform 0.15s ease, box-shadow 0.15s ease",
                            }, tabIndex: 0, role: "button", "data-testid": "metric-card-in-progress", "aria-label": `In Progress tickets: ${metrics?.inProgress.count ?? 0}. Drill down to in-progress queue.`, onClick: () => navigateToQueue({ status: "IN_PROGRESS" }), onKeyDown: (e) => (e.key === "Enter" || e.key === " ") && navigateToQueue({ status: "IN_PROGRESS" }), children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-1", children: [_jsx("span", { className: "text-muted small fw-semibold", children: "In Progress" }), _jsx("span", { className: "badge rounded-pill bg-light text-info border", children: "\u26A1" })] }), _jsx("div", { className: "fs-2 fw-bold mb-1", style: { color: "var(--color-text-primary, #1A2E24)" }, "data-testid": "metric-count-in-progress", children: metrics?.inProgress.count ?? 0 }), _jsx("div", { className: "text-muted small", style: { fontSize: "0.8rem" }, "data-testid": "metric-delta-in-progress", children: formatDelta(metrics?.inProgress.deltaYesterday ?? 0) })] }) }), _jsx("div", { className: "col-12 col-sm-6 col-lg", children: _jsxs("div", { className: "card h-100 p-3 shadow-sm cursor-pointer dashboard-metric-card", style: {
                                borderRadius: "10px",
                                border: "1px solid var(--color-border-subtle, #DDE5E1)",
                                transition: "transform 0.15s ease, box-shadow 0.15s ease",
                            }, tabIndex: 0, role: "button", "data-testid": "metric-card-waiting", "aria-label": `Waiting for Requester tickets: ${metrics?.waitingForRequester.count ?? 0}. Drill down.`, onClick: () => navigateToQueue({ status: "PENDING_REQUESTER" }), onKeyDown: (e) => (e.key === "Enter" || e.key === " ") && navigateToQueue({ status: "PENDING_REQUESTER" }), children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-1", children: [_jsx("span", { className: "text-muted small fw-semibold", children: "Waiting for Requester" }), _jsx("span", { className: "badge rounded-pill bg-light text-warning border", children: "\u23F3" })] }), _jsx("div", { className: "fs-2 fw-bold mb-1", style: { color: "var(--color-text-primary, #1A2E24)" }, "data-testid": "metric-count-waiting", children: metrics?.waitingForRequester.count ?? 0 }), _jsx("div", { className: "text-muted small", style: { fontSize: "0.8rem" }, "data-testid": "metric-delta-waiting", children: formatDelta(metrics?.waitingForRequester.deltaYesterday ?? 0) })] }) }), _jsx("div", { className: "col-12 col-sm-6 col-lg", children: _jsxs("div", { className: "card h-100 p-3 shadow-sm cursor-pointer dashboard-metric-card", style: {
                                borderRadius: "10px",
                                border: "1px solid var(--color-border-subtle, #DDE5E1)",
                                transition: "transform 0.15s ease, box-shadow 0.15s ease",
                            }, tabIndex: 0, role: "button", "data-testid": "metric-card-my-assigned", "aria-label": `My Assigned tickets: ${metrics?.myAssigned.count ?? 0}. Drill down to personal queue.`, onClick: () => navigateToQueue({ assigned: "mine" }), onKeyDown: (e) => (e.key === "Enter" || e.key === " ") && navigateToQueue({ assigned: "mine" }), children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-1", children: [_jsx("span", { className: "text-muted small fw-semibold", children: "My Assigned" }), _jsx("span", { className: "badge rounded-pill bg-light text-success border", children: "\uD83D\uDC64" })] }), _jsx("div", { className: "fs-2 fw-bold mb-1", style: { color: "var(--color-text-primary, #1A2E24)" }, "data-testid": "metric-count-my-assigned", children: metrics?.myAssigned.count ?? 0 }), _jsx("div", { className: "text-muted small", style: { fontSize: "0.8rem" }, "data-testid": "metric-delta-my-assigned", children: formatDelta(metrics?.myAssigned.deltaYesterday ?? 0) })] }) })] }), _jsxs("div", { className: "row g-4", children: [_jsx("div", { className: "col-12 col-lg-8", children: _jsxs("div", { className: "card h-100 shadow-sm", style: {
                                borderRadius: "10px",
                                border: "1px solid var(--color-border-subtle, #DDE5E1)",
                                backgroundColor: "var(--color-surface, #ffffff)",
                            }, children: [_jsxs("div", { className: "card-header bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom", children: [_jsx("h2", { className: "h5 fw-bold mb-0", style: { color: "var(--color-text-primary, #1A2E24)" }, children: "My Recent Tickets" }), _jsx("a", { href: "#/queue", className: "text-decoration-none small fw-semibold", style: { color: "var(--color-secondary-green, #0B7A46)" }, onClick: (e) => {
                                                e.preventDefault();
                                                navigateToQueue({});
                                            }, "data-testid": "view-all-queue-link", children: "View all \u2192" })] }), _jsx("div", { className: "card-body p-0", children: recentTickets.length === 0 ? (_jsx("div", { className: "p-4 text-center text-muted", "data-testid": "recent-tickets-empty", children: _jsx("p", { className: "mb-0", children: "No recent tickets found in queue." }) })) : (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover align-middle mb-0", "data-testid": "recent-tickets-table", children: [_jsx("thead", { className: "table-light", children: _jsxs("tr", { children: [_jsx("th", { scope: "col", className: "ps-4", children: "Ticket No" }), _jsx("th", { scope: "col", children: "Title" }), _jsx("th", { scope: "col", children: "Requester" }), _jsx("th", { scope: "col", children: "Status" }), _jsx("th", { scope: "col", className: "pe-4", children: "Updated" })] }) }), _jsx("tbody", { children: recentTickets.map((ticket) => {
                                                        const statusBadge = getStatusBadge(ticket.status);
                                                        const priorityBadge = getPriorityBadge(ticket.itPriority);
                                                        return (_jsxs("tr", { className: "cursor-pointer", onClick: () => onViewDetail?.(ticket.id), "data-testid": `recent-ticket-row-${ticket.id}`, children: [_jsx("td", { className: "ps-4 fw-bold font-monospace small", style: { color: "var(--color-primary-green, #006B3C)" }, children: ticket.ticketNo }), _jsxs("td", { children: [_jsx("div", { className: "fw-semibold text-truncate", style: { maxWidth: "240px" }, title: ticket.title, children: ticket.title }), _jsx("span", { className: `badge ${priorityBadge.className} me-1`, style: { fontSize: "0.7rem" }, children: priorityBadge.label })] }), _jsx("td", { className: "small text-muted", children: ticket.requesterName }), _jsx("td", { children: _jsx("span", { className: `badge ${statusBadge.className}`, children: statusBadge.label }) }), _jsx("td", { className: "pe-4 small text-muted", children: formatDateTime(ticket.updatedAt) })] }, ticket.id));
                                                    }) })] }) })) })] }) }), _jsx("div", { className: "col-12 col-lg-4", children: _jsxs("div", { className: "card shadow-sm", style: {
                                borderRadius: "10px",
                                border: "1px solid var(--color-border-subtle, #DDE5E1)",
                                backgroundColor: "var(--color-surface, #ffffff)",
                            }, children: [_jsx("div", { className: "card-header bg-white py-3 px-4 border-bottom", children: _jsx("h2", { className: "h5 fw-bold mb-0", style: { color: "var(--color-text-primary, #1A2E24)" }, children: "Quick Actions" }) }), _jsxs("div", { className: "card-body p-4 d-flex flex-column gap-3", children: [_jsxs("button", { type: "button", className: "btn btn-zen-primary w-100 d-flex align-items-center justify-content-center gap-2 py-2", onClick: () => onNavigate?.("create-ticket"), "data-testid": "quick-action-create", children: [_jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("line", { x1: "12", y1: "8", x2: "12", y2: "16" }), _jsx("line", { x1: "8", y1: "12", x2: "16", y2: "12" })] }), _jsx("span", { className: "fw-semibold", children: "Create Ticket" })] }), _jsxs("button", { type: "button", className: "btn btn-outline-success w-100 d-flex align-items-center justify-content-center gap-2 py-2", style: {
                                                borderColor: "var(--color-secondary-green, #0B7A46)",
                                                color: "var(--color-secondary-green, #0B7A46)",
                                            }, onClick: () => navigateToQueue({ search: "" }), "data-testid": "quick-action-search", children: [_jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })] }), _jsx("span", { className: "fw-semibold", children: "Search Tickets" })] }), _jsxs("button", { type: "button", className: "btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2 py-2", onClick: () => navigateToQueue({ assigned: "mine" }), "data-testid": "quick-action-my-queue", children: [_jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [_jsx("polyline", { points: "22 12 16 12 14 15 10 15 8 12 2 12" }), _jsx("path", { d: "M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" })] }), _jsx("span", { className: "fw-semibold", children: "My Queue" })] })] })] }) })] })] }));
}
