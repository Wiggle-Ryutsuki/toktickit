import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RequesterDashboard from "../../src/components/RequesterDashboard";
import { AuthContext, AuthContextValue } from "../../src/context/AuthContext";
import { RequesterProvider } from "../../src/context/RequesterContext";
import * as api from "../../src/api";

vi.mock("../../src/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/api")>();
  return {
    ...actual,
    getRequesterDashboardApi: vi.fn(),
  };
});

const mockRequesterUser = {
  id: 1,
  displayName: "Jennifer Anderson",
  email: "jennifer.anderson@kmutt.ac.th",
  role: "REQUESTER" as const,
  mustChangePassword: false,
};

const mockRequesterDashboardData: api.RequesterDashboardResponse = {
  metrics: {
    myOpenTickets: 3,
    inProgress: 1,
    resolved: 4,
    closed: 6,
  },
  recentTickets: [
    {
      id: 201,
      ticketNo: "TICK-201",
      title: "Cannot access engineering laboratory network",
      status: "IN_PROGRESS",
      priority: "NORMAL",
      createdAt: "2026-10-10T11:00:00.000Z",
      updatedAt: "2026-10-10T12:00:00.000Z",
    },
    {
      id: 202,
      ticketNo: "TICK-202",
      title: "Request for CAD software installation license",
      status: "RESOLVED",
      priority: "NORMAL",
      createdAt: "2026-10-09T14:30:00.000Z",
      updatedAt: "2026-10-09T15:00:00.000Z",
    },
  ],
};

function renderRequesterDashboard(
  props: { onNavigate?: (view: any) => void; onViewDetail?: (id: number) => void } = {},
  user: any = mockRequesterUser
) {
  const mockContext: AuthContextValue = {
    user,
    isLoading: false,
    isAuthenticated: !!user,
    login: vi.fn() as any,
    logout: vi.fn() as any,
    changePassword: vi.fn() as any,
    refreshUser: vi.fn() as any,
  };

  return render(
    <AuthContext.Provider value={mockContext}>
      <RequesterProvider>
        <RequesterDashboard {...props} />
      </RequesterProvider>
    </AuthContext.Provider>
  );
}

describe("RequesterDashboard Component (UI-19)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getRequesterDashboardApi as any).mockResolvedValue(mockRequesterDashboardData);
  });

  describe("UI-19: Requester Dashboard UI Rendering & Drill-Down (FR-50, FR-51, AC-02)", () => {
    it("renders welcome banner with requester displayName and role", async () => {
      renderRequesterDashboard();

      expect(await screen.findByTestId("requester-dashboard-welcome")).toHaveTextContent("Welcome, Jennifer Anderson!");
      expect(screen.getByText("Here's the latest on your requests.")).toBeInTheDocument();
    });

    it("renders 4 metric cards with correct counts", async () => {
      renderRequesterDashboard();

      expect(await screen.findByTestId("metric-count-my-open")).toHaveTextContent("3");
      expect(screen.getByTestId("metric-count-in-progress")).toHaveTextContent("1");
      expect(screen.getByTestId("metric-count-resolved")).toHaveTextContent("4");
      expect(screen.getByTestId("metric-count-closed")).toHaveTextContent("6");
    });

    it("renders recent tickets table with ticket numbers, summaries, and statuses", async () => {
      renderRequesterDashboard();

      expect(await screen.findByTestId("requester-recent-tickets-table")).toBeInTheDocument();
      expect(screen.getByText("TICK-201")).toBeInTheDocument();
      expect(screen.getByText("Cannot access engineering laboratory network")).toBeInTheDocument();
      expect(screen.getByText("TICK-202")).toBeInTheDocument();
      expect(screen.getByText("Request for CAD software installation license")).toBeInTheDocument();
    });

    it("clicking metric card drill-down links triggers navigation to tickets with status filters", async () => {
      const mockNavigate = vi.fn();
      renderRequesterDashboard({ onNavigate: mockNavigate });

      const openLink = await screen.findByTestId("drill-down-link-my-open");
      fireEvent.click(openLink);
      expect(mockNavigate).toHaveBeenCalledWith("tickets");

      const inProgressLink = screen.getByTestId("drill-down-link-in-progress");
      fireEvent.click(inProgressLink);
      expect(mockNavigate).toHaveBeenCalledWith("tickets");
      expect(window.location.search).toContain("status=IN_PROGRESS");

      const resolvedLink = screen.getByTestId("drill-down-link-resolved");
      fireEvent.click(resolvedLink);
      expect(mockNavigate).toHaveBeenCalledWith("tickets");
      expect(window.location.search).toContain("status=RESOLVED");

      const closedLink = screen.getByTestId("drill-down-link-closed");
      fireEvent.click(closedLink);
      expect(mockNavigate).toHaveBeenCalledWith("tickets");
      expect(window.location.search).toContain("status=CLOSED");
    });

    it("clicking a recent ticket row calls onViewDetail with ticket ID", async () => {
      const mockViewDetail = vi.fn();
      renderRequesterDashboard({ onViewDetail: mockViewDetail });

      const row = await screen.findByTestId("requester-recent-ticket-201");
      fireEvent.click(row);

      expect(mockViewDetail).toHaveBeenCalledWith(201);
    });

    it("clicking quick action create ticket button navigates to create-ticket", async () => {
      const mockNavigate = vi.fn();
      renderRequesterDashboard({ onNavigate: mockNavigate });

      const createBtn = await screen.findByTestId("requester-quick-action-create");
      fireEvent.click(createBtn);

      expect(mockNavigate).toHaveBeenCalledWith("create-ticket");
    });

    it("clicking quick action view my tickets navigates to tickets", async () => {
      const mockNavigate = vi.fn();
      renderRequesterDashboard({ onNavigate: mockNavigate });

      const viewTicketsBtn = await screen.findByTestId("requester-quick-action-my-tickets");
      fireEvent.click(viewTicketsBtn);

      expect(mockNavigate).toHaveBeenCalledWith("tickets");
    });

    it("renders dedicated empty state when requester has 0 submitted tickets (AC-02)", async () => {
      (api.getRequesterDashboardApi as any).mockResolvedValueOnce({
        metrics: {
          myOpenTickets: 0,
          inProgress: 0,
          resolved: 0,
          closed: 0,
        },
        recentTickets: [],
      });

      const mockNavigate = vi.fn();
      renderRequesterDashboard({ onNavigate: mockNavigate });

      expect(await screen.findByTestId("requester-tickets-empty")).toBeInTheDocument();
      expect(screen.getByText("You have not submitted any tickets yet.")).toBeInTheDocument();

      const createFirstBtn = screen.getByTestId("create-first-ticket-btn");
      expect(createFirstBtn).toHaveTextContent("+ Create Your First Ticket");

      fireEvent.click(createFirstBtn);
      expect(mockNavigate).toHaveBeenCalledWith("create-ticket");
    });

    it("displays accessible error state and allows retry when API fails", async () => {
      (api.getRequesterDashboardApi as any).mockRejectedValueOnce(new Error("Network timeout"));

      renderRequesterDashboard();

      expect(await screen.findByRole("alert")).toHaveTextContent("Network timeout");
      const retryBtn = screen.getByRole("button", { name: /try again/i });
      expect(retryBtn).toBeInTheDocument();

      (api.getRequesterDashboardApi as any).mockResolvedValueOnce(mockRequesterDashboardData);
      fireEvent.click(retryBtn);

      expect(await screen.findByTestId("requester-dashboard-welcome")).toBeInTheDocument();
    });
  });
});
