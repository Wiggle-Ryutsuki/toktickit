import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StaffDashboard from "../../src/components/StaffDashboard";
import Navbar from "../../src/components/Navbar";
import { AuthContext } from "../../src/context/AuthContext";
import { RequesterProvider } from "../../src/context/RequesterContext";
import * as api from "../../src/api";
vi.mock("../../src/api", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        getStaffDashboardApi: vi.fn(),
    };
});
const mockStaffUser = {
    id: 7,
    displayName: "Somchai IT",
    email: "staff.somchai@kmutt.ac.th",
    role: "IT_STAFF",
    mustChangePassword: false,
};
const mockAdminUser = {
    id: 11,
    displayName: "Admin User",
    email: "admin.toktickit@kmutt.ac.th",
    role: "ADMINISTRATOR",
    mustChangePassword: false,
};
const mockRequesterUser = {
    id: 1,
    displayName: "Jennifer Anderson",
    email: "jennifer.anderson@kmutt.ac.th",
    role: "REQUESTER",
    mustChangePassword: false,
};
const mockDashboardData = {
    metrics: {
        newTickets: { count: 8, deltaYesterday: 3 },
        openTickets: { count: 14, deltaYesterday: -1 },
        inProgress: { count: 6, deltaYesterday: 2 },
        waitingForRequester: { count: 4, deltaYesterday: 0 },
        myAssigned: { count: 5, deltaYesterday: 1 },
    },
    recentTickets: [
        {
            id: 101,
            ticketNo: "TICK-101",
            title: "VPN connection dropping repeatedly",
            requesterName: "Jennifer Anderson",
            ownerName: "Somchai Staff",
            status: "NEW",
            itPriority: "HIGH",
            createdAt: "2026-10-11T08:00:00.000Z",
            updatedAt: "2026-10-11T08:30:00.000Z",
        },
        {
            id: 102,
            ticketNo: "TICK-102",
            title: "Broken laptop display hinges",
            requesterName: "Bob Requester",
            ownerName: "Somchai Staff",
            status: "ASSIGNED",
            itPriority: "NORMAL",
            createdAt: "2026-10-11T08:45:00.000Z",
            updatedAt: "2026-10-11T09:15:00.000Z",
        },
    ],
};
function renderStaffDashboard(props = {}) {
    const mockContext = {
        user: mockStaffUser,
        isLoading: false,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
        changePassword: vi.fn(),
        refreshUser: vi.fn(),
    };
    return render(_jsx(AuthContext.Provider, { value: mockContext, children: _jsx(StaffDashboard, { ...props }) }));
}
describe("StaffDashboard Component (UI-17, UI-18, UI-20)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        api.getStaffDashboardApi.mockResolvedValue(mockDashboardData);
    });
    describe("UI-17: Staff Dashboard UI Rendering (FR-51, AC-11)", () => {
        it("renders welcome banner with staff displayName", async () => {
            renderStaffDashboard();
            expect(await screen.findByTestId("staff-dashboard-welcome")).toHaveTextContent("Welcome back, Somchai IT!");
            expect(screen.getByText("Here's what's happening with your queue today.")).toBeInTheDocument();
        });
        it("renders 5 metric cards with counts and 24-hour deltas", async () => {
            renderStaffDashboard();
            expect(await screen.findByTestId("metric-count-new")).toHaveTextContent("8");
            expect(screen.getByTestId("metric-delta-new")).toHaveTextContent("+3 from yesterday");
            expect(screen.getByTestId("metric-count-open")).toHaveTextContent("14");
            expect(screen.getByTestId("metric-delta-open")).toHaveTextContent("-1 from yesterday");
            expect(screen.getByTestId("metric-count-in-progress")).toHaveTextContent("6");
            expect(screen.getByTestId("metric-delta-in-progress")).toHaveTextContent("+2 from yesterday");
            expect(screen.getByTestId("metric-count-waiting")).toHaveTextContent("4");
            expect(screen.getByTestId("metric-delta-waiting")).toHaveTextContent("0 from yesterday");
            expect(screen.getByTestId("metric-count-my-assigned")).toHaveTextContent("5");
            expect(screen.getByTestId("metric-delta-my-assigned")).toHaveTextContent("+1 from yesterday");
        });
        it("renders recent tickets table with ticket numbers, titles, requesters, priorities, and statuses", async () => {
            renderStaffDashboard();
            expect(await screen.findByTestId("recent-tickets-table")).toBeInTheDocument();
            expect(screen.getByText("TICK-101")).toBeInTheDocument();
            expect(screen.getByText("VPN connection dropping repeatedly")).toBeInTheDocument();
            expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
            expect(screen.getByText("TICK-102")).toBeInTheDocument();
            expect(screen.getByText("Broken laptop display hinges")).toBeInTheDocument();
        });
        it("clicking Refresh button refetches dashboard data", async () => {
            renderStaffDashboard();
            const refreshBtn = await screen.findByTestId("dashboard-refresh-btn");
            expect(api.getStaffDashboardApi).toHaveBeenCalledTimes(1);
            fireEvent.click(refreshBtn);
            expect(api.getStaffDashboardApi).toHaveBeenCalledTimes(2);
        });
        it("displays accessible error state and allows retry when API fails", async () => {
            api.getStaffDashboardApi.mockRejectedValueOnce(new Error("Database connection lost"));
            renderStaffDashboard();
            expect(await screen.findByRole("alert")).toHaveTextContent("Database connection lost");
            const retryBtn = screen.getByRole("button", { name: /try again/i });
            expect(retryBtn).toBeInTheDocument();
            api.getStaffDashboardApi.mockResolvedValueOnce(mockDashboardData);
            fireEvent.click(retryBtn);
            expect(await screen.findByTestId("staff-dashboard-welcome")).toBeInTheDocument();
        });
    });
    describe("UI-18: Staff Dashboard Metric Card Drill-Down Navigation (FR-51, AC-12)", () => {
        it("clicking New metric card triggers drill-down navigation to queue with status=NEW", async () => {
            const mockNavigate = vi.fn();
            renderStaffDashboard({ onNavigate: mockNavigate });
            const newCard = await screen.findByTestId("metric-card-new");
            fireEvent.click(newCard);
            expect(mockNavigate).toHaveBeenCalledWith("queue");
            expect(window.location.search).toContain("status=NEW");
        });
        it("clicking Open metric card triggers drill-down navigation with status=ASSIGNED", async () => {
            const mockNavigate = vi.fn();
            renderStaffDashboard({ onNavigate: mockNavigate });
            const openCard = await screen.findByTestId("metric-card-open");
            fireEvent.click(openCard);
            expect(mockNavigate).toHaveBeenCalledWith("queue");
            expect(window.location.search).toContain("status=ASSIGNED");
        });
        it("clicking In Progress metric card triggers drill-down navigation with status=IN_PROGRESS", async () => {
            const mockNavigate = vi.fn();
            renderStaffDashboard({ onNavigate: mockNavigate });
            const inProgressCard = await screen.findByTestId("metric-card-in-progress");
            fireEvent.click(inProgressCard);
            expect(mockNavigate).toHaveBeenCalledWith("queue");
            expect(window.location.search).toContain("status=IN_PROGRESS");
        });
        it("clicking Waiting metric card triggers drill-down navigation with status=PENDING_REQUESTER", async () => {
            const mockNavigate = vi.fn();
            renderStaffDashboard({ onNavigate: mockNavigate });
            const waitingCard = await screen.findByTestId("metric-card-waiting");
            fireEvent.click(waitingCard);
            expect(mockNavigate).toHaveBeenCalledWith("queue");
            expect(window.location.search).toContain("status=PENDING_REQUESTER");
        });
        it("clicking My Assigned card triggers drill-down navigation with assigned=mine", async () => {
            const mockNavigate = vi.fn();
            renderStaffDashboard({ onNavigate: mockNavigate });
            const myAssignedCard = await screen.findByTestId("metric-card-my-assigned");
            fireEvent.click(myAssignedCard);
            expect(mockNavigate).toHaveBeenCalledWith("queue");
            expect(window.location.search).toContain("assigned=mine");
        });
        it("clicking a ticket row in Recent Tickets calls onViewDetail with ticket ID", async () => {
            const mockViewDetail = vi.fn();
            renderStaffDashboard({ onViewDetail: mockViewDetail });
            const row = await screen.findByTestId("recent-ticket-row-101");
            fireEvent.click(row);
            expect(mockViewDetail).toHaveBeenCalledWith(101);
        });
        it("clicking quick actions navigates to create-ticket and queue", async () => {
            const mockNavigate = vi.fn();
            renderStaffDashboard({ onNavigate: mockNavigate });
            const createBtn = await screen.findByTestId("quick-action-create");
            fireEvent.click(createBtn);
            expect(mockNavigate).toHaveBeenCalledWith("create-ticket");
            const myQueueBtn = screen.getByTestId("quick-action-my-queue");
            fireEvent.click(myQueueBtn);
            expect(mockNavigate).toHaveBeenCalledWith("queue");
        });
    });
    describe("UI-20: Header Navigation Bar Dashboard Link (FR-52)", () => {
        function renderNavbarWithUser(user, activeView = "dashboard", onNavigate = vi.fn()) {
            const mockContext = {
                user,
                isLoading: false,
                isAuthenticated: !!user,
                login: vi.fn(),
                logout: vi.fn(),
                changePassword: vi.fn(),
                refreshUser: vi.fn(),
            };
            return render(_jsx(AuthContext.Provider, { value: mockContext, children: _jsx(RequesterProvider, { children: _jsx(Navbar, { activeView: activeView, onNavigate: onNavigate }) }) }));
        }
        it("renders active Dashboard link in Navbar for IT Staff", () => {
            const mockNavigate = vi.fn();
            renderNavbarWithUser(mockStaffUser, "dashboard", mockNavigate);
            const dashboardLinks = screen.getAllByTestId("nav-dashboard-link");
            expect(dashboardLinks.length).toBeGreaterThan(0);
            expect(dashboardLinks[0]).toHaveClass("active");
            fireEvent.click(dashboardLinks[0]);
            expect(mockNavigate).toHaveBeenCalledWith("dashboard");
        });
        it("renders active Dashboard link in Navbar for Administrator", () => {
            const mockNavigate = vi.fn();
            renderNavbarWithUser(mockAdminUser, "dashboard", mockNavigate);
            const dashboardLinks = screen.getAllByTestId("nav-dashboard-link");
            expect(dashboardLinks.length).toBeGreaterThan(0);
            expect(dashboardLinks[0]).toHaveClass("active");
            fireEvent.click(dashboardLinks[0]);
            expect(mockNavigate).toHaveBeenCalledWith("dashboard");
        });
        it("renders active Dashboard link in Navbar for Requester", () => {
            const mockNavigate = vi.fn();
            renderNavbarWithUser(mockRequesterUser, "dashboard", mockNavigate);
            const dashboardLinks = screen.getAllByTestId("nav-dashboard-link");
            expect(dashboardLinks.length).toBeGreaterThan(0);
            expect(dashboardLinks[0]).toHaveClass("active");
            fireEvent.click(dashboardLinks[0]);
            expect(mockNavigate).toHaveBeenCalledWith("dashboard");
        });
    });
});
