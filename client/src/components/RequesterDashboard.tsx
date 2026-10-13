import React, { useState, useEffect, useCallback, useContext } from "react";
import { AuthContext } from "../context/AuthContext.js";
import { useRequester } from "../context/RequesterContext.js";
import {
  getRequesterDashboardApi,
  RequesterDashboardMetrics,
  RequesterRecentTicketDto,
} from "../api.js";

export interface RequesterDashboardProps {
  onNavigate?: (view: any) => void;
  onViewDetail?: (ticketId: number) => void;
}

export default function RequesterDashboard({ onNavigate, onViewDetail }: RequesterDashboardProps) {
  const auth = useContext(AuthContext);
  const { selectedRequester } = useRequester();
  const [metrics, setMetrics] = useState<RequesterDashboardMetrics | null>(null);
  const [recentTickets, setRecentTickets] = useState<RequesterRecentTicketDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const activeUser = auth?.user || selectedRequester;

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getRequesterDashboardApi();
      setMetrics(data.metrics);
      setRecentTickets(data.recentTickets || []);
    } catch (err: any) {
      console.error("Failed to load requester dashboard metrics:", err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard metrics. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const navigateToTickets = (statusFilter?: string) => {
    if (statusFilter) {
      const newUrl = `${window.location.pathname}?status=${statusFilter}#/my-tickets?status=${statusFilter}`;
      window.history.pushState(null, "", newUrl);
    } else {
      window.history.pushState(null, "", `${window.location.pathname}#/my-tickets`);
    }

    if (onNavigate) {
      onNavigate("tickets");
    } else {
      window.location.href = statusFilter ? `/tickets?status=${statusFilter}` : `/tickets`;
    }
  };

  const getStatusBadge = (statusStr: string) => {
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

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="container py-4" style={{ maxWidth: 1280 }} data-testid="requester-dashboard-loading">
        <div className="mb-4">
          <div className="placeholder-glow">
            <span className="placeholder col-6" style={{ height: "28px" }}></span>
          </div>
          <div className="placeholder-glow">
            <span className="placeholder col-4" style={{ height: "16px" }}></span>
          </div>
        </div>
        <div className="row g-3 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="col-12 col-sm-6 col-md-3">
              <div className="card p-3 shadow-sm placeholder-glow" style={{ minHeight: "110px", borderRadius: "10px" }}>
                <span className="placeholder col-7 mb-2"></span>
                <span className="placeholder col-4 mb-2" style={{ height: "30px" }}></span>
                <span className="placeholder col-5"></span>
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
        <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert" data-testid="requester-dashboard-error">
          <div>
            <strong>Error:</strong> {error}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={fetchDashboardData}
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
      <div className="mb-4">
        <h1 className="h3 fw-bold mb-1" style={{ color: "var(--color-text-primary, #1A2E24)" }} data-testid="requester-dashboard-welcome">
          Welcome, {activeUser?.displayName || "Requester"}!
        </h1>
        <p className="text-muted mb-0 small">
          Here's the latest on your requests.
        </p>
      </div>

      {/* 4 Metric Cards */}
      <div className="row g-3 mb-4">
        {/* Card 1: My Open Tickets */}
        <div className="col-12 col-sm-6 col-md-3">
          <div
            className="card h-100 p-3 shadow-sm cursor-pointer dashboard-metric-card"
            style={{
              borderRadius: "10px",
              border: "1px solid var(--color-border-subtle, #DDE5E1)",
              cursor: "pointer",
            }}
            tabIndex={0}
            role="button"
            data-testid="metric-card-my-open"
            onClick={() => navigateToTickets("OPEN")}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigateToTickets("OPEN")}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-muted small fw-semibold">My Open Tickets</span>
              <span className="badge rounded-pill bg-light text-success border">📂</span>
            </div>
            <div className="fs-2 fw-bold mb-2" style={{ color: "var(--color-text-primary, #1A2E24)" }} data-testid="metric-count-my-open">
              {metrics?.myOpenTickets ?? 0}
            </div>
            <div>
              <a
                href="#/my-tickets?status=OPEN"
                className="text-decoration-none small fw-semibold"
                style={{ color: "var(--color-secondary-green, #0B7A46)" }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigateToTickets("OPEN");
                }}
                data-testid="drill-down-link-my-open"
              >
                [View all]
              </a>
            </div>
          </div>
        </div>

        {/* Card 2: In Progress */}
        <div className="col-12 col-sm-6 col-md-3">
          <div
            className="card h-100 p-3 shadow-sm cursor-pointer dashboard-metric-card"
            style={{
              borderRadius: "10px",
              border: "1px solid var(--color-border-subtle, #DDE5E1)",
              cursor: "pointer",
            }}
            tabIndex={0}
            role="button"
            data-testid="metric-card-in-progress"
            onClick={() => navigateToTickets("IN_PROGRESS")}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigateToTickets("IN_PROGRESS")}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-muted small fw-semibold">In Progress</span>
              <span className="badge rounded-pill bg-light text-info border">⚡</span>
            </div>
            <div className="fs-2 fw-bold mb-2" style={{ color: "var(--color-text-primary, #1A2E24)" }} data-testid="metric-count-in-progress">
              {metrics?.inProgress ?? 0}
            </div>
            <div>
              <a
                href="#/my-tickets?status=IN_PROGRESS"
                className="text-decoration-none small fw-semibold"
                style={{ color: "var(--color-secondary-green, #0B7A46)" }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigateToTickets("IN_PROGRESS");
                }}
                data-testid="drill-down-link-in-progress"
              >
                [View all]
              </a>
            </div>
          </div>
        </div>

        {/* Card 3: Resolved */}
        <div className="col-12 col-sm-6 col-md-3">
          <div
            className="card h-100 p-3 shadow-sm cursor-pointer dashboard-metric-card"
            style={{
              borderRadius: "10px",
              border: "1px solid var(--color-border-subtle, #DDE5E1)",
              cursor: "pointer",
            }}
            tabIndex={0}
            role="button"
            data-testid="metric-card-resolved"
            onClick={() => navigateToTickets("RESOLVED")}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigateToTickets("RESOLVED")}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-muted small fw-semibold">Resolved</span>
              <span className="badge rounded-pill bg-light text-success border">✓</span>
            </div>
            <div className="fs-2 fw-bold mb-2" style={{ color: "var(--color-text-primary, #1A2E24)" }} data-testid="metric-count-resolved">
              {metrics?.resolved ?? 0}
            </div>
            <div>
              <a
                href="#/my-tickets?status=RESOLVED"
                className="text-decoration-none small fw-semibold"
                style={{ color: "var(--color-secondary-green, #0B7A46)" }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigateToTickets("RESOLVED");
                }}
                data-testid="drill-down-link-resolved"
              >
                [View all]
              </a>
            </div>
          </div>
        </div>

        {/* Card 4: Closed */}
        <div className="col-12 col-sm-6 col-md-3">
          <div
            className="card h-100 p-3 shadow-sm cursor-pointer dashboard-metric-card"
            style={{
              borderRadius: "10px",
              border: "1px solid var(--color-border-subtle, #DDE5E1)",
              cursor: "pointer",
            }}
            tabIndex={0}
            role="button"
            data-testid="metric-card-closed"
            onClick={() => navigateToTickets("CLOSED")}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigateToTickets("CLOSED")}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-muted small fw-semibold">Closed</span>
              <span className="badge rounded-pill bg-light text-secondary border">—</span>
            </div>
            <div className="fs-2 fw-bold mb-2" style={{ color: "var(--color-text-primary, #1A2E24)" }} data-testid="metric-count-closed">
              {metrics?.closed ?? 0}
            </div>
            <div>
              <a
                href="#/my-tickets?status=CLOSED"
                className="text-decoration-none small fw-semibold"
                style={{ color: "var(--color-secondary-green, #0B7A46)" }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigateToTickets("CLOSED");
                }}
                data-testid="drill-down-link-closed"
              >
                [View all]
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="row g-4">
        {/* Left Column: My Recent Tickets (8/12 cols) */}
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
              {recentTickets.length > 0 && (
                <a
                  href="#/my-tickets"
                  className="text-decoration-none small fw-semibold"
                  style={{ color: "var(--color-secondary-green, #0B7A46)" }}
                  onClick={(e) => {
                    e.preventDefault();
                    navigateToTickets();
                  }}
                  data-testid="view-all-tickets-link"
                >
                  View all &rarr;
                </a>
              )}
            </div>

            <div className="card-body p-0">
              {recentTickets.length === 0 ? (
                /* Dedicated Empty State (AC-02, FR-51) */
                <div className="p-5 text-center" data-testid="requester-tickets-empty">
                  <div className="fs-1 mb-2">📋</div>
                  <h3 className="h6 fw-semibold text-muted mb-3">
                    You have not submitted any tickets yet.
                  </h3>
                  <button
                    type="button"
                    className="btn btn-zen-primary"
                    onClick={() => onNavigate?.("create-ticket")}
                    data-testid="create-first-ticket-btn"
                  >
                    + Create Your First Ticket
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0" data-testid="requester-recent-tickets-table">
                    <thead className="table-light">
                      <tr>
                        <th scope="col" className="ps-4">Ticket No</th>
                        <th scope="col">Summary</th>
                        <th scope="col">Status</th>
                        <th scope="col" className="pe-4">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTickets.map((ticket) => {
                        const statusBadge = getStatusBadge(ticket.status);
                        return (
                          <tr
                            key={ticket.id}
                            className="cursor-pointer"
                            onClick={() => onViewDetail?.(ticket.id)}
                            data-testid={`requester-recent-ticket-${ticket.id}`}
                          >
                            <td className="ps-4 fw-bold font-monospace small" style={{ color: "var(--color-primary-green, #006B3C)" }}>
                              {ticket.ticketNo}
                            </td>
                            <td>
                              <div className="fw-semibold text-truncate" style={{ maxWidth: "260px" }} title={ticket.title}>
                                {ticket.title}
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${statusBadge.className}`}>
                                {statusBadge.label}
                              </span>
                            </td>
                            <td className="pe-4 small text-muted">
                              {formatDate(ticket.createdAt)}
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
                className="btn btn-zen-primary w-100 text-start p-3"
                onClick={() => onNavigate?.("create-ticket")}
                data-testid="requester-quick-action-create"
              >
                <div className="fw-bold fs-6 mb-1">+ Create Ticket</div>
                <div className="small text-white-50">Submit a new request</div>
              </button>

              <button
                type="button"
                className="btn btn-outline-success w-100 text-start p-3"
                style={{
                  borderColor: "var(--color-border-subtle, #DDE5E1)",
                  color: "var(--color-text-primary, #1A2E24)",
                  backgroundColor: "var(--color-surface, #ffffff)",
                }}
                onClick={() => navigateToTickets()}
                data-testid="requester-quick-action-my-tickets"
              >
                <div className="fw-bold fs-6 mb-1">📂 View My Tickets</div>
                <div className="small text-muted">Track existing requests</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
