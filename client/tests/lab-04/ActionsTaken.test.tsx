import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import ActionsTaken from "../../src/components/ActionsTaken";
import { AuthContext, AuthContextValue } from "../../src/context/AuthContext";
import * as api from "../../src/api";

vi.mock("../../src/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/api")>();
  return {
    ...actual,
    getTicketActionsApi: vi.fn(),
    createTicketActionApi: vi.fn(),
    updateTicketActionApi: vi.fn(),
    getStaffAssigneesApi: vi.fn(),
  };
});

const mockStaffUser = {
  id: 7,
  displayName: "Somchai Staff",
  email: "staff.somchai@kmutt.ac.th",
  role: "IT_STAFF" as const,
  mustChangePassword: false,
};

const mockRequesterUser = {
  id: 1,
  displayName: "Jennifer Anderson",
  email: "jennifer.anderson@kmutt.ac.th",
  role: "REQUESTER" as const,
  mustChangePassword: false,
};

const mockStaffAssignees: api.StaffAssigneeDto[] = [
  { id: 7, displayName: "Somchai Staff", email: "staff.somchai@kmutt.ac.th", role: "IT_STAFF" },
  { id: 8, displayName: "Malee Jaidee", email: "staff.malee@kmutt.ac.th", role: "IT_STAFF" },
  { id: 9, displayName: "Admin TokTickIT", email: "admin.toktickit@kmutt.ac.th", role: "ADMINISTRATOR" },
];

const mockActionsList: api.ActionTakenDto[] = [
  {
    id: 1,
    ticketId: 101,
    actionDateTime: "2026-10-08T09:30:00.000Z",
    description: "Ran memory diagnostics on laptop.",
    result: "Slot 2 RAM failed parity check.",
    status: "COMPLETED",
    performedBy: {
      id: 7,
      displayName: "Somchai Staff",
      email: "staff.somchai@kmutt.ac.th",
      role: "IT_STAFF",
    },
    assignee: {
      id: 8,
      displayName: "Malee Jaidee",
      email: "staff.malee@kmutt.ac.th",
      role: "IT_STAFF",
    },
    isFollowUpRequired: true,
    followUpNote: "Order replacement DDR4 module.",
    attachmentNotes: "memtest-log.txt",
    version: 1,
    createdAt: "2026-10-08T09:30:00.000Z",
    updatedAt: "2026-10-08T09:30:00.000Z",
  },
  {
    id: 2,
    ticketId: 101,
    actionDateTime: "2026-10-08T11:15:00.000Z",
    description: "Ordered replacement RAM module.",
    result: "PO #8491 submitted to vendor.",
    status: "IN_PROGRESS",
    performedBy: {
      id: 8,
      displayName: "Malee Jaidee",
      email: "staff.malee@kmutt.ac.th",
      role: "IT_STAFF",
    },
    assignee: {
      id: 7,
      displayName: "Somchai Staff",
      email: "staff.somchai@kmutt.ac.th",
      role: "IT_STAFF",
    },
    isFollowUpRequired: false,
    followUpNote: null,
    attachmentNotes: "po-receipt.pdf",
    version: 1,
    createdAt: "2026-10-08T11:15:00.000Z",
    updatedAt: "2026-10-08T11:15:00.000Z",
  },
];

function renderWithAuth(
  ui: React.ReactElement,
  authUser: typeof mockStaffUser | typeof mockRequesterUser | null = mockStaffUser
) {
  const authContextValue: AuthContextValue = {
    user: authUser,
    isLoading: false,
    isAuthenticated: authUser !== null,
    login: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
    refreshUser: vi.fn(),
  };

  return render(
    <AuthContext.Provider value={authContextValue}>
      {ui}
    </AuthContext.Provider>
  );
}

describe("Feature-14: Actions Taken UI Component Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getTicketActionsApi).mockResolvedValue(mockActionsList);
    vi.mocked(api.getStaffAssigneesApi).mockResolvedValue(mockStaffAssignees);
  });

  describe("UI-11: Actions Taken rendering on Ticket Detail (FR-37, FR-38)", () => {
    it("renders actions table headers, row data, and status badges correctly", async () => {
      renderWithAuth(<ActionsTaken ticketId={101} />);

      await waitFor(() => {
        expect(screen.getByTestId("actions-taken-section")).toBeInTheDocument();
      });

      // Verify table headers
      expect(screen.getByText("Date/Time")).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
      expect(screen.getByText("Result")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Performed By")).toBeInTheDocument();
      expect(screen.getByText("Assignee")).toBeInTheDocument();

      // Verify action rows content in table
      const table = screen.getByTestId("actions-table");
      expect(within(table).getByText("Ran memory diagnostics on laptop.")).toBeInTheDocument();
      expect(within(table).getByText("Slot 2 RAM failed parity check.")).toBeInTheDocument();
      expect(within(table).getByText("Ordered replacement RAM module.")).toBeInTheDocument();

      // Verify action cards in mobile view
      const cards = screen.getByTestId("actions-mobile-cards");
      expect(within(cards).getByText("Ran memory diagnostics on laptop.")).toBeInTheDocument();
      expect(within(cards).getByText("Slot 2 RAM failed parity check.")).toBeInTheDocument();

      // Verify accessible status badges
      const completedBadge = screen.getByTestId("action-status-badge-1");
      expect(completedBadge).toHaveTextContent("Completed");

      const inProgressBadge = screen.getByTestId("action-status-badge-2");
      expect(inProgressBadge).toHaveTextContent("In Progress");

      // Verify follow-up banner
      expect(screen.getByTestId("action-follow-up-1")).toHaveTextContent("Order replacement DDR4 module.");
    });

    it("renders empty state correctly when ticket has 0 actions", async () => {
      vi.mocked(api.getTicketActionsApi).mockResolvedValue([]);

      renderWithAuth(<ActionsTaken ticketId={102} />);

      await waitFor(() => {
        expect(screen.getByTestId("actions-empty-state")).toBeInTheDocument();
      });

      expect(screen.getByText("No actions taken recorded for this ticket yet.")).toBeInTheDocument();
      expect(
        screen.getByText("Document diagnostic steps, hardware fixes, or technical actions taken to resolve this ticket.")
      ).toBeInTheDocument();
      expect(screen.getByTestId("add-first-action-btn")).toBeInTheDocument();
    });
  });

  describe("UI-12: Add Action Taken submission (FR-39, AC-03)", () => {
    it("opens create modal, submits valid form data, and immediately updates actions table", async () => {
      const createdAction: api.ActionTakenDto = {
        id: 3,
        ticketId: 101,
        actionDateTime: "2026-10-09T14:00:00.000Z",
        description: "Replaced faulty DDR4 RAM in slot 2.",
        result: "System passes all memory stress tests.",
        status: "COMPLETED",
        performedBy: {
          id: 7,
          displayName: "Somchai Staff",
          email: "staff.somchai@kmutt.ac.th",
          role: "IT_STAFF",
        },
        assignee: {
          id: 7,
          displayName: "Somchai Staff",
          email: "staff.somchai@kmutt.ac.th",
          role: "IT_STAFF",
        },
        isFollowUpRequired: false,
        followUpNote: null,
        attachmentNotes: "memtest-pass.png",
        version: 1,
        createdAt: "2026-10-09T14:00:00.000Z",
        updatedAt: "2026-10-09T14:00:00.000Z",
      };

      vi.mocked(api.createTicketActionApi).mockResolvedValue(createdAction);

      renderWithAuth(<ActionsTaken ticketId={101} />);

      await waitFor(() => {
        expect(screen.getByTestId("add-action-btn")).toBeInTheDocument();
      });

      // Click "+ Add Action Taken" button
      fireEvent.click(screen.getByTestId("add-action-btn"));

      // Verify modal opens
      expect(screen.getByTestId("action-modal")).toBeInTheDocument();
      expect(screen.getByTestId("action-modal-title")).toHaveTextContent("Add Action Taken");

      // Verify Performed By is auto-populated and read-only (BR-03)
      const performedByInput = screen.getByTestId("action-performed-by-input") as HTMLInputElement;
      expect(performedByInput.value).toBe("Somchai Staff");
      expect(performedByInput).toHaveAttribute("readonly");

      // Fill form fields
      fireEvent.change(screen.getByTestId("action-description-input"), {
        target: { value: "Replaced faulty DDR4 RAM in slot 2." },
      });
      fireEvent.change(screen.getByTestId("action-result-input"), {
        target: { value: "System passes all memory stress tests." },
      });
      fireEvent.change(screen.getByTestId("action-status-select"), {
        target: { value: "COMPLETED" },
      });

      // Submit form
      fireEvent.click(screen.getByTestId("action-submit-btn"));

      await waitFor(() => {
        expect(api.createTicketActionApi).toHaveBeenCalledWith(
          101,
          expect.objectContaining({
            description: "Replaced faulty DDR4 RAM in slot 2.",
            result: "System passes all memory stress tests.",
            status: "COMPLETED",
          })
        );
      });

      // Verify modal is closed
      await waitFor(() => {
        expect(screen.queryByTestId("action-modal")).not.toBeInTheDocument();
      });

      // Verify newly created action appears immediately in list (AC-03)
      const table = screen.getByTestId("actions-table");
      expect(within(table).getByText("Replaced faulty DDR4 RAM in slot 2.")).toBeInTheDocument();
      expect(within(table).getByText("System passes all memory stress tests.")).toBeInTheDocument();
    });
  });

  describe("UI-13: Follow-Up Note conditional validation in UI (FR-41, AC-06, BR-05)", () => {
    it("enforces mandatory follow-up note only when follow-up checkbox is checked", async () => {
      renderWithAuth(<ActionsTaken ticketId={101} />);

      await waitFor(() => {
        expect(screen.getByTestId("add-action-btn")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("add-action-btn"));

      const followUpCheckbox = screen.getByTestId("action-followup-checkbox");
      const followUpInput = screen.getByTestId("action-followup-note-input");

      // Initially unchecked and disabled
      expect(followUpCheckbox).not.toBeChecked();
      expect(followUpInput).toBeDisabled();

      // Enter valid description
      fireEvent.change(screen.getByTestId("action-description-input"), {
        target: { value: "Diagnostics in progress on server rack." },
      });

      // Check "Follow-Up Required"
      fireEvent.click(followUpCheckbox);
      expect(followUpCheckbox).toBeChecked();
      expect(followUpInput).not.toBeDisabled();

      // Attempt to submit with empty follow-up note (AC-06)
      fireEvent.click(screen.getByTestId("action-submit-btn"));

      // Verify inline validation error appears
      await waitFor(() => {
        expect(screen.getByTestId("followup-note-error")).toBeInTheDocument();
      });
      expect(screen.getByTestId("followup-note-error")).toHaveTextContent(
        "Follow-up note is required when follow-up is requested"
      );
      expect(api.createTicketActionApi).not.toHaveBeenCalled();

      // Enter valid follow-up note (>= 3 chars)
      fireEvent.change(followUpInput, {
        target: { value: "Check server temperature log tomorrow morning." },
      });

      // Mock successful response
      vi.mocked(api.createTicketActionApi).mockResolvedValue({
        id: 4,
        ticketId: 101,
        actionDateTime: "2026-10-09T15:00:00.000Z",
        description: "Diagnostics in progress on server rack.",
        result: null,
        status: "IN_PROGRESS",
        performedBy: { id: 7, displayName: "Somchai Staff", email: "staff.somchai@kmutt.ac.th", role: "IT_STAFF" },
        assignee: null,
        isFollowUpRequired: true,
        followUpNote: "Check server temperature log tomorrow morning.",
        attachmentNotes: null,
        version: 1,
        createdAt: "2026-10-09T15:00:00.000Z",
        updatedAt: "2026-10-09T15:00:00.000Z",
      });

      fireEvent.click(screen.getByTestId("action-submit-btn"));

      await waitFor(() => {
        expect(api.createTicketActionApi).toHaveBeenCalledWith(
          101,
          expect.objectContaining({
            isFollowUpRequired: true,
            followUpNote: "Check server temperature log tomorrow morning.",
          })
        );
      });
    });

    it("clears and disables follow-up note when checkbox is unchecked", async () => {
      renderWithAuth(<ActionsTaken ticketId={101} />);

      await waitFor(() => {
        expect(screen.getByTestId("add-action-btn")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("add-action-btn"));

      const followUpCheckbox = screen.getByTestId("action-followup-checkbox");
      const followUpInput = screen.getByTestId("action-followup-note-input") as HTMLInputElement;

      // Check and enter note
      fireEvent.click(followUpCheckbox);
      fireEvent.change(followUpInput, { target: { value: "Some follow up text" } });
      expect(followUpInput.value).toBe("Some follow up text");

      // Uncheck
      fireEvent.click(followUpCheckbox);
      expect(followUpCheckbox).not.toBeChecked();
      expect(followUpInput.value).toBe("");
      expect(followUpInput).toBeDisabled();
    });
  });

  describe("UI-14: Requester Ticket Detail read-only view (FR-42, AC-04, BR-13)", () => {
    it("completely suppresses + Add Action Taken button and Edit buttons for Requesters", async () => {
      renderWithAuth(<ActionsTaken ticketId={101} isReadOnly={true} />, mockRequesterUser);

      await waitFor(() => {
        expect(screen.getByTestId("actions-taken-section")).toBeInTheDocument();
      });

      // Actions are visible in table and cards
      const table = screen.getByTestId("actions-table");
      expect(within(table).getByText("Ran memory diagnostics on laptop.")).toBeInTheDocument();

      // "+ Add Action Taken" button is completely absent from DOM
      expect(screen.queryByTestId("add-action-btn")).not.toBeInTheDocument();

      // "Actions" column header and all Edit buttons are completely absent from DOM
      expect(screen.queryByText("Actions")).not.toBeInTheDocument();
      expect(screen.queryByTestId("edit-action-btn-1")).not.toBeInTheDocument();
      expect(screen.queryByTestId("edit-action-btn-2")).not.toBeInTheDocument();
    });

    it("renders empty state without add button when viewed by Requester", async () => {
      vi.mocked(api.getTicketActionsApi).mockResolvedValue([]);

      renderWithAuth(<ActionsTaken ticketId={103} isReadOnly={true} />, mockRequesterUser);

      await waitFor(() => {
        expect(screen.getByTestId("actions-empty-state")).toBeInTheDocument();
      });

      expect(
        screen.getByText("IT Staff have not logged technical action lines for this ticket yet.")
      ).toBeInTheDocument();
      expect(screen.queryByTestId("add-first-action-btn")).not.toBeInTheDocument();
    });
  });

  describe("Edit Action & Concurrency Safeguards", () => {
    it("opens edit modal with pre-populated data and updates action on save", async () => {
      const updatedAction: api.ActionTakenDto = {
        ...mockActionsList[1],
        status: "COMPLETED",
        result: "RAM part received and installed.",
        version: 2,
      };

      vi.mocked(api.updateTicketActionApi).mockResolvedValue(updatedAction);

      renderWithAuth(<ActionsTaken ticketId={101} />);

      await waitFor(() => {
        expect(screen.getByTestId("edit-action-btn-2")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("edit-action-btn-2"));

      expect(screen.getByTestId("action-modal")).toBeInTheDocument();
      expect(screen.getByTestId("action-modal-title")).toHaveTextContent("Edit Action Taken");

      const descInput = screen.getByTestId("action-description-input") as HTMLTextAreaElement;
      expect(descInput.value).toBe("Ordered replacement RAM module.");

      fireEvent.change(screen.getByTestId("action-status-select"), {
        target: { value: "COMPLETED" },
      });
      fireEvent.change(screen.getByTestId("action-result-input"), {
        target: { value: "RAM part received and installed." },
      });

      fireEvent.click(screen.getByTestId("action-submit-btn"));

      await waitFor(() => {
        expect(api.updateTicketActionApi).toHaveBeenCalledWith(
          101,
          2,
          expect.objectContaining({
            status: "COMPLETED",
            result: "RAM part received and installed.",
            version: 1,
          })
        );
      });

      await waitFor(() => {
        expect(screen.queryByTestId("action-modal")).not.toBeInTheDocument();
      });

      expect(screen.getByTestId("action-status-badge-2")).toHaveTextContent("Completed");
    });

    it("displays error banner when optimistic concurrency conflict occurs (409)", async () => {
      const conflictError: any = new Error("Action Taken has been updated by another user.");
      conflictError.status = 409;
      vi.mocked(api.updateTicketActionApi).mockRejectedValue(conflictError);

      renderWithAuth(<ActionsTaken ticketId={101} />);

      await waitFor(() => {
        expect(screen.getByTestId("edit-action-btn-1")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("edit-action-btn-1"));
      fireEvent.click(screen.getByTestId("action-submit-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("action-form-error")).toBeInTheDocument();
      });

      expect(screen.getByTestId("action-form-error")).toHaveTextContent(
        "Action has been updated by another user. Please close and reload."
      );
      // Modal stays open
      expect(screen.getByTestId("action-modal")).toBeInTheDocument();
    });
  });
});
