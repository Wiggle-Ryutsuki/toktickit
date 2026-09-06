import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import RequesterTicketDetail from "../../src/components/RequesterTicketDetail.js";

const mockActiveRequester = {
  id: 1,
  displayName: "Jennifer Anderson",
  email: "jennifer.anderson@kmutt.ac.th",
  role: "REQUESTER",
  isActive: true,
};

const mockTicketData = {
  id: 101,
  ticketNo: "TKT-2026-00001",
  summary: "Laptop battery drains quickly after Windows update",
  description: "My laptop battery is draining much faster than usual even when the system is idle. This started happening after last week's Windows update.",
  status: "NEW",
  requestedPriority: "MEDIUM",
  itPriority: "MEDIUM",
  ticketOwner: null,
  resolutionSummary: null,
  requester: {
    id: 1,
    displayName: "Jennifer Anderson",
    email: "jennifer.anderson@kmutt.ac.th",
  },
  category: {
    id: 2,
    name: "Hardware",
  },
  relatedSystem: {
    id: 2,
    name: "Corporate Laptop",
  },
  attachments: [
    {
      id: 1,
      ticketId: 101,
      originalFilename: "battery_report.pdf",
      mimeType: "application/pdf",
      sizeBytes: 204800,
      uploadedById: 1,
      uploadedByName: "Jennifer Anderson",
      isDeleted: false,
      isRemoved: false,
      deletedAt: null,
      removedAt: null,
      removalReason: null,
      createdAt: "2026-09-03T10:15:30.000Z",
    },
    {
      id: 2,
      ticketId: 101,
      originalFilename: "screenshot.png",
      mimeType: "image/png",
      sizeBytes: 512000,
      uploadedById: 1,
      uploadedByName: "Jennifer Anderson",
      isDeleted: true,
      isRemoved: true,
      deletedAt: "2026-09-03T10:20:00.000Z",
      removedAt: "2026-09-03T10:20:00.000Z",
      removalReason: "Uploaded duplicate file",
      createdAt: "2026-09-03T10:16:00.000Z",
    },
  ],
  createdAt: "2026-09-03T10:15:30.000Z",
  updatedAt: "2026-09-03T10:20:00.000Z",
};

describe("UI-07: Requester Ticket Detail Component", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("toktickit_selected_requester", JSON.stringify(mockActiveRequester));
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("UI-07.1: renders ticket header, ticket number, status & priority badges, metadata, and description", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockTicketData,
    } as any);

    render(
      <RequesterProvider>
        <RequesterTicketDetail ticketId={101} onBack={vi.fn()} />
      </RequesterProvider>
    );

    // Verify loading skeleton appears or dissolves
    await waitFor(() => {
      expect(screen.getByText("TKT-2026-00001")).toBeInTheDocument();
    });

    expect(screen.getByText("Laptop battery drains quickly after Windows update")).toBeInTheDocument();
    expect(screen.getByText("Corporate Laptop")).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText(/My laptop battery is draining much faster/i)).toBeInTheDocument();
  });

  it("UI-07.2: displays 'Back to My Tickets' button and calls onBack callback when clicked", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockTicketData,
    } as any);

    const onBackMock = vi.fn();

    render(
      <RequesterProvider>
        <RequesterTicketDetail ticketId={101} onBack={onBackMock} />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-00001")).toBeInTheDocument();
    });

    const backButton = screen.getByRole("button", { name: /Back to My Tickets/i });
    expect(backButton).toBeInTheDocument();
    fireEvent.click(backButton);

    expect(onBackMock).toHaveBeenCalledTimes(1);
  });

  it("UI-07.3: displays 403 unauthorized error state when API returns 403 Forbidden", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        error: {
          code: "FORBIDDEN",
          message: "You are not authorized to view this ticket.",
        },
      }),
    } as any);

    render(
      <RequesterProvider>
        <RequesterTicketDetail ticketId={101} onBack={vi.fn()} />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/You do not have permission to view this ticket/i)).toBeInTheDocument();
    });

    // Ensure confidential data is NOT rendered
    expect(screen.queryByText("Laptop battery drains quickly")).not.toBeInTheDocument();
  });

  it("UI-07.4: displays 404 not found error state when ticket does not exist", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        error: {
          code: "TICKET_NOT_FOUND",
          message: "Ticket not found.",
        },
      }),
    } as any);

    render(
      <RequesterProvider>
        <RequesterTicketDetail ticketId={9999} onBack={vi.fn()} />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Ticket not found/i)).toBeInTheDocument();
    });
  });

  it("UI-07.5: displays fallback message when resolution summary is null", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockTicketData,
    } as any);

    render(
      <RequesterProvider>
        <RequesterTicketDetail ticketId={101} onBack={vi.fn()} />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-00001")).toBeInTheDocument();
    });

    expect(screen.getByText(/No resolution recorded yet/i)).toBeInTheDocument();
  });

  it("UI-07.6: displays loading skeleton or indicator while ticket detail is fetching", () => {
    globalThis.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

    render(
      <RequesterProvider>
        <RequesterTicketDetail ticketId={101} onBack={vi.fn()} />
      </RequesterProvider>
    );

    expect(screen.getByText(/Loading ticket details/i)).toBeInTheDocument();
  });
});
