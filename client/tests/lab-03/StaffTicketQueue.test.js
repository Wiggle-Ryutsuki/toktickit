import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import StaffTicketQueue from "../../src/components/StaffTicketQueue";
import { AuthContext } from "../../src/context/AuthContext";
const mockStaffUser = {
    id: 7,
    displayName: "Somchai Staff",
    email: "staff.somchai@kmutt.ac.th",
    role: "IT_STAFF",
    mustChangePassword: false,
};
const mockRequesterUser = {
    id: 1,
    displayName: "Jennifer Requester",
    email: "jennifer.anderson@kmutt.ac.th",
    role: "REQUESTER",
    mustChangePassword: false,
};
const mockCategories = [
    { id: 1, name: "Account and Access", code: "ACC" },
    { id: 2, name: "Hardware", code: "HW" },
    { id: 3, name: "Software", code: "SW" },
    { id: 4, name: "Network", code: "NET" },
];
const mockTickets = [
    {
        id: 101,
        ticketNo: "TKT-2026-00001",
        summary: "VPN connection dropping repeatedly",
        description: "The VPN disconnects every 5 minutes.",
        status: "NEW",
        requestedPriority: "MEDIUM",
        itPriority: "HIGH",
        category: { id: 4, name: "Network" },
        relatedSystem: { id: 4, name: "VPN" },
        requester: { id: 1, displayName: "Jennifer Anderson", email: "jennifer.anderson@kmutt.ac.th" },
        owner: null,
        version: 1,
        createdAt: "2026-09-03T10:15:30.000Z",
        updatedAt: "2026-09-03T10:15:30.000Z",
    },
    {
        id: 102,
        ticketNo: "TKT-2026-00002",
        summary: "Laptop battery drains quickly after Windows update",
        description: "Battery discharges completely within 20 minutes.",
        status: "IN_PROGRESS",
        requestedPriority: "HIGH",
        itPriority: "URGENT",
        category: { id: 2, name: "Hardware" },
        relatedSystem: { id: 2, name: "Corporate Laptop" },
        requester: { id: 2, displayName: "Sarah Johnson", email: "sarah.johnson@kmutt.ac.th" },
        owner: { id: 7, displayName: "Somchai Staff" },
        version: 2,
        createdAt: "2026-09-04T12:30:00.000Z",
        updatedAt: "2026-09-04T14:00:00.000Z",
    },
];
describe("IT Staff Ticket Queue Component (UI-04, UI-05)", () => {
    let fetchMock;
    beforeEach(() => {
        vi.restoreAllMocks();
        window.history.replaceState(null, "", "/staff/queue");
        fetchMock = vi.fn().mockImplementation(async (url) => {
            const urlStr = String(url);
            if (urlStr.includes("/api/categories")) {
                return {
                    ok: true,
                    json: async () => mockCategories,
                };
            }
            if (urlStr.includes("/api/v1/tickets")) {
                // Search filter matching battery
                if (urlStr.includes("search=battery")) {
                    return {
                        ok: true,
                        json: async () => ({
                            tickets: [mockTickets[1]],
                            pagination: { page: 1, limit: 10, totalCount: 1, totalPages: 1 },
                        }),
                    };
                }
                // Search filter matching nothing
                if (urlStr.includes("search=nonexistent")) {
                    return {
                        ok: true,
                        json: async () => ({
                            tickets: [],
                            pagination: { page: 1, limit: 10, totalCount: 0, totalPages: 0 },
                        }),
                    };
                }
                // Category filter
                if (urlStr.includes("categoryId=2")) {
                    return {
                        ok: true,
                        json: async () => ({
                            tickets: [mockTickets[1]],
                            pagination: { page: 1, limit: 10, totalCount: 1, totalPages: 1 },
                        }),
                    };
                }
                // Page 2
                if (urlStr.includes("page=2")) {
                    return {
                        ok: true,
                        json: async () => ({
                            tickets: [mockTickets[1]],
                            pagination: { page: 2, limit: 10, totalCount: 20, totalPages: 2 },
                        }),
                    };
                }
                // Default list response
                return {
                    ok: true,
                    json: async () => ({
                        tickets: mockTickets,
                        pagination: { page: 1, limit: 10, totalCount: 2, totalPages: 1 },
                    }),
                };
            }
            return { ok: false, status: 404 };
        });
        vi.spyOn(globalThis, "fetch").mockImplementation(fetchMock);
    });
    function renderQueue(user = mockStaffUser, props = {}) {
        const mockContext = {
            user,
            isLoading: false,
            isAuthenticated: !!user,
            login: vi.fn(),
            logout: vi.fn(),
            changePassword: vi.fn(),
            refreshUser: vi.fn(),
        };
        return render(_jsx(AuthContext.Provider, { value: mockContext, children: _jsx(StaffTicketQueue, { ...props }) }));
    }
    describe("UI-04: Queue Table, Search, Filters & Sorting", () => {
        it("UI-04.1: Renders 9-column IT Staff Queue table with sortable headers and accessible badges", async () => {
            renderQueue();
            await waitFor(() => {
                expect(screen.getByTestId("staff-queue-table")).toBeInTheDocument();
            });
            // Assert 9 table headers
            const table = screen.getByTestId("staff-queue-table");
            const headers = within(table).getAllByRole("columnheader");
            expect(headers).toHaveLength(9);
            expect(headers[0]).toHaveTextContent(/Ticket No/i);
            expect(headers[1]).toHaveTextContent(/Created Date/i);
            expect(headers[2]).toHaveTextContent(/Summary/i);
            expect(headers[3]).toHaveTextContent(/Category/i);
            expect(headers[4]).toHaveTextContent(/Req\. Priority/i);
            expect(headers[5]).toHaveTextContent(/IT Priority/i);
            expect(headers[6]).toHaveTextContent(/Status/i);
            expect(headers[7]).toHaveTextContent(/Ticket Owner/i);
            expect(headers[8]).toHaveTextContent(/Last Updated/i);
            // Verify row 1 contents
            const row1 = screen.getByTestId("queue-row-101");
            expect(within(row1).getByText("TKT-2026-00001")).toBeInTheDocument();
            expect(within(row1).getByText("VPN connection dropping repeatedly")).toBeInTheDocument();
            expect(within(row1).getByText("Network")).toBeInTheDocument();
            expect(within(row1).getByText("→ Medium")).toBeInTheDocument();
            expect(within(row1).getByText("↑ High")).toBeInTheDocument();
            expect(within(row1).getByText("● New")).toBeInTheDocument();
            expect(within(row1).getByText("Unassigned")).toBeInTheDocument();
            // Verify row 2 contents with assigned owner
            const row2 = screen.getByTestId("queue-row-102");
            expect(within(row2).getByText("TKT-2026-00002")).toBeInTheDocument();
            expect(within(row2).getByText("Somchai Staff")).toBeInTheDocument();
            expect(within(row2).getByText("▲ Urgent")).toBeInTheDocument();
            expect(within(row2).getByText("● In Progress")).toBeInTheDocument();
        });
        it("UI-04.2: Debounced search triggers query after 300ms, and immediate query on Enter key", async () => {
            renderQueue();
            await waitFor(() => {
                expect(screen.getByTestId("search-input")).toBeInTheDocument();
            });
            const searchInput = screen.getByTestId("search-input");
            fireEvent.change(searchInput, { target: { value: "battery" } });
            // Immediate Enter key triggers search
            fireEvent.keyDown(searchInput, { key: "Enter", code: "Enter" });
            await waitFor(() => {
                expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("search=battery"), expect.any(Object));
            });
            // Verify clear button works
            const clearBtn = screen.getByTestId("clear-search-btn");
            fireEvent.click(clearBtn);
            expect(searchInput).toHaveValue("");
        });
        it("UI-04.3: Changing category, status, priority, and assignment filters updates query parameters", async () => {
            renderQueue();
            await waitFor(() => {
                expect(screen.getByTestId("category-filter")).toBeInTheDocument();
            });
            // Filter by category
            fireEvent.change(screen.getByTestId("category-filter"), { target: { value: "2" } });
            await waitFor(() => {
                expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("categoryId=2"), expect.any(Object));
            });
            // Filter by status
            fireEvent.change(screen.getByTestId("status-filter"), { target: { value: "IN_PROGRESS" } });
            await waitFor(() => {
                expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("status=IN_PROGRESS"), expect.any(Object));
            });
            // Filter by assignment
            fireEvent.change(screen.getByTestId("assigned-filter"), { target: { value: "mine" } });
            await waitFor(() => {
                expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("assigned=mine"), expect.any(Object));
            });
        });
        it("UI-04.4: Clicking sortable headers toggles sort field and order (asc/desc)", async () => {
            renderQueue();
            await waitFor(() => {
                expect(screen.getByTestId("staff-queue-table")).toBeInTheDocument();
            });
            const table = screen.getByTestId("staff-queue-table");
            const headers = within(table).getAllByRole("columnheader");
            // Click Ticket No header
            fireEvent.click(headers[0]);
            await waitFor(() => {
                expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("sortBy=ticketNo"), expect.any(Object));
            });
        });
        it("UI-04.5: Triggers onViewDetail callback when ticket number is clicked", async () => {
            const handleViewDetail = vi.fn();
            renderQueue(mockStaffUser, { onViewDetail: handleViewDetail });
            await waitFor(() => {
                expect(screen.getByTestId("ticket-link-101")).toBeInTheDocument();
            });
            fireEvent.click(screen.getByTestId("ticket-link-101"));
            expect(handleViewDetail).toHaveBeenCalledWith(101);
        });
    });
    describe("UI-05: Pagination, Feedback States & Security Access Control", () => {
        it("UI-05.1: Pagination bar renders and page buttons trigger navigation", async () => {
            // Mock page 1 of 2
            fetchMock.mockImplementation(async (url) => {
                const urlStr = String(url);
                if (urlStr.includes("/api/categories")) {
                    return { ok: true, json: async () => mockCategories };
                }
                return {
                    ok: true,
                    json: async () => ({
                        tickets: mockTickets,
                        pagination: { page: 1, limit: 10, totalCount: 20, totalPages: 2 },
                    }),
                };
            });
            renderQueue();
            await waitFor(() => {
                expect(screen.getByTestId("pagination-page-2")).toBeInTheDocument();
            });
            fireEvent.click(screen.getByTestId("pagination-page-2"));
            await waitFor(() => {
                expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("page=2"), expect.any(Object));
            });
        });
        it("UI-05.2: Renders Empty Queue state when total queue baseline has 0 tickets", async () => {
            fetchMock.mockImplementation(async (url) => {
                const urlStr = String(url);
                if (urlStr.includes("/api/categories")) {
                    return { ok: true, json: async () => mockCategories };
                }
                return {
                    ok: true,
                    json: async () => ({
                        tickets: [],
                        pagination: { page: 1, limit: 10, totalCount: 0, totalPages: 0 },
                    }),
                };
            });
            renderQueue();
            await waitFor(() => {
                expect(screen.getByTestId("empty-queue-state")).toBeInTheDocument();
            });
            expect(screen.getByText("No tickets currently in the queue.")).toBeInTheDocument();
        });
        it("UI-05.3: Renders No-Results State when filters match 0 tickets and Reset restores default", async () => {
            renderQueue();
            await waitFor(() => {
                expect(screen.getByTestId("search-input")).toBeInTheDocument();
            });
            // Type nonexistent search
            const searchInput = screen.getByTestId("search-input");
            fireEvent.change(searchInput, { target: { value: "nonexistent" } });
            fireEvent.keyDown(searchInput, { key: "Enter", code: "Enter" });
            await waitFor(() => {
                expect(screen.getByTestId("no-results-state")).toBeInTheDocument();
            });
            expect(screen.getByText("No tickets match the selected filters.")).toBeInTheDocument();
            // Click Reset Filters
            const resetBtn = screen.getByTestId("no-results-reset-btn");
            fireEvent.click(resetBtn);
            await waitFor(() => {
                expect(screen.getByTestId("staff-queue-table")).toBeInTheDocument();
            });
        });
        it("UI-05.4: Access Control: Renders 403 Forbidden state when user role is REQUESTER", async () => {
            renderQueue(mockRequesterUser);
            await waitFor(() => {
                expect(screen.getByTestId("forbidden-state")).toBeInTheDocument();
            });
            expect(screen.getByText(/Access Denied\. You do not have permission to view the IT Staff Queue\./i)).toBeInTheDocument();
            expect(screen.getByTestId("go-my-tickets-btn")).toBeInTheDocument();
        });
        it("UI-05.5: Renders API Error state with Retry button on server failure", async () => {
            fetchMock.mockImplementation(async (url) => {
                const urlStr = String(url);
                if (urlStr.includes("/api/categories")) {
                    return { ok: true, json: async () => mockCategories };
                }
                return {
                    ok: false,
                    status: 500,
                    json: async () => ({ error: { message: "Internal server error" } }),
                };
            });
            renderQueue();
            await waitFor(() => {
                expect(screen.getByTestId("api-error-state")).toBeInTheDocument();
            });
            expect(screen.getByText(/Unable to load tickets\./i)).toBeInTheDocument();
            expect(screen.getByTestId("retry-btn")).toBeInTheDocument();
        });
    });
});
