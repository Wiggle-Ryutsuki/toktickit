import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useContext } from "react";
import { AuthContext } from "../context/AuthContext.js";
import { getStaffTicketsApi, } from "../api.js";
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
export default function StaffTicketQueue({ onViewDetail, onNavigate }) {
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
                sortOrder: "desc",
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
            sortOrder: (params.get("sortOrder") === "asc" ? "asc" : "desc"),
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
    const [categoryId, setCategoryId] = useState(initial.categoryId);
    const [status, setStatus] = useState(initial.status);
    const [requestedPriority, setRequestedPriority] = useState(initial.requestedPriority);
    const [itPriority, setItPriority] = useState(initial.itPriority);
    const [assigned, setAssigned] = useState(initial.assigned);
    // Sorting state
    const [sortBy, setSortBy] = useState(initial.sortBy);
    const [sortOrder, setSortOrder] = useState(initial.sortOrder);
    // Pagination state
    const [page, setPage] = useState(initial.page);
    const [limit, setLimit] = useState(initial.limit);
    // Mobile filters collapsed state
    const [mobileFiltersExpanded, setMobileFiltersExpanded] = useState(false);
    // Data & Lifecycle state
    const [tickets, setTickets] = useState([]);
    const [pagination, setPagination] = useState({
        page: initial.page,
        limit: initial.limit,
        totalCount: 0,
        totalPages: 0,
    });
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [apiError, setApiError] = useState(null);
    const [isForbidden, setIsForbidden] = useState(false);
    // Total baseline tickets count in the queue (to distinguish empty queue vs no filter matches)
    const [totalQueueBaseline, setTotalQueueBaseline] = useState(null);
    // Check if current user is authorized (role check)
    const isUserAuthorized = !auth?.user || auth.user.role === "IT_STAFF" || auth.user.role === "ADMINISTRATOR";
    // Debounce search input (300ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchInput.trim());
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);
    // Sync state to URL search parameters
    const updateUrlParams = useCallback(() => {
        if (typeof window === "undefined")
            return;
        const params = new URLSearchParams();
        if (debouncedSearch)
            params.set("search", debouncedSearch);
        if (categoryId !== "ALL")
            params.set("categoryId", categoryId);
        if (status !== "ALL")
            params.set("status", status);
        if (requestedPriority !== "ALL")
            params.set("requestedPriority", requestedPriority);
        if (itPriority !== "ALL")
            params.set("itPriority", itPriority);
        if (assigned !== "all")
            params.set("assigned", assigned);
        if (sortBy !== "createdAt")
            params.set("sortBy", sortBy);
        if (sortOrder !== "desc")
            params.set("sortOrder", sortOrder);
        if (page > 1)
            params.set("page", String(page));
        if (limit !== 10)
            params.set("limit", String(limit));
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
                    if (isMounted)
                        setCategories(data);
                }
            }
            catch (err) {
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
            setPagination(data.pagination || {
                page: 1,
                limit: 10,
                totalCount: 0,
                totalPages: 0,
            });
            // Track whether the total queue is empty or if zero results are from active filters
            const hasFiltersActive = Boolean(debouncedSearch) ||
                categoryId !== "ALL" ||
                status !== "ALL" ||
                requestedPriority !== "ALL" ||
                itPriority !== "ALL" ||
                assigned !== "all";
            if (!hasFiltersActive) {
                setTotalQueueBaseline(data.pagination?.totalCount ?? data.tickets?.length ?? 0);
            }
        }
        catch (err) {
            if (err.status === 403 || err.code === "FORBIDDEN") {
                setIsForbidden(true);
            }
            else {
                setApiError(err instanceof Error ? err.message : "Failed to load tickets from server");
            }
        }
        finally {
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
    const handleSearchKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            setDebouncedSearch(searchInput.trim());
            setPage(1);
        }
    };
    // Handle sorting
    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
        }
        else {
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
    const hasActiveFilters = Boolean(searchInput.trim()) ||
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
    const formatDateTime = (iso) => {
        try {
            const d = new Date(iso);
            return d.toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        }
        catch {
            return iso;
        }
    };
    // Status badge styling helper
    const getStatusBadge = (statusStr) => {
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
    // Check 403 Forbidden state
    if (!isUserAuthorized || isForbidden) {
        return (_jsx("main", { className: "container-fluid py-5 px-lg-5 flex-grow-1", style: { maxWidth: 1280 }, "data-testid": "forbidden-state", children: _jsxs("div", { className: "zen-card text-center p-5 mx-auto", style: { maxWidth: 560 }, children: [_jsx("div", { style: { fontSize: "3.5rem" }, className: "mb-3", children: "\uD83D\uDEAB" }), _jsx("h1", { className: "h4 fw-bold mb-2 text-danger", children: "Access Denied" }), _jsx("p", { className: "text-muted mb-4", children: "Access Denied. You do not have permission to view the IT Staff Queue." }), _jsx("div", { children: _jsx("button", { type: "button", className: "btn btn-zen-primary", onClick: () => (onNavigate ? onNavigate("tickets") : (window.location.href = "#/my-tickets")), "data-testid": "go-my-tickets-btn", children: "Go to My Tickets" }) })] }) }));
    }
    return (_jsxs("main", { className: "container-fluid py-4 px-lg-5 flex-grow-1", style: { maxWidth: 1280 }, children: [_jsxs("div", { className: "d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "h3 fw-bold mb-1", style: { color: "var(--color-primary-green)" }, children: "Ticket Queue" }), _jsx("p", { className: "text-muted small mb-0", "data-testid": "queue-counter", children: isLoading
                                    ? "Loading tickets..."
                                    : pagination.totalCount > 0
                                        ? `Showing ${Math.min((page - 1) * limit + 1, pagination.totalCount)} to ${Math.min(page * limit, pagination.totalCount)} of ${pagination.totalCount} tickets`
                                        : "Total: 0 tickets" })] }), _jsx("div", { className: "d-flex align-items-center gap-2", children: _jsxs("button", { type: "button", className: "btn btn-outline-secondary d-inline-flex align-items-center gap-2", onClick: () => fetchTickets(), disabled: isLoading, "aria-label": "Refresh ticket queue", "data-testid": "refresh-queue-btn", children: [_jsx("span", { style: { fontSize: "1rem" }, children: "\uD83D\uDD04" }), _jsx("span", { children: "Refresh" })] }) })] }), _jsxs("div", { className: "zen-card p-3 mb-4", children: [_jsxs("div", { className: "d-md-none d-flex justify-content-between align-items-center mb-3", children: [_jsxs("button", { type: "button", className: "btn btn-sm btn-outline-secondary d-flex align-items-center gap-2", onClick: () => setMobileFiltersExpanded((prev) => !prev), "aria-expanded": mobileFiltersExpanded, "data-testid": "mobile-filter-toggle", children: [_jsx("span", { children: "\u2699\uFE0F" }), _jsxs("span", { children: ["Filters ", activeFilterCount > 0 ? `(${activeFilterCount} active)` : ""] })] }), hasActiveFilters && (_jsx("button", { type: "button", className: "btn btn-sm btn-link text-decoration-none text-danger", onClick: handleResetFilters, children: "Reset All" }))] }), _jsxs("div", { className: `row g-2 align-items-center ${!mobileFiltersExpanded ? "d-none d-md-flex" : "d-flex"}`, children: [_jsx("div", { className: "col-12 col-lg-3", children: _jsxs("div", { className: "input-group", children: [_jsx("span", { className: "input-group-text bg-white border-end-0 text-muted", children: "\uD83D\uDD0D" }), _jsx("input", { type: "text", className: "form-control border-start-0 ps-0", placeholder: "Search by ticket number or summary...", value: searchInput, onChange: (e) => {
                                                setSearchInput(e.target.value);
                                                setPage(1);
                                            }, onKeyDown: handleSearchKeyDown, "aria-label": "Search by ticket number or summary", "data-testid": "search-input" }), searchInput && (_jsx("button", { className: "btn btn-outline-secondary border-start-0 border", type: "button", onClick: () => {
                                                setSearchInput("");
                                                setDebouncedSearch("");
                                                setPage(1);
                                            }, "aria-label": "Clear search", "data-testid": "clear-search-btn", children: "\u00D7" }))] }) }), _jsx("div", { className: "col-6 col-md-4 col-lg-2", children: _jsxs("select", { className: "form-select", value: categoryId, onChange: (e) => {
                                        setCategoryId(e.target.value);
                                        setPage(1);
                                    }, "aria-label": "Filter by Category", "data-testid": "category-filter", children: [_jsx("option", { value: "ALL", children: "All Categories" }), categories.map((cat) => (_jsx("option", { value: cat.id, children: cat.name }, cat.id)))] }) }), _jsx("div", { className: "col-6 col-md-4 col-lg-2", children: _jsxs("select", { className: "form-select", value: status, onChange: (e) => {
                                        setStatus(e.target.value);
                                        setPage(1);
                                    }, "aria-label": "Filter by Status", "data-testid": "status-filter", children: [_jsx("option", { value: "ALL", children: "All Statuses" }), _jsx("option", { value: "NEW", children: "New" }), _jsx("option", { value: "ASSIGNED", children: "Assigned" }), _jsx("option", { value: "IN_PROGRESS", children: "In Progress" }), _jsx("option", { value: "PENDING_REQUESTER", children: "Pending Requester" }), _jsx("option", { value: "RESOLVED", children: "Resolved" }), _jsx("option", { value: "CLOSED", children: "Closed" }), _jsx("option", { value: "CANCELLED", children: "Cancelled" })] }) }), _jsx("div", { className: "col-6 col-md-4 col-lg-1", children: _jsxs("select", { className: "form-select", value: requestedPriority, onChange: (e) => {
                                        setRequestedPriority(e.target.value);
                                        setPage(1);
                                    }, "aria-label": "Filter by Requested Priority", "data-testid": "requested-priority-filter", children: [_jsx("option", { value: "ALL", children: "All Req." }), _jsx("option", { value: "LOW", children: "Low" }), _jsx("option", { value: "MEDIUM", children: "Medium" }), _jsx("option", { value: "HIGH", children: "High" }), _jsx("option", { value: "URGENT", children: "Urgent" })] }) }), _jsx("div", { className: "col-6 col-md-4 col-lg-1", children: _jsxs("select", { className: "form-select", value: itPriority, onChange: (e) => {
                                        setItPriority(e.target.value);
                                        setPage(1);
                                    }, "aria-label": "Filter by IT Priority", "data-testid": "it-priority-filter", children: [_jsx("option", { value: "ALL", children: "All IT" }), _jsx("option", { value: "LOW", children: "Low" }), _jsx("option", { value: "MEDIUM", children: "Medium" }), _jsx("option", { value: "HIGH", children: "High" }), _jsx("option", { value: "URGENT", children: "Urgent" })] }) }), _jsx("div", { className: "col-6 col-md-4 col-lg-2", children: _jsxs("select", { className: "form-select", value: assigned, onChange: (e) => {
                                        setAssigned(e.target.value);
                                        setPage(1);
                                    }, "aria-label": "Filter by Assignment", "data-testid": "assigned-filter", children: [_jsx("option", { value: "all", children: "All Tickets" }), _jsx("option", { value: "unassigned", children: "Unassigned" }), _jsx("option", { value: "mine", children: "Assigned to Me" })] }) }), _jsx("div", { className: "col-6 col-md-4 col-lg-1 text-end", children: _jsx("button", { type: "button", className: "btn btn-outline-secondary w-100", onClick: handleResetFilters, disabled: !hasActiveFilters, "data-testid": "reset-filters-btn", children: "Reset" }) })] })] }), apiError && (_jsxs("div", { className: "alert alert-danger d-flex align-items-center justify-content-between p-3 mb-4", role: "alert", "data-testid": "api-error-state", children: [_jsxs("div", { children: [_jsx("strong", { children: "Unable to load tickets." }), " Please check your connection and try again."] }), _jsx("button", { type: "button", className: "btn btn-sm btn-outline-danger", onClick: () => fetchTickets(), "data-testid": "retry-btn", children: "Retry" })] })), isLoading && (_jsx("div", { className: "zen-card p-4 mb-4", "data-testid": "loading-skeleton", children: _jsx("div", { className: "d-flex flex-column gap-3", children: [1, 2, 3, 4, 5].map((i) => (_jsx("div", { className: "zen-skeleton-bar w-100", style: { height: "2.5rem" } }, i))) }) })), !isLoading && !apiError && (_jsxs(_Fragment, { children: [tickets.length === 0 && !hasActiveFilters && (totalQueueBaseline === 0 || pagination.totalCount === 0) && (_jsxs("div", { className: "zen-card text-center p-5 mb-4", "data-testid": "empty-queue-state", children: [_jsx("div", { style: { fontSize: "3.5rem" }, className: "mb-2", children: "\uD83D\uDCC2" }), _jsx("h2", { className: "h5 fw-bold mb-2", children: "No tickets currently in the queue." }), _jsx("p", { className: "text-muted small mb-0 mx-auto", style: { maxWidth: 460 }, children: "There are no IT support tickets requiring attention at this time." })] })), tickets.length === 0 && hasActiveFilters && (_jsxs("div", { className: "zen-card text-center p-5 mb-4", "data-testid": "no-results-state", children: [_jsx("div", { style: { fontSize: "3.5rem" }, className: "mb-2", children: "\uD83D\uDD0E" }), _jsx("h2", { className: "h5 fw-bold mb-2", children: "No tickets match the selected filters." }), _jsx("p", { className: "text-muted small mb-4 mx-auto", style: { maxWidth: 460 }, children: "We couldn't find any tickets matching your search or filter criteria. Try adjusting your parameters or resetting filters." }), _jsx("button", { type: "button", className: "btn btn-zen-primary", onClick: handleResetFilters, "data-testid": "no-results-reset-btn", children: "Reset Filters" })] })), tickets.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "d-none d-md-block zen-table-container mb-4 table-responsive", children: _jsxs("table", { className: "zen-table table align-middle", "data-testid": "staff-queue-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsxs("th", { className: "sortable zen-table-sticky-col", onClick: () => handleSort("ticketNo"), style: { width: "12%" }, children: ["Ticket No ", sortBy === "ticketNo" ? (sortOrder === "asc" ? "▲" : "▼") : ""] }), _jsxs("th", { className: "sortable", onClick: () => handleSort("createdAt"), style: { width: "12%" }, children: ["Created Date ", sortBy === "createdAt" ? (sortOrder === "asc" ? "▲" : "▼") : ""] }), _jsx("th", { style: { width: "20%" }, children: "Summary" }), _jsx("th", { style: { width: "10%" }, children: "Category" }), _jsxs("th", { className: "sortable", onClick: () => handleSort("requestedPriority"), style: { width: "9%" }, children: ["Req. Priority ", sortBy === "requestedPriority" ? (sortOrder === "asc" ? "▲" : "▼") : ""] }), _jsxs("th", { className: "sortable", onClick: () => handleSort("itPriority"), style: { width: "9%" }, children: ["IT Priority ", sortBy === "itPriority" ? (sortOrder === "asc" ? "▲" : "▼") : ""] }), _jsxs("th", { className: "sortable", onClick: () => handleSort("status"), style: { width: "10%" }, children: ["Status ", sortBy === "status" ? (sortOrder === "asc" ? "▲" : "▼") : ""] }), _jsx("th", { style: { width: "9%" }, children: "Ticket Owner" }), _jsxs("th", { className: "sortable text-end", onClick: () => handleSort("updatedAt"), style: { width: "9%" }, children: ["Last Updated ", sortBy === "updatedAt" ? (sortOrder === "asc" ? "▲" : "▼") : ""] })] }) }), _jsx("tbody", { children: tickets.map((t) => {
                                                const statusBadge = getStatusBadge(t.status);
                                                const reqBadge = getPriorityBadge(t.requestedPriority);
                                                const itBadge = getPriorityBadge(t.itPriority);
                                                return (_jsxs("tr", { style: { cursor: "pointer" }, onClick: () => onViewDetail?.(t.id), "data-testid": `queue-row-${t.id}`, children: [_jsx("td", { className: "zen-table-sticky-col", children: _jsx("button", { type: "button", className: "btn btn-link p-0 text-decoration-none fw-bold font-monospace", style: { color: "var(--color-primary-green)" }, onClick: (e) => {
                                                                    e.stopPropagation();
                                                                    onViewDetail?.(t.id);
                                                                }, "data-testid": `ticket-link-${t.id}`, children: t.ticketNo }) }), _jsx("td", { className: "text-muted small", children: formatDateTime(t.createdAt) }), _jsx("td", { className: "fw-semibold text-dark text-truncate", style: { maxWidth: "220px" }, title: t.summary, children: t.summary.length > 60 ? `${t.summary.substring(0, 60)}…` : t.summary }), _jsx("td", { children: _jsx("span", { className: "badge bg-light text-dark border", children: t.category?.name || "Uncategorized" }) }), _jsx("td", { children: _jsx("span", { className: `badge ${reqBadge.className}`, children: reqBadge.label }) }), _jsx("td", { children: _jsx("span", { className: `badge ${itBadge.className}`, children: itBadge.label }) }), _jsx("td", { children: _jsx("span", { className: `badge ${statusBadge.className}`, children: statusBadge.label }) }), _jsx("td", { children: t.owner?.displayName ? (_jsx("span", { className: "fw-medium text-dark", children: t.owner.displayName })) : (_jsx("span", { className: "text-muted fst-italic", children: "Unassigned" })) }), _jsx("td", { className: "text-muted small text-end", children: formatDateTime(t.updatedAt) })] }, t.id));
                                            }) })] }) }), _jsx("div", { className: "d-md-none mb-4", "data-testid": "staff-queue-cards", children: tickets.map((t) => {
                                    const statusBadge = getStatusBadge(t.status);
                                    const reqBadge = getPriorityBadge(t.requestedPriority);
                                    const itBadge = getPriorityBadge(t.itPriority);
                                    return (_jsxs("div", { className: "zen-ticket-card", onClick: () => onViewDetail?.(t.id), style: { cursor: "pointer" }, "data-testid": `queue-card-${t.id}`, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-2", children: [_jsx("button", { type: "button", className: "btn btn-link p-0 text-decoration-none fw-bold font-monospace", style: { color: "var(--color-primary-green)" }, onClick: (e) => {
                                                            e.stopPropagation();
                                                            onViewDetail?.(t.id);
                                                        }, children: t.ticketNo }), _jsx("span", { className: `badge ${statusBadge.className}`, children: statusBadge.label })] }), _jsx("div", { className: "fw-bold mb-2 text-dark", children: t.summary }), _jsxs("div", { className: "d-flex flex-wrap gap-2 align-items-center text-muted small mb-3", children: [_jsx("span", { className: "badge bg-light text-dark border", children: t.category?.name || "Uncategorized" }), _jsx("span", { children: "\u2022" }), _jsxs("span", { children: ["Owner:", " ", t.owner?.displayName ? (_jsx("strong", { className: "text-dark", children: t.owner.displayName })) : (_jsx("em", { className: "text-muted", children: "Unassigned" }))] })] }), _jsxs("div", { className: "d-flex justify-content-between align-items-center border-top pt-2 text-muted small", children: [_jsxs("div", { className: "d-flex gap-2", children: [_jsxs("span", { className: `badge ${reqBadge.className}`, title: "Requested Priority", children: ["Req: ", reqBadge.label] }), _jsxs("span", { className: `badge ${itBadge.className}`, title: "IT Priority", children: ["IT: ", itBadge.label] })] }), _jsx("div", { children: formatDateTime(t.createdAt) })] })] }, t.id));
                                }) }), _jsxs("div", { className: "d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 py-2", children: [_jsxs("div", { className: "d-flex align-items-center gap-3 text-muted small", children: [_jsxs("span", { children: ["Showing ", Math.min((page - 1) * limit + 1, pagination.totalCount), " to", " ", Math.min(page * limit, pagination.totalCount), " of ", pagination.totalCount, " tickets"] }), _jsxs("div", { className: "d-flex align-items-center gap-1", children: [_jsx("label", { htmlFor: "staffPageSizeSelect", className: "text-nowrap mb-0", children: "Per page:" }), _jsxs("select", { id: "staffPageSizeSelect", className: "form-select form-select-sm", style: { width: "auto" }, value: limit, onChange: (e) => {
                                                            setLimit(Number(e.target.value));
                                                            setPage(1);
                                                        }, "data-testid": "page-size-select", children: [_jsx("option", { value: 10, children: "10" }), _jsx("option", { value: 25, children: "25" }), _jsx("option", { value: 50, children: "50" })] })] })] }), pagination.totalPages > 1 && (_jsx("nav", { "aria-label": "Ticket queue pagination", children: _jsxs("ul", { className: "pagination pagination-sm mb-0", children: [_jsx("li", { className: `page-item ${page <= 1 ? "disabled" : ""}`, children: _jsx("button", { className: "page-link", type: "button", onClick: () => setPage((p) => Math.max(1, p - 1)), disabled: page <= 1, "aria-label": "Previous page", "data-testid": "pagination-prev-btn", children: "< Previous" }) }), Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (_jsx("li", { className: `page-item ${p === page ? "active" : ""}`, children: _jsx("button", { className: "page-link", type: "button", onClick: () => setPage(p), "aria-label": `Page ${p}`, "data-testid": `pagination-page-${p}`, children: p }) }, p))), _jsx("li", { className: `page-item ${page >= pagination.totalPages ? "disabled" : ""}`, children: _jsx("button", { className: "page-link", type: "button", onClick: () => setPage((p) => Math.min(pagination.totalPages, p + 1)), disabled: page >= pagination.totalPages, "aria-label": "Next page", "data-testid": "pagination-next-btn", children: "Next >" }) })] }) }))] })] }))] }))] }));
}
