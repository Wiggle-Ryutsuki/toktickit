import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RequesterTicketDetail from "../../src/components/RequesterTicketDetail";
import { RequesterProvider } from "../../src/context/RequesterContext";
import { AuthContext, AuthContextValue } from "../../src/context/AuthContext";

const mockRequesterUser = {
  id: 1,
  displayName: "Jennifer Anderson",
  email: "jennifer.anderson@kmutt.ac.th",
  role: "REQUESTER" as const,
  mustChangePassword: false,
};

const mockTicketDetail = {
  id: 101,
  ticketNo: "TKT-2026-00001",
  summary: "VPN connection dropping repeatedly",
  description: "The VPN disconnects every 5 minutes when connecting from off-campus.",
  status: "IN_PROGRESS",
  requestedPriority: "MEDIUM",
  itPriority: "HIGH",
  ticketOwner: "Malee Jaidee",
  resolutionSummary: null,
  requesterResolutionConfirmedAt: null,
  createdAt: "2026-09-03T10:15:30.000Z",
  updatedAt: "2026-09-04T11:20:00.000Z",
  requester: { id: 1, displayName: "Jennifer Anderson", email: "jennifer.anderson@kmutt.ac.th" },
  category: { id: 4, name: "Network" },
  relatedSystem: { id: 4, name: "VPN" },
  attachments: [],
  comments: [
    {
      id: 1,
      ticketId: 101,
      authorId: 8,
      commentType: "PUBLIC",
      content: "We pushed a configuration update to the VPN cluster.",
      createdAt: "2026-09-04T09:00:00.000Z",
      author: { id: 8, displayName: "Malee Jaidee", email: "staff.malee@kmutt.ac.th", role: "IT_STAFF" },
    },
  ],
};

describe("Requester Ticket Detail & Resolution Indication (UI-08)", () => {
  let mockContext: AuthContextValue;
  const mockOnBack = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("toktickit_selected_requester", JSON.stringify(mockRequesterUser));
    vi.restoreAllMocks();
    mockContext = {
      user: mockRequesterUser,
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn() as any,
      logout: vi.fn() as any,
      changePassword: vi.fn() as any,
      refreshUser: vi.fn() as any,
    };

    // Mock window.fetch
    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      const urlStr = String(url);

      if (urlStr.includes("/api/tickets/101") && (!init || init.method === "GET" || !init.method)) {
        return {
          ok: true,
          status: 200,
          json: async () => JSON.parse(JSON.stringify(mockTicketDetail)),
        };
      }

      if (urlStr.includes("/resolve-indication") && init?.method === "POST") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            requesterResolutionConfirmedAt: "2026-09-04T14:30:00.000Z",
            message: "Requester resolution indication recorded.",
          }),
        };
      }

      if (urlStr.includes("/comments") && init?.method === "POST") {
        const body = JSON.parse(init.body as string);
        return {
          ok: true,
          status: 201,
          json: async () => ({
            id: 2,
            ticketId: 101,
            authorId: 1,
            commentType: "PUBLIC",
            content: body.content,
            createdAt: "2026-09-04T15:00:00.000Z",
            author: mockRequesterUser,
          }),
        };
      }

      return {
        ok: false,
        status: 404,
        json: async () => ({ error: { code: "NOT_FOUND", message: "Not found" } }),
      };
    }) as any;
  });

  function renderRequesterDetail(ticketId = 101) {
    return render(
      <AuthContext.Provider value={mockContext}>
        <RequesterProvider>
          <RequesterTicketDetail ticketId={ticketId} onBack={mockOnBack} />
        </RequesterProvider>
      </AuthContext.Provider>
    );
  }

  it("UI-08.1: Renders 'Problem Appears Resolved' button when ticket is active and unconfirmed", async () => {
    renderRequesterDetail();

    await waitFor(() => {
      expect(screen.getByTestId("problem-appears-resolved-btn")).toBeInTheDocument();
    });

    const resolveBtn = screen.getByTestId("problem-appears-resolved-btn");
    expect(resolveBtn).toHaveTextContent(/Problem Appears Resolved/i);
    expect(screen.queryByTestId("requester-resolved-indication")).not.toBeInTheDocument();
  });

  it("UI-08.2: Clicking 'Problem Appears Resolved' sends indication and renders confirmed banner", async () => {
    renderRequesterDetail();

    await waitFor(() => {
      expect(screen.getByTestId("problem-appears-resolved-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("problem-appears-resolved-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("requester-resolved-indication")).toBeInTheDocument();
    });

    expect(screen.getByText(/Problem Appears Resolved:/i)).toBeInTheDocument();
    expect(screen.queryByTestId("problem-appears-resolved-btn")).not.toBeInTheDocument();

    // Verify ticket status remains IN_PROGRESS (not formally closed/resolved)
    expect(screen.getByText("IN_PROGRESS")).toBeInTheDocument();
  });

  it("UI-08.3: Renders confirmed indicator banner immediately when already indicated", async () => {
    const ticketWithConfirmation = {
      ...mockTicketDetail,
      requesterResolutionConfirmedAt: "2026-09-04T10:00:00.000Z",
    };

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes("/api/tickets/101")) {
        return {
          ok: true,
          status: 200,
          json: async () => ticketWithConfirmation,
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    }) as any;

    renderRequesterDetail();

    await waitFor(() => {
      expect(screen.getByTestId("requester-resolved-indication")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("problem-appears-resolved-btn")).not.toBeInTheDocument();
  });

  it("UI-08.4: Renders Public Comments thread and allows Requester to post a comment", async () => {
    renderRequesterDetail();

    await waitFor(() => {
      expect(screen.getByTestId("requester-comments-card")).toBeInTheDocument();
    });

    // Existing comment from IT staff visible
    expect(screen.getByText("We pushed a configuration update to the VPN cluster.")).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/Type your message to IT Staff/i);
    fireEvent.change(textarea, { target: { value: "I tested the connection and it stayed stable for 2 hours." } });
    fireEvent.click(screen.getByText("Post Public Comment"));

    await waitFor(() => {
      expect(screen.getByText("I tested the connection and it stayed stable for 2 hours.")).toBeInTheDocument();
    });
  });

  it("UI-08.5: Internal Notes are NEVER rendered or accessible to Requester", async () => {
    renderRequesterDetail();

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-00001")).toBeInTheDocument();
    });

    expect(screen.queryByText(/Internal Notes/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("tab-notes")).not.toBeInTheDocument();
    expect(screen.queryByTestId("internal-notes-section")).not.toBeInTheDocument();
    expect(screen.queryByTestId("internal-notes-confidential-banner")).not.toBeInTheDocument();
  });
});
