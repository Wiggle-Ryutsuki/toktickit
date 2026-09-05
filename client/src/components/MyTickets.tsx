import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRequester } from "../context/RequesterContext.js";

export interface TicketSummaryDto {
  id: number;
  ticketNo: string;
  summary: string;
  status: string;
  requestedPriority: string;
  itPriority: string;
  categoryName: string;
  category: { id: number; name: string; code?: string };
  relatedSystemName: string;
  relatedSystem: { id: number; name: string };
  ticketOwner: string | null;
  requester: { id: number; displayName: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMetadata {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export interface CategoryOption {
  id: number;
  name: string;
  code?: string;
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface MyTicketsProps {
  onNavigateCreate?: () => void;
  onViewDetail?: (id: number) => void;
}

export default function MyTickets({ onNavigateCreate, onViewDetail }: MyTicketsProps) {
  const { selectedRequester } = useRequester();

  // Search & Filter state
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("ALL");
  const [requestedPriority, setRequestedPriority] = useState<string>("ALL");
  const [itPriority, setItPriority] = useState<string>("ALL");
  const [status, setStatus] = useState<string>("ALL");

  // Sorting state
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);

  // Data & Lifecycle state
  const [tickets, setTickets] = useState<TicketSummaryDto[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata>({
    totalItems: 0,
    totalPages: 0,
    currentPage: 1,
    limit: 10,
  });
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Total baseline tickets count for the current requester (to distinguish empty vs no-results)
  const [requesterTotalTickets, setRequesterTotalTickets] = useState<number | null>(null);

  // Search debounce effect (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Context Switch Invariant (BR-16): reset all search/filters/page when requester changes
  const prevRequesterIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (selectedRequester && prevRequesterIdRef.current !== selectedRequester.id) {
      prevRequesterIdRef.current = selectedRequester.id;
      setSearchInput("");
      setDebouncedSearch("");
      setCategoryId("ALL");
      setRequestedPriority("ALL");
      setItPriority("ALL");
      setStatus("ALL");
      setPage(1);
      setRequesterTotalTickets(null);
    }
  }, [selectedRequester]);

  // Fetch categories once when requester is active
  useEffect(() => {
    if (!selectedRequester) return;

    let isMounted = true;
    async function loadCategories() {
      try {
        const res = await fetch(`${API_URL}/api/categories`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setCategories(data);
        }
      } catch (err) {
        console.error("Failed to load categories for filter:", err);
      }
    }
    loadCategories();
    return () => {
      isMounted = false;
    };
  }, [selectedRequester]);

  // Fetch tickets query
  const fetchTickets = useCallback(async () => {
    if (!selectedRequester) return;

    setIsLoading(true);
    setApiError(null);

    try {
      const params = new URLSearchParams();
      params.set("requesterId", String(selectedRequester.id));
      params.set("page", String(page));
      params.set("limit", String(limit));
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);

      if (debouncedSearch) params.set("search", debouncedSearch);
      if (categoryId !== "ALL") params.set("categoryId", categoryId);
      if (requestedPriority !== "ALL") params.set("requestedPriority", requestedPriority);
      if (itPriority !== "ALL") params.set("itPriority", itPriority);
      if (status !== "ALL") params.set("status", status);

      const res = await fetch(`${API_URL}/api/tickets?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`API returned HTTP ${res.status}`);
      }

      const json = await res.json();
      setTickets(json.data || []);
      setPagination(
        json.pagination || {
          totalItems: 0,
          totalPages: 0,
          currentPage: 1,
          limit,
        }
      );

      // Track if requester has ever submitted any ticket (for empty state vs no-results distinction)
      const hasFiltersActive =
        Boolean(debouncedSearch) ||
        categoryId !== "ALL" ||
        requestedPriority !== "ALL" ||
        itPriority !== "ALL" ||
        status !== "ALL";

      if (!hasFiltersActive) {
        setRequesterTotalTickets(json.pagination?.totalItems ?? json.data?.length ?? 0);
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to load tickets from server");
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedRequester,
    page,
    limit,
    sortBy,
    sortOrder,
    debouncedSearch,
    categoryId,
    requestedPriority,
    itPriority,
    status,
  ]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Handle column header sorting
  function handleSort(field: string) {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  }

  // Handle clear filters
  function handleClearFilters() {
    setSearchInput("");
    setDebouncedSearch("");
    setCategoryId("ALL");
    setRequestedPriority("ALL");
    setItPriority("ALL");
    setStatus("ALL");
    setPage(1);
  }

  const hasActiveFilters =
    Boolean(searchInput.trim()) ||
    categoryId !== "ALL" ||
    requestedPriority !== "ALL" ||
    itPriority !== "ALL" ||
    status !== "ALL";

  // Format date helper
  function formatDate(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return iso;
    }
  }

  // Badge class helpers
  function getStatusBadgeClass(statusStr: string) {
    switch (statusStr) {
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
        return "badge bg-secondary";
    }
  }

  function getPriorityBadgeClass(pStr: string) {
    switch (pStr) {
      case "URGENT":
        return "badge-priority-urgent";
      case "HIGH":
        return "badge-priority-high";
      case "MEDIUM":
        return "badge-priority-medium";
      case "LOW":
        return "badge-priority-low";
      default:
        return "badge bg-light text-dark";
    }
  }

  function formatStatusLabel(s: string) {
    return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function formatPriorityLabel(p: string) {
    return p.charAt(0) + p.slice(1).toLowerCase();
  }

  return (
    <main className="container-fluid py-4 px-lg-5 flex-grow-1" style={{ maxWidth: 1280 }}>
      {/* Top Header & Create Button */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1" style={{ color: "var(--color-primary-green)" }}>
            My Tickets
          </h1>
          <p className="text-muted small mb-0">
            View, track, search, and manage all your submitted IT support requests.
          </p>
        </div>
        <div className="d-none d-md-block">
          <button
            type="button"
            className="btn btn-zen-primary d-inline-flex align-items-center gap-2"
            onClick={onNavigateCreate}
            data-testid="create-ticket-btn"
          >
            <span>+</span>
            <span>Create Ticket</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="zen-card p-3 mb-4">
        <div className="row g-2 align-items-center">
          {/* Search Input */}
          <div className="col-12 col-md-4 col-lg-2">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted">🔍</span>
              <input
                type="text"
                className="form-control border-start-0 ps-0"
                placeholder="Search by ticket # or summary..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(1);
                }}
                aria-label="Search tickets"
              />
              {searchInput && (
                <button
                  className="btn btn-outline-secondary border-start-0 border"
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setPage(1);
                  }}
                  aria-label="Clear search text"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Category Dropdown */}
          <div className="col-6 col-md-4 col-lg-2">
            <select
              className="form-select"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by Category"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Requested Priority Dropdown */}
          <div className="col-6 col-md-4 col-lg-2">
            <select
              className="form-select"
              value={requestedPriority}
              onChange={(e) => {
                setRequestedPriority(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by Requested Priority"
            >
              <option value="ALL">All Req. Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* IT Priority Dropdown */}
          <div className="col-6 col-md-4 col-lg-2">
            <select
              className="form-select"
              value={itPriority}
              onChange={(e) => {
                setItPriority(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by IT Priority"
            >
              <option value="ALL">All IT Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* Current Status Dropdown */}
          <div className="col-6 col-md-4 col-lg-2">
            <select
              className="form-select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by Status"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="PENDING_REQUESTER">Pending Requester</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          <div className="col-12 col-md-4 col-lg-2 text-md-end">
            <button
              type="button"
              className="btn btn-outline-secondary w-100"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* API Error State */}
      {apiError && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between p-3 mb-4" role="alert">
          <div>
            <strong>Unable to load tickets from server.</strong> Please check your connection and try again.
          </div>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={fetchTickets}>
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="zen-card p-4 mb-4">
          <div className="d-flex flex-column gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="zen-skeleton-bar w-100" style={{ height: "2.5rem" }} />
            ))}
          </div>
        </div>
      )}

      {/* Main Content (when not loading and no error) */}
      {!isLoading && !apiError && (
        <>
          {/* Empty State: Requester has 0 tickets total */}
          {tickets.length === 0 && !hasActiveFilters && (requesterTotalTickets === 0 || pagination.totalItems === 0) && (
            <div className="zen-card text-center p-5 mb-4" data-testid="empty-tickets-state">
              <div style={{ fontSize: "3rem" }} className="mb-2">
                📂
              </div>
              <h2 className="h5 fw-bold mb-2">No tickets submitted yet</h2>
              <p className="text-muted small mb-4 mx-auto" style={{ maxWidth: 460 }}>
                You have not created any IT support tickets. Need help with hardware, software, or account access?
              </p>
              <button type="button" className="btn btn-zen-primary" onClick={onNavigateCreate}>
                + Create Ticket
              </button>
            </div>
          )}

          {/* No-Results State: Search / filters matched 0 tickets */}
          {tickets.length === 0 && hasActiveFilters && (
            <div className="zen-card text-center p-5 mb-4" data-testid="no-results-state">
              <div style={{ fontSize: "3rem" }} className="mb-2">
                🔎
              </div>
              <h2 className="h5 fw-bold mb-2">No matching tickets found</h2>
              <p className="text-muted small mb-4 mx-auto" style={{ maxWidth: 460 }}>
                We couldn&apos;t find any tickets matching your search criteria. Try adjusting your search term or clearing your filters.
              </p>
              <button type="button" className="btn btn-zen-secondary" onClick={handleClearFilters}>
                Clear Filters
              </button>
            </div>
          )}

          {/* Populated State: Render Table (Desktop/Tablet) and Cards (Mobile) */}
          {tickets.length > 0 && (
            <>
              {/* Desktop & Tablet Table (>=768px) */}
              <div className="d-none d-md-block zen-table-container mb-4 table-responsive">
                <table className="zen-table table align-middle" data-testid="tickets-table">
                  <thead>
                    <tr>
                      <th
                        className="sortable"
                        onClick={() => handleSort("ticketNo")}
                        style={{ width: "12%" }}
                      >
                        Ticket No {sortBy === "ticketNo" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                      </th>
                      <th
                        className="sortable"
                        onClick={() => handleSort("createdAt")}
                        style={{ width: "11%" }}
                      >
                        Created Date {sortBy === "createdAt" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                      </th>
                      <th style={{ width: "20%" }}>Summary</th>
                      <th style={{ width: "10%" }}>Category</th>
                      <th style={{ width: "9%" }}>Req. Priority</th>
                      <th style={{ width: "9%" }}>IT Priority</th>
                      <th style={{ width: "9%" }}>Status</th>
                      <th style={{ width: "9%" }}>Ticket Owner</th>
                      <th
                        className="sortable"
                        onClick={() => handleSort("updatedAt")}
                        style={{ width: "10%" }}
                      >
                        Last Updated {sortBy === "updatedAt" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                      </th>
                      <th className="text-end" style={{ width: "7%" }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t) => (
                      <tr
                        key={t.id}
                        style={{ cursor: "pointer" }}
                        onClick={() => onViewDetail?.(t.id)}
                      >
                        <td className="fw-semibold" style={{ color: "var(--color-primary-green)" }}>
                          {t.ticketNo}
                        </td>
                        <td className="text-muted">{formatDate(t.createdAt)}</td>
                        <td className="fw-medium text-dark">{t.summary}</td>
                        <td>
                          <span className="badge bg-light text-dark border">{t.categoryName}</span>
                        </td>
                        <td>
                          <span className={`badge ${getPriorityBadgeClass(t.requestedPriority)}`}>
                            {formatPriorityLabel(t.requestedPriority)}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${getPriorityBadgeClass(t.itPriority)}`}>
                            {formatPriorityLabel(t.itPriority)}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(t.status)}`}>
                            {formatStatusLabel(t.status)}
                          </span>
                        </td>
                        <td className="text-muted">{t.ticketOwner ?? "—"}</td>
                        <td className="text-muted">{formatDate(t.updatedAt)}</td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-link text-decoration-none p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewDetail?.(t.id);
                            }}
                          >
                            Details &rarr;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Cards (<768px) */}
              <div className="d-md-none mb-4">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    className="zen-ticket-card"
                    onClick={() => onViewDetail?.(t.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-bold" style={{ color: "var(--color-primary-green)" }}>
                        {t.ticketNo}
                      </span>
                      <span className={`badge ${getStatusBadgeClass(t.status)}`}>
                        {formatStatusLabel(t.status)}
                      </span>
                    </div>
                    <div className="fw-semibold mb-2">{t.summary}</div>
                    <div className="d-flex flex-wrap gap-2 align-items-center text-muted small mb-3">
                      <span className="badge bg-light text-dark border">{t.categoryName}</span>
                      <span className={`badge ${getPriorityBadgeClass(t.requestedPriority)}`}>
                        {formatPriorityLabel(t.requestedPriority)}
                      </span>
                      <span>•</span>
                      <span>Owner: {t.ticketOwner ?? "—"}</span>
                      <span>•</span>
                      <span>{formatDate(t.createdAt)}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center border-top pt-2">
                      <span className="text-muted small">Updated {formatDate(t.updatedAt)}</span>
                      <button
                        type="button"
                        className="btn btn-sm btn-link text-decoration-none p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetail?.(t.id);
                        }}
                      >
                        View Details &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 py-2">
                <div className="d-flex align-items-center gap-3 text-muted small">
                  <span>
                    Showing {Math.min((page - 1) * limit + 1, pagination.totalItems)} to{" "}
                    {Math.min(page * limit, pagination.totalItems)} of {pagination.totalItems} tickets
                  </span>
                  <div className="d-flex align-items-center gap-1">
                    <label htmlFor="pageSizeSelect" className="text-nowrap mb-0">
                      Per page:
                    </label>
                    <select
                      id="pageSizeSelect"
                      className="form-select form-select-sm"
                      style={{ width: "auto" }}
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setPage(1);
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                {pagination.totalPages > 1 && (
                  <nav aria-label="Ticket list pagination">
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
                        <button
                          className="page-link"
                          type="button"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page <= 1}
                        >
                          &lt; Previous
                        </button>
                      </li>
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                        <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
                          <button className="page-link" type="button" onClick={() => setPage(p)}>
                            {p}
                          </button>
                        </li>
                      ))}
                      <li className={`page-item ${page >= pagination.totalPages ? "disabled" : ""}`}>
                        <button
                          className="page-link"
                          type="button"
                          onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                          disabled={page >= pagination.totalPages}
                        >
                          Next &gt;
                        </button>
                      </li>
                    </ul>
                  </nav>
                )}
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
