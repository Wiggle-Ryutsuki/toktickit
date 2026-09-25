import React, { useState, useEffect, useCallback, useRef, useContext } from "react";
import { AuthContext } from "../context/AuthContext.js";
import {
  getStaffTicketsApi,
  StaffTicketDto,
  StaffQueuePagination,
  Category,
} from "../api.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface StaffTicketQueueProps {
  onViewDetail?: (id: number) => void;
  onNavigate?: (view: any) => void;
}

export default function StaffTicketQueue({ onViewDetail, onNavigate }: StaffTicketQueueProps) {
  const auth = useContext(AuthContext);

  // Initialize query parameters from URL search string if present
  const getInitialParams = () => {
    if (typeof window === "undefined") {
      return {
        search: "",
        categoryId: "ALL",
        status: "ALL",
        requestedPriority: "ALL",
        itPriority: "ALL",
        assigned: "all",
        sortBy: "createdAt",
        sortOrder: "desc" as "asc" | "desc",
        page: 1,
        limit: 10,
      };
    }
    const params = new URLSearchParams(window.location.search);
    return {
      search: params.get("search") || "",
      categoryId: params.get("categoryId") || "ALL",
      status: params.get("status") || "ALL",
      requestedPriority: params.get("requestedPriority") || "ALL",
      itPriority: params.get("itPriority") || "ALL",
      assigned: params.get("assigned") || "all",
      sortBy: params.get("sortBy") || "createdAt",
      sortOrder: (params.get("sortOrder") === "asc" ? "asc" : "desc") as "asc" | "desc",
      page: Math.max(1, parseInt(params.get("page") || "1", 10) || 1),
      limit: [10, 25, 50].includes(parseInt(params.get("limit") || "10", 10))
        ? parseInt(params.get("limit") || "10", 10)
        : 10,
    };
  };

  const initial = getInitialParams();

  // Search & Filter state
  const [searchInput, setSearchInput] = useState(initial.search);
  const [debouncedSearch, setDebouncedSearch] = useState(initial.search);
  const [categoryId, setCategoryId] = useState<string>(initial.categoryId);
  const [status, setStatus] = useState<string>(initial.status);
  const [requestedPriority, setRequestedPriority] = useState<string>(initial.requestedPriority);
  const [itPriority, setItPriority] = useState<string>(initial.itPriority);
  const [assigned, setAssigned] = useState<string>(initial.assigned);

  // Sorting state
  const [sortBy, setSortBy] = useState<string>(initial.sortBy);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(initial.sortOrder);

  // Pagination state
  const [page, setPage] = useState<number>(initial.page);
  const [limit, setLimit] = useState<number>(initial.limit);

  // Mobile filters collapsed state
  const [mobileFiltersExpanded, setMobileFiltersExpanded] = useState<boolean>(false);

  // Data & Lifecycle state
  const [tickets, setTickets] = useState<StaffTicketDto[]>([]);
  const [pagination, setPagination] = useState<StaffQueuePagination>({
    page: initial.page,
    limit: initial.limit,
    totalCount: 0,
    totalPages: 0,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState<boolean>(false);

  // Total baseline tickets count in the queue (to distinguish empty queue vs no filter matches)
  const [totalQueueBaseline, setTotalQueueBaseline] = useState<number | null>(null);

  // Check if current user is authorized (role check)
  const isUserAuthorized =
    !auth?.user || auth.user.role === "IT_STAFF" || auth.user.role === "ADMINISTRATOR";

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Sync state to URL search parameters
  const updateUrlParams = useCallback(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();

    if (debouncedSearch) params.set("search", debouncedSearch);
    if (categoryId !== "ALL") params.set("categoryId", categoryId);
    if (status !== "ALL") params.set("status", status);
    if (requestedPriority !== "ALL") params.set("requestedPriority", requestedPriority);
    if (itPriority !== "ALL") params.set("itPriority", itPriority);
    if (assigned !== "all") params.set("assigned", assigned);
    if (sortBy !== "createdAt") params.set("sortBy", sortBy);
    if (sortOrder !== "desc") params.set("sortOrder", sortOrder);
    if (page > 1) params.set("page", String(page));
    if (limit !== 10) params.set("limit", String(limit));

    const newQuery = params.toString();
    const newUrl = newQuery ? `${window.location.pathname}?${newQuery}` : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, [
    debouncedSearch,
    categoryId,
    status,
    requestedPriority,
    itPriority,
    assigned,
    sortBy,
    sortOrder,
    page,
    limit,
  ]);

  useEffect(() => {
    updateUrlParams();
  }, [updateUrlParams]);

  // Handle browser popstate (back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      const p = getInitialParams();
      setSearchInput(p.search);
      setDebouncedSearch(p.search);
      setCategoryId(p.categoryId);
      setStatus(p.status);
      setRequestedPriority(p.requestedPriority);
      setItPriority(p.itPriority);
      setAssigned(p.assigned);
      setSortBy(p.sortBy);
      setSortOrder(p.sortOrder);
      setPage(p.page);
      setLimit(p.limit);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Fetch categories once on mount
  useEffect(() => {
    let isMounted = true;
    async function loadCategories() {
      try {
        const res = await fetch(`${API_URL}/api/categories`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setCategories(data);
        }
      } catch (err) {
        console.error("Failed to load categories for staff queue:", err);
      }
    }
    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch tickets query
  const fetchTickets = useCallback(async () => {
    if (auth?.user && auth.user.role === "REQUESTER") {
      setIsForbidden(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setApiError(null);
    setIsForbidden(false);

    try {
      const data = await getStaffTicketsApi({
        search: debouncedSearch || undefined,
        categoryId: categoryId !== "ALL" ? categoryId : undefined,
        status: status !== "ALL" ? status : undefined,
        requestedPriority: requestedPriority !== "ALL" ? requestedPriority : undefined,
        itPriority: itPriority !== "ALL" ? itPriority : undefined,
        assigned: assigned !== "all" ? assigned : undefined,
        sortBy,
        sortOrder,
        page,
        limit,
      });

      setTickets(data.tickets || []);
      setPagination(
        data.pagination || {
          page: 1,
          limit: 10,
          totalCount: 0,
          totalPages: 0,
        }
      );

      // Track whether the total queue is empty or if zero results are from active filters
      const hasFiltersActive =
        Boolean(debouncedSearch) ||
        categoryId !== "ALL" ||
        status !== "ALL" ||
        requestedPriority !== "ALL" ||
        itPriority !== "ALL" ||
        assigned !== "all";

      if (!hasFiltersActive) {
        setTotalQueueBaseline(data.pagination?.totalCount ?? data.tickets?.length ?? 0);
      }
    } catch (err: any) {
      if (err.status === 403 || err.code === "FORBIDDEN") {
        setIsForbidden(true);
      } else {
        setApiError(err instanceof Error ? err.message : "Failed to load tickets from server");
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    auth?.user,
    debouncedSearch,
    categoryId,
    status,
    requestedPriority,
    itPriority,
    assigned,
    sortBy,
    sortOrder,
    page,
    limit,
  ]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Handle immediate search on Enter key
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }
  };

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      // Default to desc for date columns, asc for status/priorities/numbers
      setSortOrder(field.includes("Date") || field.includes("At") ? "desc" : "asc");
    }
    setPage(1);
  };

  // Reset all filters to default
  const handleResetFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setCategoryId("ALL");
    setStatus("ALL");
    setRequestedPriority("ALL");
    setItPriority("ALL");
    setAssigned("all");
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(searchInput.trim()) ||
    categoryId !== "ALL" ||
    status !== "ALL" ||
    requestedPriority !== "ALL" ||
    itPriority !== "ALL" ||
    assigned !== "all";

  const activeFilterCount = [
    Boolean(searchInput.trim()),
    categoryId !== "ALL",
    status !== "ALL",
    requestedPriority !== "ALL",
    itPriority !== "ALL",
    assigned !== "all",
  ].filter(Boolean).length;

  // Format date helper
  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  // Status badge styling helper
  const getStatusBadge = (statusStr: string) => {
    switch (statusStr) {
      case "NEW":
        return { label: "● New", className: "badge-status-new" };
      case "ASSIGNED":
        return { label: "● Assigned", className: "badge-status-assigned" };
      case "IN_PROGRESS":
        return { label: "● In Progress", className: "badge-status-in-progress" };
      case "PENDING_REQUESTER":
        return { label: "● Pending Requester", className: "badge-status-pending-requester" };
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

  // Priority badge styling helper
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

  // Check 403 Forbidden state
  if (!isUserAuthorized || isForbidden) {
    return (
      <main className="container-fluid py-5 px-lg-5 flex-grow-1" style={{ maxWidth: 1280 }} data-testid="forbidden-state">
        <div className="zen-card text-center p-5 mx-auto" style={{ maxWidth: 560 }}>
          <div style={{ fontSize: "3.5rem" }} className="mb-3">
            🚫
          </div>
          <h1 className="h4 fw-bold mb-2 text-danger">Access Denied</h1>
          <p className="text-muted mb-4">
            Access Denied. You do not have permission to view the IT Staff Queue.
          </p>
          <div>
            <button
              type="button"
              className="btn btn-zen-primary"
              onClick={() => (onNavigate ? onNavigate("tickets") : (window.location.href = "#/my-tickets"))}
              data-testid="go-my-tickets-btn"
            >
              Go to My Tickets
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container-fluid py-4 px-lg-5 flex-grow-1" style={{ maxWidth: 1280 }}>
      {/* 1. Header Bar */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1" style={{ color: "var(--color-primary-green)" }}>
            Ticket Queue
          </h1>
          <p className="text-muted small mb-0" data-testid="queue-counter">
            {isLoading
              ? "Loading tickets..."
              : pagination.totalCount > 0
              ? `Showing ${Math.min((page - 1) * limit + 1, pagination.totalCount)} to ${Math.min(
                  page * limit,
                  pagination.totalCount
                )} of ${pagination.totalCount} tickets`
              : "Total: 0 tickets"}
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
            onClick={() => fetchTickets()}
            disabled={isLoading}
            aria-label="Refresh ticket queue"
            data-testid="refresh-queue-btn"
          >
            <span style={{ fontSize: "1rem" }}>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Search & Multi-Field Filter Toolbar */}
      <div className="zen-card p-3 mb-4">
        {/* Mobile Filter Toggle */}
        <div className="d-md-none d-flex justify-content-between align-items-center mb-3">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
            onClick={() => setMobileFiltersExpanded((prev) => !prev)}
            aria-expanded={mobileFiltersExpanded}
            data-testid="mobile-filter-toggle"
          >
            <span>⚙️</span>
            <span>Filters {activeFilterCount > 0 ? `(${activeFilterCount} active)` : ""}</span>
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-sm btn-link text-decoration-none text-danger"
              onClick={handleResetFilters}
            >
              Reset All
            </button>
          )}
        </div>

        {/* Filter Controls Row */}
        <div className={`row g-2 align-items-center ${!mobileFiltersExpanded ? "d-none d-md-flex" : "d-flex"}`}>
          {/* Search Input */}
          <div className="col-12 col-lg-3">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted">🔍</span>
              <input
                type="text"
                className="form-control border-start-0 ps-0"
                placeholder="Search by ticket number or summary..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(1);
                }}
                onKeyDown={handleSearchKeyDown}
                aria-label="Search by ticket number or summary"
                data-testid="search-input"
              />
              {searchInput && (
                <button
                  className="btn btn-outline-secondary border-start-0 border"
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setDebouncedSearch("");
                    setPage(1);
                  }}
                  aria-label="Clear search"
                  data-testid="clear-search-btn"
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
              data-testid="category-filter"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="col-6 col-md-4 col-lg-2">
            <select
              className="form-select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by Status"
              data-testid="status-filter"
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

          {/* Requested Priority Dropdown */}
          <div className="col-6 col-md-4 col-lg-1">
            <select
              className="form-select"
              value={requestedPriority}
              onChange={(e) => {
                setRequestedPriority(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by Requested Priority"
              data-testid="requested-priority-filter"
            >
              <option value="ALL">All Req.</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* IT Priority Dropdown */}
          <div className="col-6 col-md-4 col-lg-1">
            <select
              className="form-select"
              value={itPriority}
              onChange={(e) => {
                setItPriority(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by IT Priority"
              data-testid="it-priority-filter"
            >
              <option value="ALL">All IT</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* Assignment Dropdown */}
          <div className="col-6 col-md-4 col-lg-2">
            <select
              className="form-select"
              value={assigned}
              onChange={(e) => {
                setAssigned(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by Assignment"
              data-testid="assigned-filter"
            >
              <option value="all">All Tickets</option>
              <option value="unassigned">Unassigned</option>
              <option value="mine">Assigned to Me</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          <div className="col-6 col-md-4 col-lg-1 text-end">
            <button
              type="button"
              className="btn btn-outline-secondary w-100"
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
              data-testid="reset-filters-btn"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* 3. API Error State */}
      {apiError && (
        <div
          className="alert alert-danger d-flex align-items-center justify-content-between p-3 mb-4"
          role="alert"
          data-testid="api-error-state"
        >
          <div>
            <strong>Unable to load tickets.</strong> Please check your connection and try again.
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => fetchTickets()}
            data-testid="retry-btn"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4. Loading Skeleton */}
      {isLoading && (
        <div className="zen-card p-4 mb-4" data-testid="loading-skeleton">
          <div className="d-flex flex-column gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="zen-skeleton-bar w-100" style={{ height: "2.5rem" }} />
            ))}
          </div>
        </div>
      )}

      {/* 5. Main Content Area */}
      {!isLoading && !apiError && (
        <>
          {/* Empty Queue State: total baseline queue has 0 tickets */}
          {tickets.length === 0 && !hasActiveFilters && (totalQueueBaseline === 0 || pagination.totalCount === 0) && (
            <div className="zen-card text-center p-5 mb-4" data-testid="empty-queue-state">
              <div style={{ fontSize: "3.5rem" }} className="mb-2">
                📂
              </div>
              <h2 className="h5 fw-bold mb-2">No tickets currently in the queue.</h2>
              <p className="text-muted small mb-0 mx-auto" style={{ maxWidth: 460 }}>
                There are no IT support tickets requiring attention at this time.
              </p>
            </div>
          )}

          {/* No Filter Matches State: tickets exist in system but none match filter */}
          {tickets.length === 0 && hasActiveFilters && (
            <div className="zen-card text-center p-5 mb-4" data-testid="no-results-state">
              <div style={{ fontSize: "3.5rem" }} className="mb-2">
                🔎
              </div>
              <h2 className="h5 fw-bold mb-2">No tickets match the selected filters.</h2>
              <p className="text-muted small mb-4 mx-auto" style={{ maxWidth: 460 }}>
                We couldn&apos;t find any tickets matching your search or filter criteria. Try adjusting your parameters or resetting filters.
              </p>
              <button
                type="button"
                className="btn btn-zen-primary"
                onClick={handleResetFilters}
                data-testid="no-results-reset-btn"
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* Populated Table & Mobile Cards */}
          {tickets.length > 0 && (
            <>
              {/* Desktop & Tablet Table (>=768px) */}
              <div className="d-none d-md-block zen-table-container mb-4 table-responsive">
                <table className="zen-table table align-middle" data-testid="staff-queue-table">
                  <thead>
                    <tr>
                      {/* 1. Ticket Number */}
                      <th
                        className="sortable zen-table-sticky-col"
                        onClick={() => handleSort("ticketNo")}
                        style={{ width: "12%" }}
                      >
                        Ticket No {sortBy === "ticketNo" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                      </th>

                      {/* 2. Created Date */}
                      <th
                        className="sortable"
                        onClick={() => handleSort("createdAt")}
                        style={{ width: "12%" }}
                      >
                        Created Date {sortBy === "createdAt" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                      </th>

                      {/* 3. Summary */}
                      <th style={{ width: "20%" }}>Summary</th>

                      {/* 4. Category */}
                      <th style={{ width: "10%" }}>Category</th>

                      {/* 5. Requested Priority */}
                      <th
                        className="sortable"
                        onClick={() => handleSort("requestedPriority")}
                        style={{ width: "9%" }}
                      >
                        Req. Priority {sortBy === "requestedPriority" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                      </th>

                      {/* 6. IT Priority */}
                      <th
                        className="sortable"
                        onClick={() => handleSort("itPriority")}
                        style={{ width: "9%" }}
                      >
                        IT Priority {sortBy === "itPriority" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                      </th>

                      {/* 7. Status */}
                      <th
                        className="sortable"
                        onClick={() => handleSort("status")}
                        style={{ width: "10%" }}
                      >
                        Status {sortBy === "status" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                      </th>

                      {/* 8. Ticket Owner (Non-sortable per spec) */}
                      <th style={{ width: "9%" }}>Ticket Owner</th>

                      {/* 9. Last Updated */}
                      <th
                        className="sortable text-end"
                        onClick={() => handleSort("updatedAt")}
                        style={{ width: "9%" }}
                      >
                        Last Updated {sortBy === "updatedAt" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t) => {
                      const statusBadge = getStatusBadge(t.status);
                      const reqBadge = getPriorityBadge(t.requestedPriority);
                      const itBadge = getPriorityBadge(t.itPriority);

                      return (
                        <tr
                          key={t.id}
                          style={{ cursor: "pointer" }}
                          onClick={() => onViewDetail?.(t.id)}
                          data-testid={`queue-row-${t.id}`}
                        >
                          {/* 1. Ticket No */}
                          <td className="zen-table-sticky-col">
                            <button
                              type="button"
                              className="btn btn-link p-0 text-decoration-none fw-bold font-monospace"
                              style={{ color: "var(--color-primary-green)" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewDetail?.(t.id);
                              }}
                              data-testid={`ticket-link-${t.id}`}
                            >
                              {t.ticketNo}
                            </button>
                          </td>

                          {/* 2. Created Date */}
                          <td className="text-muted small">{formatDateTime(t.createdAt)}</td>

                          {/* 3. Summary with tooltip */}
                          <td
                            className="fw-semibold text-dark text-truncate"
                            style={{ maxWidth: "220px" }}
                            title={t.summary}
                          >
                            {t.summary.length > 60 ? `${t.summary.substring(0, 60)}…` : t.summary}
                          </td>

                          {/* 4. Category */}
                          <td>
                            <span className="badge bg-light text-dark border">
                              {t.category?.name || "Uncategorized"}
                            </span>
                          </td>

                          {/* 5. Requested Priority */}
                          <td>
                            <span className={`badge ${reqBadge.className}`}>
                              {reqBadge.label}
                            </span>
                          </td>

                          {/* 6. IT Priority */}
                          <td>
                            <span className={`badge ${itBadge.className}`}>
                              {itBadge.label}
                            </span>
                          </td>

                          {/* 7. Status */}
                          <td>
                            <span className={`badge ${statusBadge.className}`}>
                              {statusBadge.label}
                            </span>
                          </td>

                          {/* 8. Ticket Owner */}
                          <td>
                            {t.owner?.displayName ? (
                              <span className="fw-medium text-dark">{t.owner.displayName}</span>
                            ) : (
                              <span className="text-muted fst-italic">Unassigned</span>
                            )}
                          </td>

                          {/* 9. Last Updated */}
                          <td className="text-muted small text-end">{formatDateTime(t.updatedAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Card View (<768px) */}
              <div className="d-md-none mb-4" data-testid="staff-queue-cards">
                {tickets.map((t) => {
                  const statusBadge = getStatusBadge(t.status);
                  const reqBadge = getPriorityBadge(t.requestedPriority);
                  const itBadge = getPriorityBadge(t.itPriority);

                  return (
                    <div
                      key={t.id}
                      className="zen-ticket-card"
                      onClick={() => onViewDetail?.(t.id)}
                      style={{ cursor: "pointer" }}
                      data-testid={`queue-card-${t.id}`}
                    >
                      {/* Card Header: Ticket No & Status */}
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <button
                          type="button"
                          className="btn btn-link p-0 text-decoration-none fw-bold font-monospace"
                          style={{ color: "var(--color-primary-green)" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetail?.(t.id);
                          }}
                        >
                          {t.ticketNo}
                        </button>
                        <span className={`badge ${statusBadge.className}`}>
                          {statusBadge.label}
                        </span>
                      </div>

                      {/* Card Body: Summary, Category & Owner */}
                      <div className="fw-bold mb-2 text-dark">{t.summary}</div>
                      <div className="d-flex flex-wrap gap-2 align-items-center text-muted small mb-3">
                        <span className="badge bg-light text-dark border">
                          {t.category?.name || "Uncategorized"}
                        </span>
                        <span>•</span>
                        <span>
                          Owner:{" "}
                          {t.owner?.displayName ? (
                            <strong className="text-dark">{t.owner.displayName}</strong>
                          ) : (
                            <em className="text-muted">Unassigned</em>
                          )}
                        </span>
                      </div>

                      {/* Card Footer: Priorities & Created Date */}
                      <div className="d-flex justify-content-between align-items-center border-top pt-2 text-muted small">
                        <div className="d-flex gap-2">
                          <span className={`badge ${reqBadge.className}`} title="Requested Priority">
                            Req: {reqBadge.label}
                          </span>
                          <span className={`badge ${itBadge.className}`} title="IT Priority">
                            IT: {itBadge.label}
                          </span>
                        </div>
                        <div>{formatDateTime(t.createdAt)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 6. Pagination Controls */}
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 py-2">
                <div className="d-flex align-items-center gap-3 text-muted small">
                  <span>
                    Showing {Math.min((page - 1) * limit + 1, pagination.totalCount)} to{" "}
                    {Math.min(page * limit, pagination.totalCount)} of {pagination.totalCount} tickets
                  </span>
                  <div className="d-flex align-items-center gap-1">
                    <label htmlFor="staffPageSizeSelect" className="text-nowrap mb-0">
                      Per page:
                    </label>
                    <select
                      id="staffPageSizeSelect"
                      className="form-select form-select-sm"
                      style={{ width: "auto" }}
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setPage(1);
                      }}
                      data-testid="page-size-select"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                {pagination.totalPages > 1 && (
                  <nav aria-label="Ticket queue pagination">
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
                        <button
                          className="page-link"
                          type="button"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page <= 1}
                          aria-label="Previous page"
                          data-testid="pagination-prev-btn"
                        >
                          &lt; Previous
                        </button>
                      </li>
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                        <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
                          <button
                            className="page-link"
                            type="button"
                            onClick={() => setPage(p)}
                            aria-label={`Page ${p}`}
                            data-testid={`pagination-page-${p}`}
                          >
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
                          aria-label="Next page"
                          data-testid="pagination-next-btn"
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
