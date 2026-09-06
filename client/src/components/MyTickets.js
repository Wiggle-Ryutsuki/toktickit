import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRequester } from "../context/RequesterContext.js";
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
export default function MyTickets({ onNavigateCreate, onViewDetail }) {
    const { selectedRequester } = useRequester();
    // Search & Filter state
    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [categoryId, setCategoryId] = useState("ALL");
    const [requestedPriority, setRequestedPriority] = useState("ALL");
    const [itPriority, setItPriority] = useState("ALL");
    const [status, setStatus] = useState("ALL");
    // Sorting state
    const [sortBy, setSortBy] = useState("createdAt");
    const [sortOrder, setSortOrder] = useState("desc");
    // Pagination state
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    // Data & Lifecycle state
    const [tickets, setTickets] = useState([]);
    const [pagination, setPagination] = useState({
        totalItems: 0,
        totalPages: 0,
        currentPage: 1,
        limit: 10,
    });
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [apiError, setApiError] = useState(null);
    // Total baseline tickets count for the current requester (to distinguish empty vs no-results)
    const [requesterTotalTickets, setRequesterTotalTickets] = useState(null);
    // Search debounce effect (300ms)
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchInput.trim());
        }, 300);
        return () => clearTimeout(handler);
    }, [searchInput]);
    // Context Switch Invariant (BR-16): reset all search/filters/page when requester changes
    const prevRequesterIdRef = useRef(null);
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
        if (!selectedRequester)
            return;
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
        if (!selectedRequester)
            return;
        setIsLoading(true);
        setApiError(null);
        try {
            const params = new URLSearchParams();
            params.set("requesterId", String(selectedRequester.id));
            params.set("page", String(page));
            params.set("limit", String(limit));
            params.set("sortBy", sortBy);
            params.set("sortOrder", sortOrder);
            if (debouncedSearch)
                params.set("search", debouncedSearch);
            if (categoryId !== "ALL")
                params.set("categoryId", categoryId);
            if (requestedPriority !== "ALL")
                params.set("requestedPriority", requestedPriority);
            if (itPriority !== "ALL")
                params.set("itPriority", itPriority);
            if (status !== "ALL")
                params.set("status", status);
            const res = await fetch(`${API_URL}/api/tickets?${params.toString()}`);
            if (!res.ok) {
                throw new Error(`API returned HTTP ${res.status}`);
            }
            const json = await res.json();
            setTickets(json.data || []);
            setPagination(json.pagination || {
                totalItems: 0,
                totalPages: 0,
                currentPage: 1,
                limit,
            });
            // Track if requester has ever submitted any ticket (for empty state vs no-results distinction)
            const hasFiltersActive = Boolean(debouncedSearch) ||
                categoryId !== "ALL" ||
                requestedPriority !== "ALL" ||
                itPriority !== "ALL" ||
                status !== "ALL";
            if (!hasFiltersActive) {
                setRequesterTotalTickets(json.pagination?.totalItems ?? json.data?.length ?? 0);
            }
        }
        catch (err) {
            setApiError(err instanceof Error ? err.message : "Failed to load tickets from server");
        }
        finally {
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
    function handleSort(field) {
        if (sortBy === field) {
            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
        }
        else {
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
    const hasActiveFilters = Boolean(searchInput.trim()) ||
        categoryId !== "ALL" ||
        requestedPriority !== "ALL" ||
        itPriority !== "ALL" ||
        status !== "ALL";
    // Format date helper
    function formatDate(iso) {
        try {
            const d = new Date(iso);
            return d.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
            });
        }
        catch {
            return iso;
        }
    }
    // Badge class helpers
    function getStatusBadgeClass(statusStr) {
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
    function getPriorityBadgeClass(pStr) {
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
    function formatStatusLabel(s) {
        return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
    function formatPriorityLabel(p) {
        return p.charAt(0) + p.slice(1).toLowerCase();
    }
    return (_jsxs("main", { className: "container-fluid py-4 px-lg-5 flex-grow-1", style: { maxWidth: 1280 }, children: [_jsxs("div", { className: "d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "h3 fw-bold mb-1", style: { color: "var(--color-primary-green)" }, children: "My Tickets" }), _jsx("p", { className: "text-muted small mb-0", children: "View, track, search, and manage all your submitted IT support requests." })] }), _jsx("div", { className: "d-none d-md-block", children: _jsxs("button", { type: "button", className: "btn btn-zen-primary d-inline-flex align-items-center gap-2", onClick: onNavigateCreate, "data-testid": "create-ticket-btn", children: [_jsx("span", { children: "+" }), _jsx("span", { children: "Create Ticket" })] }) })] }), _jsx("div", { className: "zen-card p-3 mb-4", children: _jsxs("div", { className: "row g-2 align-items-center", children: [_jsx("div", { className: "col-12 col-md-4 col-lg-2", children: _jsxs("div", { className: "input-group", children: [_jsx("span", { className: "input-group-text bg-white border-end-0 text-muted", children: "\uD83D\uDD0D" }), _jsx("input", { type: "text", className: "form-control border-start-0 ps-0", placeholder: "Search by ticket # or summary...", value: searchInput, onChange: (e) => {
                                            setSearchInput(e.target.value);
                                            setPage(1);
                                        }, "aria-label": "Search tickets" }), searchInput && (_jsx("button", { className: "btn btn-outline-secondary border-start-0 border", type: "button", onClick: () => {
                                            setSearchInput("");
                                            setPage(1);
                                        }, "aria-label": "Clear search text", children: "\u00D7" }))] }) }), _jsx("div", { className: "col-6 col-md-4 col-lg-2", children: _jsxs("select", { className: "form-select", value: categoryId, onChange: (e) => {
                                    setCategoryId(e.target.value);
                                    setPage(1);
                                }, "aria-label": "Filter by Category", children: [_jsx("option", { value: "ALL", children: "All Categories" }), categories.map((cat) => (_jsx("option", { value: cat.id, children: cat.name }, cat.id)))] }) }), _jsx("div", { className: "col-6 col-md-4 col-lg-2", children: _jsxs("select", { className: "form-select", value: requestedPriority, onChange: (e) => {
                                    setRequestedPriority(e.target.value);
                                    setPage(1);
                                }, "aria-label": "Filter by Requested Priority", children: [_jsx("option", { value: "ALL", children: "All Req. Priorities" }), _jsx("option", { value: "LOW", children: "Low" }), _jsx("option", { value: "MEDIUM", children: "Medium" }), _jsx("option", { value: "HIGH", children: "High" }), _jsx("option", { value: "URGENT", children: "Urgent" })] }) }), _jsx("div", { className: "col-6 col-md-4 col-lg-2", children: _jsxs("select", { className: "form-select", value: itPriority, onChange: (e) => {
                                    setItPriority(e.target.value);
                                    setPage(1);
                                }, "aria-label": "Filter by IT Priority", children: [_jsx("option", { value: "ALL", children: "All IT Priorities" }), _jsx("option", { value: "LOW", children: "Low" }), _jsx("option", { value: "MEDIUM", children: "Medium" }), _jsx("option", { value: "HIGH", children: "High" }), _jsx("option", { value: "URGENT", children: "Urgent" })] }) }), _jsx("div", { className: "col-6 col-md-4 col-lg-2", children: _jsxs("select", { className: "form-select", value: status, onChange: (e) => {
                                    setStatus(e.target.value);
                                    setPage(1);
                                }, "aria-label": "Filter by Status", children: [_jsx("option", { value: "ALL", children: "All Statuses" }), _jsx("option", { value: "NEW", children: "New" }), _jsx("option", { value: "ASSIGNED", children: "Assigned" }), _jsx("option", { value: "IN_PROGRESS", children: "In Progress" }), _jsx("option", { value: "PENDING_REQUESTER", children: "Pending Requester" }), _jsx("option", { value: "RESOLVED", children: "Resolved" }), _jsx("option", { value: "CLOSED", children: "Closed" }), _jsx("option", { value: "CANCELLED", children: "Cancelled" })] }) }), _jsx("div", { className: "col-12 col-md-4 col-lg-2 text-md-end", children: _jsx("button", { type: "button", className: "btn btn-outline-secondary w-100", onClick: handleClearFilters, disabled: !hasActiveFilters, children: "Clear Filters" }) })] }) }), apiError && (_jsxs("div", { className: "alert alert-danger d-flex align-items-center justify-content-between p-3 mb-4", role: "alert", children: [_jsxs("div", { children: [_jsx("strong", { children: "Unable to load tickets from server." }), " Please check your connection and try again."] }), _jsx("button", { type: "button", className: "btn btn-sm btn-outline-danger", onClick: fetchTickets, children: "Retry" })] })), isLoading && (_jsx("div", { className: "zen-card p-4 mb-4", children: _jsx("div", { className: "d-flex flex-column gap-3", children: [1, 2, 3, 4].map((i) => (_jsx("div", { className: "zen-skeleton-bar w-100", style: { height: "2.5rem" } }, i))) }) })), !isLoading && !apiError && (_jsxs(_Fragment, { children: [tickets.length === 0 && !hasActiveFilters && (requesterTotalTickets === 0 || pagination.totalItems === 0) && (_jsxs("div", { className: "zen-card text-center p-5 mb-4", "data-testid": "empty-tickets-state", children: [_jsx("div", { style: { fontSize: "3rem" }, className: "mb-2", children: "\uD83D\uDCC2" }), _jsx("h2", { className: "h5 fw-bold mb-2", children: "No tickets submitted yet" }), _jsx("p", { className: "text-muted small mb-4 mx-auto", style: { maxWidth: 460 }, children: "You have not created any IT support tickets. Need help with hardware, software, or account access?" }), _jsx("button", { type: "button", className: "btn btn-zen-primary", onClick: onNavigateCreate, children: "+ Create Ticket" })] })), tickets.length === 0 && hasActiveFilters && (_jsxs("div", { className: "zen-card text-center p-5 mb-4", "data-testid": "no-results-state", children: [_jsx("div", { style: { fontSize: "3rem" }, className: "mb-2", children: "\uD83D\uDD0E" }), _jsx("h2", { className: "h5 fw-bold mb-2", children: "No matching tickets found" }), _jsx("p", { className: "text-muted small mb-4 mx-auto", style: { maxWidth: 460 }, children: "We couldn't find any tickets matching your search criteria. Try adjusting your search term or clearing your filters." }), _jsx("button", { type: "button", className: "btn btn-zen-secondary", onClick: handleClearFilters, children: "Clear Filters" })] })), tickets.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "d-none d-md-block zen-table-container mb-4 table-responsive", children: _jsxs("table", { className: "zen-table table align-middle", "data-testid": "tickets-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsxs("th", { className: "sortable", onClick: () => handleSort("ticketNo"), style: { width: "12%" }, children: ["Ticket No ", sortBy === "ticketNo" ? (sortOrder === "asc" ? "▲" : "▼") : ""] }), _jsxs("th", { className: "sortable", onClick: () => handleSort("createdAt"), style: { width: "11%" }, children: ["Created Date ", sortBy === "createdAt" ? (sortOrder === "asc" ? "▲" : "▼") : ""] }), _jsx("th", { style: { width: "20%" }, children: "Summary" }), _jsx("th", { style: { width: "10%" }, children: "Category" }), _jsx("th", { style: { width: "9%" }, children: "Req. Priority" }), _jsx("th", { style: { width: "9%" }, children: "IT Priority" }), _jsx("th", { style: { width: "9%" }, children: "Status" }), _jsx("th", { style: { width: "9%" }, children: "Ticket Owner" }), _jsxs("th", { className: "sortable", onClick: () => handleSort("updatedAt"), style: { width: "10%" }, children: ["Last Updated ", sortBy === "updatedAt" ? (sortOrder === "asc" ? "▲" : "▼") : ""] }), _jsx("th", { className: "text-end", style: { width: "7%" }, children: "Actions" })] }) }), _jsx("tbody", { children: tickets.map((t) => (_jsxs("tr", { style: { cursor: "pointer" }, onClick: () => onViewDetail?.(t.id), children: [_jsx("td", { className: "fw-semibold", style: { color: "var(--color-primary-green)" }, children: t.ticketNo }), _jsx("td", { className: "text-muted", children: formatDate(t.createdAt) }), _jsx("td", { className: "fw-medium text-dark", children: t.summary }), _jsx("td", { children: _jsx("span", { className: "badge bg-light text-dark border", children: t.categoryName }) }), _jsx("td", { children: _jsx("span", { className: `badge ${getPriorityBadgeClass(t.requestedPriority)}`, children: formatPriorityLabel(t.requestedPriority) }) }), _jsx("td", { children: _jsx("span", { className: `badge ${getPriorityBadgeClass(t.itPriority)}`, children: formatPriorityLabel(t.itPriority) }) }), _jsx("td", { children: _jsx("span", { className: `badge ${getStatusBadgeClass(t.status)}`, children: formatStatusLabel(t.status) }) }), _jsx("td", { className: "text-muted", children: t.ticketOwner ?? "—" }), _jsx("td", { className: "text-muted", children: formatDate(t.updatedAt) }), _jsx("td", { className: "text-end", children: _jsx("button", { type: "button", className: "btn btn-sm btn-link text-decoration-none p-0", onClick: (e) => {
                                                                e.stopPropagation();
                                                                onViewDetail?.(t.id);
                                                            }, children: "Details \u2192" }) })] }, t.id))) })] }) }), _jsx("div", { className: "d-md-none mb-4", children: tickets.map((t) => (_jsxs("div", { className: "zen-ticket-card", onClick: () => onViewDetail?.(t.id), style: { cursor: "pointer" }, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-2", children: [_jsx("span", { className: "fw-bold", style: { color: "var(--color-primary-green)" }, children: t.ticketNo }), _jsx("span", { className: `badge ${getStatusBadgeClass(t.status)}`, children: formatStatusLabel(t.status) })] }), _jsx("div", { className: "fw-semibold mb-2", children: t.summary }), _jsxs("div", { className: "d-flex flex-wrap gap-2 align-items-center text-muted small mb-3", children: [_jsx("span", { className: "badge bg-light text-dark border", children: t.categoryName }), _jsx("span", { className: `badge ${getPriorityBadgeClass(t.requestedPriority)}`, children: formatPriorityLabel(t.requestedPriority) }), _jsx("span", { children: "\u2022" }), _jsxs("span", { children: ["Owner: ", t.ticketOwner ?? "—"] }), _jsx("span", { children: "\u2022" }), _jsx("span", { children: formatDate(t.createdAt) })] }), _jsxs("div", { className: "d-flex justify-content-between align-items-center border-top pt-2", children: [_jsxs("span", { className: "text-muted small", children: ["Updated ", formatDate(t.updatedAt)] }), _jsx("button", { type: "button", className: "btn btn-sm btn-link text-decoration-none p-0", onClick: (e) => {
                                                        e.stopPropagation();
                                                        onViewDetail?.(t.id);
                                                    }, children: "View Details \u2192" })] })] }, t.id))) }), _jsxs("div", { className: "d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 py-2", children: [_jsxs("div", { className: "d-flex align-items-center gap-3 text-muted small", children: [_jsxs("span", { children: ["Showing ", Math.min((page - 1) * limit + 1, pagination.totalItems), " to", " ", Math.min(page * limit, pagination.totalItems), " of ", pagination.totalItems, " tickets"] }), _jsxs("div", { className: "d-flex align-items-center gap-1", children: [_jsx("label", { htmlFor: "pageSizeSelect", className: "text-nowrap mb-0", children: "Per page:" }), _jsxs("select", { id: "pageSizeSelect", className: "form-select form-select-sm", style: { width: "auto" }, value: limit, onChange: (e) => {
                                                            setLimit(Number(e.target.value));
                                                            setPage(1);
                                                        }, children: [_jsx("option", { value: 10, children: "10" }), _jsx("option", { value: 25, children: "25" }), _jsx("option", { value: 50, children: "50" })] })] })] }), pagination.totalPages > 1 && (_jsx("nav", { "aria-label": "Ticket list pagination", children: _jsxs("ul", { className: "pagination pagination-sm mb-0", children: [_jsx("li", { className: `page-item ${page <= 1 ? "disabled" : ""}`, children: _jsx("button", { className: "page-link", type: "button", onClick: () => setPage((p) => Math.max(1, p - 1)), disabled: page <= 1, children: "< Previous" }) }), Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (_jsx("li", { className: `page-item ${p === page ? "active" : ""}`, children: _jsx("button", { className: "page-link", type: "button", onClick: () => setPage(p), children: p }) }, p))), _jsx("li", { className: `page-item ${page >= pagination.totalPages ? "disabled" : ""}`, children: _jsx("button", { className: "page-link", type: "button", onClick: () => setPage((p) => Math.min(pagination.totalPages, p + 1)), disabled: page >= pagination.totalPages, children: "Next >" }) })] }) }))] })] }))] }))] }));
}
