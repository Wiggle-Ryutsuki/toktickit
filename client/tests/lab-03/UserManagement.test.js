import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UserManagement from "../../src/components/UserManagement";
import { AuthContext } from "../../src/context/AuthContext";
const mockAdminUser = {
    id: 9,
    displayName: "TokTickIT Administrator",
    email: "admin.toktickit@kmutt.ac.th",
    role: "ADMINISTRATOR",
    mustChangePassword: false,
};
const mockStaffUser = {
    id: 5,
    displayName: "Somchai Jaidee",
    email: "staff.somchai@kmutt.ac.th",
    role: "IT_STAFF",
    mustChangePassword: false,
};
const mockInitialUsers = [
    {
        id: 1,
        displayName: "Jennifer Anderson",
        email: "jennifer.anderson@kmutt.ac.th",
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
        createdAt: "2026-09-01T08:00:00.000Z",
        updatedAt: "2026-09-01T08:00:00.000Z",
    },
    {
        id: 5,
        displayName: "Somchai Jaidee",
        email: "staff.somchai@kmutt.ac.th",
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: false,
        createdAt: "2026-09-01T08:30:00.000Z",
        updatedAt: "2026-09-01T08:30:00.000Z",
    },
    {
        id: 8,
        displayName: "Alex Taylor",
        email: "alex.taylor.inactive@kmutt.ac.th",
        role: "REQUESTER",
        isActive: false,
        mustChangePassword: false,
        createdAt: "2026-09-01T09:00:00.000Z",
        updatedAt: "2026-09-01T09:00:00.000Z",
    },
    {
        id: 9,
        displayName: "TokTickIT Administrator",
        email: "admin.toktickit@kmutt.ac.th",
        role: "ADMINISTRATOR",
        isActive: true,
        mustChangePassword: false,
        createdAt: "2026-09-01T07:00:00.000Z",
        updatedAt: "2026-09-01T07:00:00.000Z",
    },
];
function renderWithAuth(ui, authUser = mockAdminUser, refreshUserMock = vi.fn()) {
    const authContextValue = {
        user: authUser,
        isLoading: false,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
        changePassword: vi.fn(),
        refreshUser: refreshUserMock,
    };
    return render(_jsx(AuthContext.Provider, { value: authContextValue, children: ui }));
}
describe("Administrator User Management Component (UI-09, UI-10)", () => {
    let fetchMock;
    beforeEach(() => {
        vi.restoreAllMocks();
        fetchMock = vi.fn().mockImplementation(async (url, init) => {
            const urlStr = String(url);
            const method = init?.method || "GET";
            if (urlStr.includes("/api/v1/admin/users") && method === "GET") {
                const u = new URL(urlStr, "http://localhost:3000");
                const search = u.searchParams.get("search");
                const role = u.searchParams.get("role");
                let filtered = [...mockInitialUsers];
                if (role && role !== "ALL") {
                    filtered = filtered.filter((user) => user.role === role);
                }
                if (search) {
                    const s = search.toLowerCase();
                    filtered = filtered.filter((user) => user.displayName.toLowerCase().includes(s) ||
                        user.email.toLowerCase().includes(s));
                }
                return {
                    ok: true,
                    status: 200,
                    json: async () => filtered,
                };
            }
            if (urlStr.includes("/api/v1/admin/users") && method === "POST" && !urlStr.includes("reset-password")) {
                const body = JSON.parse(init.body);
                const newUser = {
                    id: 10,
                    displayName: body.displayName,
                    email: body.email,
                    role: body.role,
                    isActive: body.isActive ?? true,
                    mustChangePassword: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                return {
                    ok: true,
                    status: 201,
                    json: async () => newUser,
                };
            }
            if (urlStr.includes("/api/v1/admin/users") && method === "PATCH") {
                const body = JSON.parse(init.body);
                const segments = urlStr.split("/");
                const id = parseInt(segments[segments.length - 1], 10);
                const existing = mockInitialUsers.find((user) => user.id === id) || mockInitialUsers[0];
                const updated = {
                    ...existing,
                    ...body,
                    updatedAt: new Date().toISOString(),
                };
                return {
                    ok: true,
                    status: 200,
                    json: async () => updated,
                };
            }
            if (urlStr.includes("/reset-password") && method === "POST") {
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({
                        message: "Initial password successfully updated. User must change password at next login.",
                        userId: 5,
                        mustChangePassword: true,
                    }),
                };
            }
            return {
                ok: false,
                status: 404,
                json: async () => ({ error: { message: "Not found" } }),
            };
        });
        vi.spyOn(globalThis, "fetch").mockImplementation(fetchMock);
    });
    // =========================================================================
    // UI-09: Administrator User Management Screen & Modals
    // =========================================================================
    describe("UI-09: Screen rendering, filtering, creation and error states", () => {
        it("renders User Management table with Name, Email, Role pill, and Status badge", async () => {
            renderWithAuth(_jsx(UserManagement, {}));
            // Should display table and initial users
            await waitFor(() => {
                expect(screen.getByTestId("user-management-table")).toBeInTheDocument();
            });
            expect(screen.getByTestId("user-name-1")).toHaveTextContent("Jennifer Anderson");
            expect(screen.getByTestId("user-email-1")).toHaveTextContent("jennifer.anderson@kmutt.ac.th");
            expect(screen.getByTestId("user-role-1")).toHaveTextContent("Requester");
            expect(screen.getByTestId("user-status-1")).toHaveTextContent("Active");
            expect(screen.getByTestId("user-name-8")).toHaveTextContent("Alex Taylor");
            expect(screen.getByTestId("user-status-8")).toHaveTextContent("Inactive");
            expect(screen.getByTestId("user-count")).toHaveTextContent("Showing 4 user accounts");
        });
        it("filters user table by typing in the search input", async () => {
            renderWithAuth(_jsx(UserManagement, {}));
            await waitFor(() => {
                expect(screen.getByTestId("user-name-1")).toBeInTheDocument();
            });
            const searchInput = screen.getByTestId("search-user-input");
            fireEvent.change(searchInput, { target: { value: "Somchai" } });
            // Wait for debounce and refetch
            await waitFor(() => {
                expect(screen.getByTestId("user-name-5")).toHaveTextContent("Somchai Jaidee");
                expect(screen.queryByTestId("user-name-1")).not.toBeInTheDocument();
            });
            expect(screen.getByTestId("user-count")).toHaveTextContent("Showing 1 user account");
        });
        it("filters user table by role selector dropdown", async () => {
            renderWithAuth(_jsx(UserManagement, {}));
            await waitFor(() => {
                expect(screen.getByTestId("user-name-1")).toBeInTheDocument();
            });
            const roleSelect = screen.getByTestId("role-filter-select");
            fireEvent.change(roleSelect, { target: { value: "ADMINISTRATOR" } });
            await waitFor(() => {
                expect(screen.getByTestId("user-name-9")).toHaveTextContent("TokTickIT Administrator");
                expect(screen.queryByTestId("user-name-1")).not.toBeInTheDocument();
                expect(screen.queryByTestId("user-name-5")).not.toBeInTheDocument();
            });
        });
        it("renders empty results message with Clear Filters button when query matches 0 users", async () => {
            renderWithAuth(_jsx(UserManagement, {}));
            await waitFor(() => {
                expect(screen.getByTestId("user-name-1")).toBeInTheDocument();
            });
            const searchInput = screen.getByTestId("search-user-input");
            fireEvent.change(searchInput, { target: { value: "NonExistentUser999" } });
            await waitFor(() => {
                expect(screen.getByTestId("no-results-state")).toBeInTheDocument();
            });
            expect(screen.getByText("No user accounts match your search criteria. Try clearing filters.")).toBeInTheDocument();
            // Click Clear Filters
            const clearBtn = screen.getByTestId("no-results-clear-btn");
            fireEvent.click(clearBtn);
            await waitFor(() => {
                expect(screen.getByTestId("user-name-1")).toBeInTheDocument();
            });
        });
        it("opens Create User modal and submits new user successfully", async () => {
            renderWithAuth(_jsx(UserManagement, {}));
            await waitFor(() => {
                expect(screen.getByTestId("create-user-btn")).toBeInTheDocument();
            });
            // Click + Create User
            fireEvent.click(screen.getByTestId("create-user-btn"));
            expect(screen.getByTestId("create-user-modal")).toBeInTheDocument();
            expect(screen.getByText("Create New User")).toBeInTheDocument();
            // Fill in fields
            fireEvent.change(screen.getByTestId("create-name-input"), {
                target: { value: "Bob Smith" },
            });
            fireEvent.change(screen.getByTestId("create-email-input"), {
                target: { value: "bob.smith@kmutt.ac.th" },
            });
            fireEvent.change(screen.getByTestId("create-role-select"), {
                target: { value: "IT_STAFF" },
            });
            fireEvent.change(screen.getByTestId("create-password-input"), {
                target: { value: "InitialPassword123!" },
            });
            const submitBtn = screen.getByTestId("submit-create-btn");
            expect(submitBtn).not.toBeDisabled();
            fireEvent.click(submitBtn);
            await waitFor(() => {
                expect(screen.queryByTestId("create-user-modal")).not.toBeInTheDocument();
            });
            // Verify POST was dispatched
            expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/v1/admin/users"), expect.objectContaining({
                method: "POST",
                body: expect.stringContaining("bob.smith@kmutt.ac.th"),
            }));
        });
        it("displays error banner with Retry button on API failure", async () => {
            fetchMock.mockImplementationOnce(async () => ({
                ok: false,
                status: 500,
                json: async () => ({ error: { message: "Internal server error" } }),
            }));
            renderWithAuth(_jsx(UserManagement, {}));
            await waitFor(() => {
                expect(screen.getByTestId("api-error-state")).toBeInTheDocument();
            });
            expect(screen.getByTestId("retry-btn")).toBeInTheDocument();
            // Click retry
            fireEvent.click(screen.getByTestId("retry-btn"));
            await waitFor(() => {
                expect(screen.getByTestId("user-management-table")).toBeInTheDocument();
            });
        });
        it("renders Access Denied when caller is not an Administrator", () => {
            renderWithAuth(_jsx(UserManagement, {}), mockStaffUser);
            expect(screen.getByTestId("forbidden-state")).toBeInTheDocument();
            expect(screen.getByText("Access Denied")).toBeInTheDocument();
            expect(screen.queryByTestId("user-management-table")).not.toBeInTheDocument();
        });
    });
    // =========================================================================
    // UI-10: Administrator Safety Alerts, Reactivation & Deactivation Controls
    // =========================================================================
    describe("UI-10: Safety alerts, deactivation confirmation, and context sync", () => {
        it("disables Deactivate button with warning when editing self account", async () => {
            renderWithAuth(_jsx(UserManagement, {}));
            await waitFor(() => {
                expect(screen.getByTestId("user-name-9")).toBeInTheDocument();
            });
            // Open Edit modal for self (user id 9)
            fireEvent.click(screen.getByTestId("edit-user-btn-9"));
            expect(screen.getByTestId("edit-user-modal")).toBeInTheDocument();
            // Safety warning banner should be displayed
            const safetyAlert = screen.getByTestId("safety-alert");
            expect(safetyAlert).toHaveTextContent("You cannot deactivate your own active Administrator account.");
            // Deactivate button should be disabled
            const toggleBtn = screen.getByTestId("toggle-status-btn");
            expect(toggleBtn).toBeDisabled();
            expect(toggleBtn).toHaveTextContent("Deactivate User");
        });
        it("locks role change and deactivation when user is sole active Administrator", async () => {
            // Create scenario with 1 active admin (user 9) and 1 non-admin
            const soleAdminUsers = [
                mockInitialUsers[0], // Requester
                mockInitialUsers[3], // Admin (id 9)
            ];
            fetchMock.mockImplementation(async (url) => {
                if (String(url).includes("/api/v1/admin/users")) {
                    return {
                        ok: true,
                        status: 200,
                        json: async () => soleAdminUsers,
                    };
                }
                return { ok: false, status: 404 };
            });
            renderWithAuth(_jsx(UserManagement, {}));
            await waitFor(() => {
                expect(screen.getByTestId("user-name-9")).toBeInTheDocument();
            });
            // Open Edit modal for user 9
            fireEvent.click(screen.getByTestId("edit-user-btn-9"));
            // Role select should be disabled or lock non-admin options
            const roleSelect = screen.getByTestId("edit-role-select");
            expect(roleSelect).toBeDisabled();
        });
        it("displays [Activate User] button for inactive user and dispatches activation", async () => {
            renderWithAuth(_jsx(UserManagement, {}));
            await waitFor(() => {
                expect(screen.getByTestId("user-name-8")).toBeInTheDocument();
            });
            // User 8 is inactive
            fireEvent.click(screen.getByTestId("edit-user-btn-8"));
            const toggleBtn = screen.getByTestId("toggle-status-btn");
            expect(toggleBtn).toHaveTextContent("Activate User");
            expect(toggleBtn).not.toBeDisabled();
            fireEvent.click(toggleBtn);
            await waitFor(() => {
                expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/v1/admin/users/8"), expect.objectContaining({
                    method: "PATCH",
                    body: JSON.stringify({ isActive: true }),
                }));
            });
        });
        it("opens confirmation modal when clicking [Deactivate User] for active user", async () => {
            renderWithAuth(_jsx(UserManagement, {}));
            await waitFor(() => {
                expect(screen.getByTestId("user-name-5")).toBeInTheDocument();
            });
            // User 5 is Somchai (active IT Staff)
            fireEvent.click(screen.getByTestId("edit-user-btn-5"));
            const toggleBtn = screen.getByTestId("toggle-status-btn");
            expect(toggleBtn).toHaveTextContent("Deactivate User");
            expect(toggleBtn).not.toBeDisabled();
            fireEvent.click(toggleBtn);
            // Confirmation modal should appear
            await waitFor(() => {
                expect(screen.getByTestId("deactivate-confirm-modal")).toBeInTheDocument();
            });
            expect(screen.getByText(/Are you sure you want to deactivate/)).toBeInTheDocument();
            // Confirm deactivation
            const confirmBtn = screen.getByTestId("confirm-deactivate-btn");
            fireEvent.click(confirmBtn);
            await waitFor(() => {
                expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/v1/admin/users/5"), expect.objectContaining({
                    method: "PATCH",
                    body: JSON.stringify({ isActive: false }),
                }));
            });
        });
        it("resets initial password via password reset expander", async () => {
            renderWithAuth(_jsx(UserManagement, {}));
            await waitFor(() => {
                expect(screen.getByTestId("user-name-5")).toBeInTheDocument();
            });
            fireEvent.click(screen.getByTestId("edit-user-btn-5"));
            // Expand Credential Management section
            const toggleResetBtn = screen.getByTestId("toggle-reset-section-btn");
            fireEvent.click(toggleResetBtn);
            expect(screen.getByTestId("reset-password-input")).toBeInTheDocument();
            fireEvent.change(screen.getByTestId("reset-password-input"), {
                target: { value: "NewTemporaryPass123!" },
            });
            const submitResetBtn = screen.getByTestId("submit-reset-password-btn");
            expect(submitResetBtn).not.toBeDisabled();
            fireEvent.click(submitResetBtn);
            await waitFor(() => {
                expect(screen.getByTestId("reset-password-success")).toBeInTheDocument();
            });
            expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/v1/admin/users/5/reset-password"), expect.objectContaining({
                method: "POST",
                body: JSON.stringify({ initialPassword: "NewTemporaryPass123!" }),
            }));
        });
        it("calls auth.refreshUser() when current administrator updates their own display name", async () => {
            const refreshUserMock = vi.fn();
            renderWithAuth(_jsx(UserManagement, {}), mockAdminUser, refreshUserMock);
            await waitFor(() => {
                expect(screen.getByTestId("user-name-9")).toBeInTheDocument();
            });
            fireEvent.click(screen.getByTestId("edit-user-btn-9"));
            fireEvent.change(screen.getByTestId("edit-name-input"), {
                target: { value: "TokTickIT Super Administrator" },
            });
            fireEvent.click(screen.getByTestId("submit-edit-btn"));
            await waitFor(() => {
                expect(refreshUserMock).toHaveBeenCalled();
            });
        });
    });
});
