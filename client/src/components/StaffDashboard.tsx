import React, { useState, useEffect, useCallback, useContext } from "react";
import { AuthContext } from "../context/AuthContext.js";
import {
  getStaffDashboardApi,
  StaffDashboardMetrics,
  StaffRecentTicketDto,
} from "../api.js";

export interface StaffDashboardProps {
  onNavigate?: (view: any) => void;
  onViewDetail?: (ticketId: number) => void;
}

export default function StaffDashboard({ onNavigate, onViewDetail }: StaffDashboardProps) {
  const auth = useContext(AuthContext);
  const [metrics, setMetrics] = useState<StaffDashboardMetrics | null>(null);
  const [recentTickets, setRecentTickets] = useState<StaffRecentTicketDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await getStaffDashboardApi();
      setMetrics(data.metrics);
      setRecentTickets(data.recentTickets || []);
    } catch (err: any) {
      console.error("Failed to fetch staff dashboard metrics:", err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard data. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const navigateToQueue = (params: Record<string, string>) => {
    const searchParams = new URLSearchParams(params).toString();
    const newUrl = `${window.location.pathname}?${searchParams}#/queue?${searchParams}`;
    window.history.pushState(null, "", newUrl);
    if (onNavigate) {
      onNavigate("queue");
    } else {
      window.location.href = `/queue?${searchParams}`;
    }
  };

  const formatDelta = (delta: number) => {
    if (delta > 0) return `+${delta} from yesterday`;
    if (delta < 0) return `${delta} from yesterday`;
    return `0 from yesterday`;
  };

  const getStatusBadge = (statusStr: string) => {
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

  const getPriorityBadge = (priorityStr: string) => {
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

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  // Loading skeleton state
  if (isLoading) {
    return (
      <div className="container py-4" style={{ maxWidth: 1280 }} data-testid="dashboard-loading-skeleton">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <div className="placeholder-glow">
              <span className="placeholder col-6" style={{ height: "28px" }}></span>
            </div>
            <div className="placeholder-glow">
              <span className="placeholder col-4" style={{ height: "16px" }}></span>
            </div>
          </div>
        </div>
        <div className="row g-3 mb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="col-12 col-sm-6 col-lg">
              <div className="card p-3 shadow-sm placeholder-glow" style={{ minHeight: "110px", borderRadius: "10px" }}>
                <span className="placeholder col-7 mb-2"></span>
                <span className="placeholder col-4 mb-2" style={{ height: "30px" }}></span>
                <span className="placeholder col-8"></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error && !metrics) {
    return (
      <div className="container py-4" style={{ maxWidth: 1280 }}>
        <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert" data-testid="dashboard-error-banner">
          <div>
            <strong>Error:</strong> {error}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => fetchDashboardData()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4" style={{ maxWidth: 1280 }}>
      {/* Welcome Banner */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1" style={{ color: "var(--color-text-primary, #1A2E24)" }} data-testid="staff-dashboard-welcome">
            Welcome back, {auth?.user?.displayName || "IT Staff"}!
          </h1>
          <p className="text-muted mb-0 small">
            Here's what's happening with your queue today.
          </p>
        </div>
        <div>
          <button
            type="button"
            className="btn btn-sm d-flex align-items-center gap-2"
            style={{
              backgroundColor: "var(--color-surface, #ffffff)",
              border: "1px solid var(--color-border-subtle, #DDE5E1)",
              color: "var(--color-text-primary, #1A2E24)",
              fontWeight: 500,
            }}
            onClick={() => fetchDashboardData(true)}
            disabled={isRefreshing}
            data-testid="dashboard-refresh-btn"
            aria-label="Refresh operational metrics"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                animation: isRefreshing ? "spin 1s linear infinite" : "none",
              }}
              aria-hidden="true"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 5 Metric Cards */}
      <div className="row g-3 mb-4">
        {/* Card 1: New */}
        <div className="col-12 col-sm-6 col-lg">
          <div
            className="card h-100 p-3 shadow-sm cursor-pointer dashboard-metric-card"
            style={{
              borderRadius: "10px",
              border: "1px solid var(--color-border-subtle, #DDE5E1)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            tabIndex={0}
            role="button"
            data-testid="metric-card-new"
            aria-label={`New tickets: ${metrics?.newTickets.count ?? 0}. Drill down to new queue.`}
            onClick={() => navigateToQueue({ status: "NEW" })}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigateToQueue({ status: "NEW" })}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-muted small fw-semibold">New</span>
              <span className="badge rounded-pill bg-light text-success border">✨</span>
            </div>
            <div className="fs-2 fw-bold mb-1" style={{ color: "var(--color-text-primary, #1A2E24)" }} data-testid="metric-count-new">
              {metrics?.newTickets.count ?? 0}
            </div>
            <div className="text-muted small" style={{ fontSize: "0.8rem" }} data-testid="metric-delta-new">
              {formatDelta(metrics?.newTickets.deltaYesterday ?? 0)}
            </div>
          </div>
        </div>

        {/* Card 2: Open (ASSIGNED) */}
        <div className="col-12 col-sm-6 col-lg">
          <div
            className="card h-100 p-3 shadow-sm cursor-pointer dashboard-metric-card"
            style={{
              borderRadius: "10px",
              border: "1px solid var(--color-border-subtle, #DDE5E1)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            tabIndex={0}
            role="button"
            data-testid="metric-card-open"
            aria-label={`Open tickets: ${metrics?.openTickets.count ?? 0}. Drill down to open queue.`}
            onClick={() => navigateToQueue({ status: "ASSIGNED" })}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigateToQueue({ status: "ASSIGNED" })}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-muted small fw-semibold">Open</span>
              <span className="badge rounded-pill bg-light text-primary border">📂</span>
            </div>
            <div className="fs-2 fw-bold mb-1" style={{ color: "var(--color-text-primary, #1A2E24)" }} data-testid="metric-count-open">
              {metrics?.openTickets.count ?? 0}
            </div>
            <div className="text-muted small" style={{ fontSize: "0.8rem" }} data-testid="metric-delta-open">
              {formatDelta(metrics?.openTickets.deltaYesterday ?? 0)}
            </div>
          </div>
        </div>

        {/* Card 3: In Progress */}
        <div className="col-12 col-sm-6 col-lg">
          <div
            className="card h-100 p-3 shadow-sm cursor-pointer dashboard-metric-card"
            style={{
              borderRadius: "10px",
              border: "1px solid var(--color-border-subtle, #DDE5E1)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            tabIndex={0}
            role="button"
            data-testid="metric-card-in-progress"
            aria-label={`In Progress tickets: ${metrics?.inProgress.count ?? 0}. Drill down to in-progress queue.`}
            onClick={() => navigateToQueue({ status: "IN_PROGRESS" })}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigateToQueue({ status: "IN_PROGRESS" })}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-muted small fw-semibold">In Progress</span>
              <span className="badge rounded-pill bg-light text-info border">⚡</span>
            </div>
            <div className="fs-2 fw-bold mb-1" style={{ color: "var(--color-text-primary, #1A2E24)" }} data-testid="metric-count-in-progress">
              {metrics?.inProgress.count ?? 0}
            </div>
            <div className="text-muted small" style={{ fontSize: "0.8rem" }} data-testid="metric-delta-in-progress">
              {formatDelta(metrics?.inProgress.deltaYesterday ?? 0)}
            </div>
          </div>
        </div>

        {/* Card 4: Waiting for Requester */}
        <div className="col-12 col-sm-6 col-lg">
          <div
            className="card h-100 p-3 shadow-sm cursor-pointer dashboard-metric-card"
            style={{
              borderRadius: "10px",
              border: "1px solid var(--color-border-subtle, #DDE5E1)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            tabIndex={0}
            role="button"
            data-testid="metric-card-waiting"
            aria-label={`Waiting for Requester tickets: ${metrics?.waitingForRequester.count ?? 0}. Drill down.`}
            onClick={() => navigateToQueue({ status: "PENDING_REQUESTER" })}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigateToQueue({ status: "PENDING_REQUESTER" })}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-muted small fw-semibold">Waiting for Requester</span>
              <span className="badge rounded-pill bg-light text-warning border">⏳</span>
            </div>
            <div className="fs-2 fw-bold mb-1" style={{ color: "var(--color-text-primary, #1A2E24)" }} data-testid="metric-count-waiting">
              {metrics?.waitingForRequester.count ?? 0}
            </div>
            <div className="text-muted small" style={{ fontSize: "0.8rem" }} data-testid="metric-delta-waiting">
              {formatDelta(metrics?.waitingForRequester.deltaYesterday ?? 0)}
            </div>
          </div>
        </div>

        {/* Card 5: My Assigned */}
        <div className="col-12 col-sm-6 col-lg">
          <div
            className="card h-100 p-3 shadow-sm cursor-pointer dashboard-metric-card"
            style={{
              borderRadius: "10px",
              border: "1px solid var(--color-border-subtle, #DDE5E1)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            tabIndex={0}
            role="button"
            data-testid="metric-card-my-assigned"
            aria-label={`My Assigned tickets: ${metrics?.myAssigned.count ?? 0}. Drill down to personal queue.`}
            onClick={() => navigateToQueue({ assigned: "mine" })}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigateToQueue({ assigned: "mine" })}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-muted small fw-semibold">My Assigned</span>
              <span className="badge rounded-pill bg-light text-success border">👤</span>
            </div>
            <div className="fs-2 fw-bold mb-1" style={{ color: "var(--color-text-primary, #1A2E24)" }} data-testid="metric-count-my-assigned">
              {metrics?.myAssigned.count ?? 0}
            </div>
            <div className="text-muted small" style={{ fontSize: "0.8rem" }} data-testid="metric-delta-my-assigned">
              {formatDelta(metrics?.myAssigned.deltaYesterday ?? 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Operational Two-Column Layout */}
      <div className="row g-4">
        {/* Left Column: Recent Tickets (8/12 cols) */}
        <div className="col-12 col-lg-8">
          <div
            className="card h-100 shadow-sm"
            style={{
              borderRadius: "10px",
              border: "1px solid var(--color-border-subtle, #DDE5E1)",
              backgroundColor: "var(--color-surface, #ffffff)",
            }}
          >
            <div className="card-header bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom">
              <h2 className="h5 fw-bold mb-0" style={{ color: "var(--color-text-primary, #1A2E24)" }}>
                My Recent Tickets
              </h2>
              <a
                href="#/queue"
                className="text-decoration-none small fw-semibold"
                style={{ color: "var(--color-secondary-green, #0B7A46)" }}
                onClick={(e) => {
                  e.preventDefault();
                  navigateToQueue({});
                }}
                data-testid="view-all-queue-link"
              >
                View all &rarr;
              </a>
            </div>

            <div className="card-body p-0">
              {recentTickets.length === 0 ? (
                <div className="p-4 text-center text-muted" data-testid="recent-tickets-empty">
                  <p className="mb-0">No recent tickets found in queue.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0" data-testid="recent-tickets-table">
                    <thead className="table-light">
                      <tr>
                        <th scope="col" className="ps-4">Ticket No</th>
                        <th scope="col">Title</th>
                        <th scope="col">Requester</th>
                        <th scope="col">Status</th>
                        <th scope="col" className="pe-4">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTickets.map((ticket) => {
                        const statusBadge = getStatusBadge(ticket.status);
                        const priorityBadge = getPriorityBadge(ticket.itPriority);
                        return (
                          <tr
                            key={ticket.id}
                            className="cursor-pointer"
                            onClick={() => onViewDetail?.(ticket.id)}
                            data-testid={`recent-ticket-row-${ticket.id}`}
                          >
                            <td className="ps-4 fw-bold font-monospace small" style={{ color: "var(--color-primary-green, #006B3C)" }}>
                              {ticket.ticketNo}
                            </td>
                            <td>
                              <div className="fw-semibold text-truncate" style={{ maxWidth: "240px" }} title={ticket.title}>
                                {ticket.title}
                              </div>
                              <span className={`badge ${priorityBadge.className} me-1`} style={{ fontSize: "0.7rem" }}>
                                {priorityBadge.label}
                              </span>
                            </td>
                            <td className="small text-muted">{ticket.requesterName}</td>
                            <td>
                              <span className={`badge ${statusBadge.className}`}>
                                {statusBadge.label}
                              </span>
                            </td>
                            <td className="pe-4 small text-muted">
                              {formatDateTime(ticket.updatedAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Quick Actions (4/12 cols) */}
        <div className="col-12 col-lg-4">
          <div
            className="card shadow-sm"
            style={{
              borderRadius: "10px",
              border: "1px solid var(--color-border-subtle, #DDE5E1)",
              backgroundColor: "var(--color-surface, #ffffff)",
            }}
          >
            <div className="card-header bg-white py-3 px-4 border-bottom">
              <h2 className="h5 fw-bold mb-0" style={{ color: "var(--color-text-primary, #1A2E24)" }}>
                Quick Actions
              </h2>
            </div>
            <div className="card-body p-4 d-flex flex-column gap-3">
              <button
                type="button"
                className="btn btn-zen-primary w-100 d-flex align-items-center justify-content-center gap-2 py-2"
                onClick={() => onNavigate?.("create-ticket")}
                data-testid="quick-action-create"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                <span className="fw-semibold">Create Ticket</span>
              </button>

              <button
                type="button"
                className="btn btn-outline-success w-100 d-flex align-items-center justify-content-center gap-2 py-2"
                style={{
                  borderColor: "var(--color-secondary-green, #0B7A46)",
                  color: "var(--color-secondary-green, #0B7A46)",
                }}
                onClick={() => navigateToQueue({ search: "" })}
                data-testid="quick-action-search"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span className="fw-semibold">Search Tickets</span>
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2 py-2"
                onClick={() => navigateToQueue({ assigned: "mine" })}
                data-testid="quick-action-my-queue"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                  <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                </svg>
                <span className="fw-semibold">My Queue</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
