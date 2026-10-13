import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StaffTicketDetail, { getPermittedTransitions } from "../../src/components/StaffTicketDetail";
import RequesterTicketDetail from "../../src/components/RequesterTicketDetail";
import { AuthContext, AuthContextValue } from "../../src/context/AuthContext";
import { RequesterProvider } from "../../src/context/RequesterContext";
import * as api from "../../src/api";

vi.mock("../../src/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/api")>();
  return {
    ...actual,
    getTicketDetailApi: vi.fn(),
    getStaffAssigneesApi: vi.fn(),
    updateTicketOperationalApi: vi.fn(),
    postCommentApi: vi.fn(),
    postNoteApi: vi.fn(),
    getTicketActionsApi: vi.fn().mockResolvedValue([]),
  };
});

const mockStaffUser = {
  id: 7,
  displayName: "Somchai Staff",
  email: "staff.somchai@kmutt.ac.th",
  role: "IT_STAFF" as const,
  mustChangePassword: false,
};

const mockStaffAssignees: api.StaffAssigneeDto[] = [
  { id: 7, displayName: "Somchai Staff", email: "staff.somchai@kmutt.ac.th", role: "IT_STAFF" },
  { id: 8, displayName: "Malee Jaidee", email: "staff.malee@kmutt.ac.th", role: "IT_STAFF" },
  { id: 9, displayName: "Admin TokTickIT", email: "admin.toktickit@kmutt.ac.th", role: "ADMINISTRATOR" },
];

const mockBaseTicket: api.TicketDetailFullDto = {
  id: 101,
  ticketNo: "TKT-2026-00001",
  summary: "Printer toner leaking",
  description: "Black toner leaking onto floor and sheets.",
  status: "IN_PROGRESS",
  requestedPriority: "HIGH",
  itPriority: "HIGH",
  ticketOwner: "Somchai Staff",
  ownerId: 7,
  owner: { id: 7, displayName: "Somchai Staff", email: "staff.somchai@kmutt.ac.th", role: "IT_STAFF" },
  resolutionSummary: null,
  requesterResolutionConfirmedAt: null,
  hasOpenActionsWarning: false,
  version: 2,
  createdAt: "2026-10-09T08:00:00.000Z",
  updatedAt: "2026-10-09T08:30:00.000Z",
  requester: { id: 1, displayName: "Jennifer Anderson", email: "jennifer.anderson@kmutt.ac.th" },
  category: { id: 2, name: "Hardware" },
  relatedSystem: { id: 3, name: "Office Printer" },
  attachments: [],
  comments: [],
  notes: [],
};

describe("Feature-15: Ticket Workflow & Resolution Gate UI Tests", () => {
  let mockAuthContext: AuthContextValue;
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthContext = {
      user: mockStaffUser,
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn() as any,
      logout: vi.fn() as any,
      changePassword: vi.fn() as any,
      refreshUser: vi.fn() as any,
    };

    vi.mocked(api.getTicketDetailApi).mockResolvedValue(JSON.parse(JSON.stringify(mockBaseTicket)));
    vi.mocked(api.getStaffAssigneesApi).mockResolvedValue(mockStaffAssignees);
  });

  function renderStaffDetail(ticketId = 101) {
    return render(
      <AuthContext.Provider value={mockAuthContext}>
        <RequesterProvider>
          <StaffTicketDetail ticketId={ticketId} onBack={mockOnBack} />
        </RequesterProvider>
      </AuthContext.Provider>
    );
  }

  describe("UI-16: Status Dropdown Permitted Transitions & Reopen Display (FR-45, FR-48, BR-08, BR-11)", () => {
    it("pure getPermittedTransitions computes correct lifecycle paths for all 7 statuses", () => {
      // NEW
      expect(getPermittedTransitions("NEW", false)).toEqual(["ASSIGNED", "IN_PROGRESS", "CANCELLED"]);
      // ASSIGNED
      expect(getPermittedTransitions("ASSIGNED", true)).toEqual(["IN_PROGRESS", "PENDING_REQUESTER", "CANCELLED"]);
      // IN_PROGRESS
      expect(getPermittedTransitions("IN_PROGRESS", true)).toEqual(["PENDING_REQUESTER", "RESOLVED", "CANCELLED"]);
      // PENDING_REQUESTER
      expect(getPermittedTransitions("PENDING_REQUESTER", true)).toEqual(["IN_PROGRESS", "RESOLVED", "CANCELLED"]);
      // RESOLVED
      expect(getPermittedTransitions("RESOLVED", true)).toEqual(["CLOSED", "IN_PROGRESS"]);
      expect(getPermittedTransitions("RESOLVED", false)).toEqual(["CLOSED", "NEW"]);
      // CLOSED
      expect(getPermittedTransitions("CLOSED", true)).toEqual(["IN_PROGRESS"]);
      expect(getPermittedTransitions("CLOSED", false)).toEqual(["NEW"]);
      // CANCELLED
      expect(getPermittedTransitions("CANCELLED", true)).toEqual(["IN_PROGRESS"]);
      expect(getPermittedTransitions("CANCELLED", false)).toEqual(["NEW"]);
    });

    it("renders reopen option to IN_PROGRESS when ticket is RESOLVED with assigned owner", async () => {
      const resolvedTicket: api.TicketDetailFullDto = {
        ...mockBaseTicket,
        status: "RESOLVED",
        ownerId: 7,
        resolutionSummary: "Replaced toner cartridge assembly.",
      };
      vi.mocked(api.getTicketDetailApi).mockResolvedValue(resolvedTicket);

      renderStaffDetail();

      await waitFor(() => {
        expect(screen.getByTestId("staff-ticket-detail-view")).toBeInTheDocument();
      });

      const select = screen.getByTestId("status-transition-select") as HTMLSelectElement;
      expect(select).toBeInTheDocument();

      const options = Array.from(select.options);
      const values = options.map((o) => o.value);
      const labels = options.map((o) => o.text);

      expect(values).toContain("CLOSED");
      expect(values).toContain("IN_PROGRESS");
      expect(labels.some((l) => l.includes("Reopen Ticket (IN_PROGRESS)"))).toBe(true);
    });

    it("renders reopen option to NEW when ticket is CANCELLED without owner", async () => {
      const cancelledTicket: api.TicketDetailFullDto = {
        ...mockBaseTicket,
        status: "CANCELLED",
        ownerId: null,
        owner: null,
        resolutionSummary: "Duplicate request cancelled.",
      };
      vi.mocked(api.getTicketDetailApi).mockResolvedValue(cancelledTicket);

      renderStaffDetail();

      await waitFor(() => {
        expect(screen.getByTestId("staff-ticket-detail-view")).toBeInTheDocument();
      });

      const select = screen.getByTestId("status-transition-select") as HTMLSelectElement;
      const options = Array.from(select.options);
      const values = options.map((o) => o.value);
      const labels = options.map((o) => o.text);

      expect(values).toContain("NEW");
      expect(labels.some((l) => l.includes("Reopen Ticket (NEW)"))).toBe(true);
    });

    it("shows cancellation reason textarea and validates min 5 chars when selecting CANCELLED", async () => {
      renderStaffDetail();

      await waitFor(() => {
        expect(screen.getByTestId("status-transition-select")).toBeInTheDocument();
      });

      // Change status to CANCELLED
      fireEvent.change(screen.getByTestId("status-transition-select"), {
        target: { value: "CANCELLED" },
      });

      // Cancellation container should now be visible
      const cancelContainer = screen.getByTestId("cancellation-reason-container");
      expect(cancelContainer).toBeInTheDocument();
      expect(cancelContainer).toHaveTextContent("Cancelling this ticket will automatically cancel all open");

      // Attempt to save without entering reason
      fireEvent.click(screen.getByTestId("save-operations-button"));

      await waitFor(() => {
        expect(screen.getByTestId("cancellation-reason-error")).toBeInTheDocument();
        expect(screen.getByTestId("cancellation-reason-error")).toHaveTextContent(
          "Cancellation reason is required (between 5 and 2000 characters)"
        );
      });

      // Type 3 chars (too short)
      fireEvent.change(screen.getByTestId("cancellation-reason-input"), {
        target: { value: "Bad" },
      });
      fireEvent.click(screen.getByTestId("save-operations-button"));

      await waitFor(() => {
        expect(screen.getByTestId("cancellation-reason-error")).toBeInTheDocument();
      });

      // Type valid reason (>= 5 chars)
      fireEvent.change(screen.getByTestId("cancellation-reason-input"), {
        target: { value: "User requested cancellation; no longer needed." },
      });

      vi.mocked(api.updateTicketOperationalApi).mockResolvedValue({
        ...mockBaseTicket,
        status: "CANCELLED",
        resolutionSummary: "User requested cancellation; no longer needed.",
        version: 3,
      });

      fireEvent.click(screen.getByTestId("save-operations-button"));

      await waitFor(() => {
        expect(api.updateTicketOperationalApi).toHaveBeenCalledWith(
          101,
          expect.objectContaining({
            status: "CANCELLED",
            cancellationReason: "User requested cancellation; no longer needed.",
          })
        );
      });
    });

    it("renders open-actions-warning-banner when ticket has requester confirmation and hasOpenActionsWarning is true", async () => {
      const ticketWithWarning: api.TicketDetailFullDto = {
        ...mockBaseTicket,
        requesterResolutionConfirmedAt: "2026-10-10T14:00:00.000Z",
        hasOpenActionsWarning: true,
      };
      vi.mocked(api.getTicketDetailApi).mockResolvedValue(ticketWithWarning);

      renderStaffDetail();

      await waitFor(() => {
        expect(screen.getByTestId("open-actions-warning-banner")).toBeInTheDocument();
      });

      expect(screen.getByTestId("open-actions-warning-banner")).toHaveTextContent(
        "Open Actions Warning: The requester indicated resolution, but open actions taken remain incomplete."
      );
    });
  });

  describe("UI-15: Ticket Detail Resolution Gate Blocked Alert Modal (FR-43, AC-07)", () => {
    it("catches 409 TICKET_STATE_CONFLICT and renders ResolutionGateBlockedModal with review and dismiss buttons", async () => {
      renderStaffDetail();

      await waitFor(() => {
        expect(screen.getByTestId("status-transition-select")).toBeInTheDocument();
      });

      // Select RESOLVED
      fireEvent.change(screen.getByTestId("status-transition-select"), {
        target: { value: "RESOLVED" },
      });

      // Enter valid resolution summary
      fireEvent.change(screen.getByTestId("resolution-summary-input"), {
        target: { value: "Replaced toner unit and cleaned paper path completely." },
      });

      // Mock API returning 409 TICKET_STATE_CONFLICT
      const conflictError: any = new Error("Ticket cannot be resolved while actions taken remain open.");
      conflictError.status = 409;
      conflictError.code = "TICKET_STATE_CONFLICT";
      conflictError.fieldErrors = [
        { field: "status", message: "There are 2 open action(s) taken on this ticket." },
      ];
      vi.mocked(api.updateTicketOperationalApi).mockRejectedValueOnce(conflictError);

      // Click save operations
      fireEvent.click(screen.getByTestId("save-operations-button"));

      // Assert high-contrast ResolutionGateBlockedModal is shown
      await waitFor(() => {
        expect(screen.getByTestId("resolution-gate-modal")).toBeInTheDocument();
      });

      expect(screen.getByText("Action Required: Incomplete Actions Taken")).toBeInTheDocument();
      expect(screen.getByTestId("resolution-gate-action-count")).toHaveTextContent(
        "There are 2 open action(s) taken on this ticket."
      );
      expect(screen.getByTestId("resolution-gate-review-btn")).toBeInTheDocument();
      expect(screen.getByTestId("resolution-gate-dismiss-btn")).toBeInTheDocument();

      // Assert select was reset back to original status
      const select = screen.getByTestId("status-transition-select") as HTMLSelectElement;
      expect(select.value).toBe("IN_PROGRESS");

      // Test Dismiss button closes modal
      fireEvent.click(screen.getByTestId("resolution-gate-dismiss-btn"));
      expect(screen.queryByTestId("resolution-gate-modal")).not.toBeInTheDocument();
    });

    it("clicking [Review Actions Taken] dismisses modal and triggers smooth scroll to actions container", async () => {
      // Mock scrollIntoView
      const scrollSpy = vi.fn();
      Element.prototype.scrollIntoView = scrollSpy;

      renderStaffDetail();

      await waitFor(() => {
        expect(screen.getByTestId("status-transition-select")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId("status-transition-select"), {
        target: { value: "RESOLVED" },
      });
      fireEvent.change(screen.getByTestId("resolution-summary-input"), {
        target: { value: "Replaced toner unit and cleaned paper path completely." },
      });

      const conflictError: any = new Error("Ticket cannot be resolved while actions taken remain open.");
      conflictError.status = 409;
      conflictError.code = "TICKET_STATE_CONFLICT";
      conflictError.fieldErrors = [
        { field: "status", message: "There are 1 open action(s) taken on this ticket." },
      ];
      vi.mocked(api.updateTicketOperationalApi).mockRejectedValueOnce(conflictError);

      fireEvent.click(screen.getByTestId("save-operations-button"));

      await waitFor(() => {
        expect(screen.getByTestId("resolution-gate-modal")).toBeInTheDocument();
      });

      // Click [Review Actions Taken]
      fireEvent.click(screen.getByTestId("resolution-gate-review-btn"));

      expect(screen.queryByTestId("resolution-gate-modal")).not.toBeInTheDocument();
      expect(scrollSpy).toHaveBeenCalled();
    });
  });

  describe("Requester Advisory Confirmation Modal & Note Support (FR-45, FR-46, Section 5.3)", () => {
    it("opens requester resolve modal and submits optional note to resolve-indication endpoint", async () => {
      // Mock global fetch
      const globalFetchMock = vi.fn();
      vi.stubGlobal("fetch", globalFetchMock);

      // First fetch: ticket details
      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockBaseTicket,
          requesterResolutionConfirmedAt: null,
          hasOpenActionsWarning: false,
        }),
      });

      render(
        <AuthContext.Provider
          value={{
            user: { id: 1, displayName: "Jennifer", email: "j@k.ac.th", role: "REQUESTER", mustChangePassword: false },
            isLoading: false,
            isAuthenticated: true,
            login: vi.fn() as any,
            logout: vi.fn() as any,
            changePassword: vi.fn() as any,
            refreshUser: vi.fn() as any,
          }}
        >
          <RequesterProvider>
            <RequesterTicketDetail ticketId={101} onBack={mockOnBack} />
          </RequesterProvider>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("problem-appears-resolved-btn")).toBeInTheDocument();
        expect(screen.getByTestId("resolve-feedback-input")).toBeInTheDocument();
      });

      // Enter optional feedback note
      fireEvent.change(screen.getByTestId("resolve-feedback-input"), {
        target: { value: "Printer is working perfectly now, thanks!" },
      });

      // Mock resolve indication API response
      globalFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: "Resolution indication recorded.",
          requesterResolutionConfirmedAt: "2026-10-10T15:00:00.000Z",
          hasOpenActionsWarning: true,
          ticket: {
            ...mockBaseTicket,
            requesterResolutionConfirmedAt: "2026-10-10T15:00:00.000Z",
            hasOpenActionsWarning: true,
          },
        }),
      });

      // Submit resolution indication
      fireEvent.click(screen.getByTestId("problem-appears-resolved-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("requester-resolved-indication")).toBeInTheDocument();
      });

      // Check note regarding technical tasks still wrapping up
      expect(screen.getByTestId("requester-open-actions-note")).toHaveTextContent(
        "Note: Technical tasks are still wrapping up with IT Staff."
      );
    });
  });
});
