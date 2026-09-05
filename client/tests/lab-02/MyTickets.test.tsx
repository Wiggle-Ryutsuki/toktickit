import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import React from "react";
import { RequesterProvider } from "../../src/context/RequesterContext";
import MyTickets from "../../src/components/MyTickets";

const mockActiveRequester1 = {
  id: 1,
  displayName: "Jennifer Anderson",
  email: "jennifer.anderson@kmutt.ac.th",
  role: "REQUESTER",
  isActive: true,
};

const mockActiveRequester2 = {
  id: 2,
  displayName: "Sarah Johnson",
  email: "sarah.johnson@kmutt.ac.th",
  role: "REQUESTER",
  isActive: true,
};

const mockCategories = [
  { id: 1, name: "Account and Access", code: "ACC" },
  { id: 2, name: "Hardware", code: "HW" },
  { id: 3, name: "Software", code: "SW" },
  { id: 4, name: "Network", code: "NET" },
];

const mockTicketsUser1 = [
  {
    id: 101,
    ticketNo: "TKT-2026-00001",
    summary: "VPN connection dropping repeatedly",
    description: "The VPN disconnects every 5 minutes when connecting from campus dormitory.",
    status: "NEW",
    requestedPriority: "MEDIUM",
    itPriority: "MEDIUM",
    categoryName: "Network",
    category: { id: 4, name: "Network", code: "NET" },
    relatedSystemName: "VPN",
    relatedSystem: { id: 4, name: "VPN" },
    ticketOwner: null,
    requester: { id: 1, displayName: "Jennifer Anderson", email: "jennifer.anderson@kmutt.ac.th" },
    createdAt: "2026-09-03T10:15:30.000Z",
    updatedAt: "2026-09-03T10:15:30.000Z",
  },
  {
    id: 102,
    ticketNo: "TKT-2026-00002",
    summary: "Laptop battery drains quickly after Windows update",
    description: "Battery discharges completely within 20 minutes of startup.",
    status: "NEW",
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    categoryName: "Hardware",
    category: { id: 2, name: "Hardware", code: "HW" },
    relatedSystemName: "Corporate Laptop",
    relatedSystem: { id: 2, name: "Corporate Laptop" },
    ticketOwner: null,
    requester: { id: 1, displayName: "Jennifer Anderson", email: "jennifer.anderson@kmutt.ac.th" },
    createdAt: "2026-09-04T12:30:00.000Z",
    updatedAt: "2026-09-04T14:00:00.000Z",
  },
];

describe("My Tickets Screen (UI-05, UI-06)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("toktickit_selected_requester_id", "1");
    vi.restoreAllMocks();

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/requesters")) {
        return { ok: true, json: async () => [mockActiveRequester1, mockActiveRequester2] } as Response;
      }
      if (urlStr.includes("/api/categories")) {
        return { ok: true, json: async () => mockCategories } as Response;
      }
      if (urlStr.includes("/api/tickets")) {
        if (urlStr.includes("requesterId=1")) {
          // If search matches "battery"
          if (urlStr.includes("search=battery")) {
            return {
              ok: true,
              json: async () => ({
                data: [mockTicketsUser1[1]],
                pagination: { totalItems: 1, totalPages: 1, currentPage: 1, limit: 10 },
              }),
            } as Response;
          }
          // If search matches nothing
          if (urlStr.includes("search=nonexistent")) {
            return {
              ok: true,
              json: async () => ({
                data: [],
                pagination: { totalItems: 0, totalPages: 0, currentPage: 1, limit: 10 },
              }),
            } as Response;
          }
          return {
            ok: true,
            json: async () => ({
              data: mockTicketsUser1,
              pagination: { totalItems: 2, totalPages: 1, currentPage: 1, limit: 10 },
            }),
          } as Response;
        }
        if (urlStr.includes("requesterId=2")) {
          return {
            ok: true,
            json: async () => ({
              data: [],
              pagination: { totalItems: 0, totalPages: 0, currentPage: 1, limit: 10 },
            }),
          } as Response;
        }
      }
      return { ok: true, json: async () => ({}) } as Response;
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const renderComponent = (props: { onNavigateCreate?: () => void; onViewDetail?: (id: number) => void } = {}) => {
    return render(
      <RequesterProvider>
        <MyTickets {...props} />
      </RequesterProvider>
    );
  };

  it("UI-05.1: renders ticket table with correct columns, summary, category, status and priority badges", async () => {
    renderComponent();

    // Verify table headers exist using exact columnheader roles
    expect(await screen.findByRole("columnheader", { name: /Ticket No/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Summary$/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Category$/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /^Status$/i })).toBeInTheDocument();

    // Verify tickets are rendered inside table
    await waitFor(() => {
      const table = screen.getByTestId("tickets-table");
      expect(within(table).getByText("TKT-2026-00001")).toBeInTheDocument();
      expect(within(table).getByText("VPN connection dropping repeatedly")).toBeInTheDocument();
      expect(within(table).getByText("TKT-2026-00002")).toBeInTheDocument();
      expect(within(table).getByText("Laptop battery drains quickly after Windows update")).toBeInTheDocument();
    });

    // Record count indicator
    expect(screen.getByText(/Showing 1 to 2 of 2 tickets/i)).toBeInTheDocument();
  });

  it("UI-05.2: renders friendly Empty State when active requester has 0 tickets", async () => {
    // Switch to requester 2 who has 0 tickets
    localStorage.setItem("toktickit_selected_requester_id", "2");
    renderComponent();

    // Empty state heading and prompt
    await waitFor(() => {
      expect(screen.getByText(/No tickets submitted yet/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/You have not created any IT support tickets/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /\+ Create Ticket/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("UI-06.1: typing into search input triggers filtered query and updates results", async () => {
    renderComponent();

    await waitFor(() => {
      const table = screen.getByTestId("tickets-table");
      expect(within(table).getByText("TKT-2026-00001")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by ticket # or summary/i);
    fireEvent.change(searchInput, { target: { value: "battery" } });

    await waitFor(
      () => {
        const table = screen.getByTestId("tickets-table");
        expect(within(table).getByText("Laptop battery drains quickly after Windows update")).toBeInTheDocument();
        expect(within(table).queryByText("VPN connection dropping repeatedly")).not.toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it("UI-06.3: renders No-Results State when filters match 0 tickets and restores list when Clear Filters is clicked", async () => {
    renderComponent();

    await waitFor(() => {
      const table = screen.getByTestId("tickets-table");
      expect(within(table).getByText("TKT-2026-00001")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by ticket # or summary/i);
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });

    await waitFor(
      () => {
        expect(screen.getByText(/No matching tickets found/i)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // Clear filters button should be present
    const clearBtns = screen.getAllByRole("button", { name: /Clear Filters/i });
    expect(clearBtns.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(clearBtns[0]);

    // Form search input is cleared and full list restored
    await waitFor(
      () => {
        const table = screen.getByTestId("tickets-table");
        expect(within(table).getByText("TKT-2026-00001")).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it("UI-06.6: renders error banner when API call fails and recovers on Retry click", async () => {
    // Make /api/tickets fail initially
    let shouldFail = true;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/requesters")) {
        return { ok: true, json: async () => [mockActiveRequester1, mockActiveRequester2] } as Response;
      }
      if (urlStr.includes("/api/categories")) {
        return { ok: true, json: async () => mockCategories } as Response;
      }
      if (urlStr.includes("/api/tickets")) {
        if (shouldFail) {
          return { ok: false, status: 500 } as Response;
        }
        return {
          ok: true,
          json: async () => ({
            data: mockTicketsUser1,
            pagination: { totalItems: 2, totalPages: 1, currentPage: 1, limit: 10 },
          }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });

    renderComponent();

    // Verify error banner is shown
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/Unable to load tickets from server/i)).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole("button", { name: /Retry/i });
    expect(retryBtn).toBeInTheDocument();

    // Now make fetch succeed and click Retry
    shouldFail = false;
    fireEvent.click(retryBtn);

    // Verify tickets load after retry
    await waitFor(() => {
      const table = screen.getByTestId("tickets-table");
      expect(within(table).getByText("TKT-2026-00001")).toBeInTheDocument();
    });
  });
});

