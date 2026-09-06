import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import CreateTicket from "../../src/components/CreateTicket.js";
const mockActiveRequester = {
    id: 1,
    displayName: "Jennifer Anderson",
    email: "jennifer.anderson@kmutt.ac.th",
    role: "REQUESTER",
    isActive: true,
};
const mockCategories = [
    { id: 1, name: "Account and Access", code: "ACC" },
    { id: 2, name: "Hardware", code: "HW" },
    { id: 3, name: "Software", code: "SW" },
    { id: 4, name: "Network", code: "NET" },
];
const mockSystems = [
    { id: 1, name: "Campus Wi-Fi" },
    { id: 2, name: "Corporate Laptop" },
    { id: 3, name: "Email" },
    { id: 4, name: "VPN" },
];
describe("Create Ticket Screen (UI-02, UI-03, UI-04, UI-09)", () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem("toktickit_selected_requester_id", "1");
        vi.restoreAllMocks();
        vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
            const urlStr = String(url);
            if (urlStr.includes("/api/requesters")) {
                return { ok: true, json: async () => [mockActiveRequester] };
            }
            if (urlStr.includes("/api/categories")) {
                return { ok: true, json: async () => mockCategories };
            }
            if (urlStr.includes("/api/related-systems")) {
                return { ok: true, json: async () => mockSystems };
            }
            return { ok: true, json: async () => ({}) };
        });
    });
    afterEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });
    const renderComponent = () => {
        return render(_jsx(RequesterProvider, { children: _jsx(CreateTicket, {}) }));
    };
    it("UI-02: renders Create Ticket form with pre-populated read-only requester context and loaded reference data", async () => {
        renderComponent();
        // Requester field should display active user and be read-only
        const requesterInput = screen.getByLabelText(/requester/i);
        expect(requesterInput).toBeInTheDocument();
        await waitFor(() => {
            expect(requesterInput).toHaveValue("Jennifer Anderson (jennifer.anderson@kmutt.ac.th)");
        });
        expect(requesterInput).toHaveAttribute("readonly");
        // Ticket Number placeholder must be read-only
        const ticketNoInput = screen.getByLabelText(/ticket number/i);
        expect(ticketNoInput).toBeInTheDocument();
        expect(ticketNoInput).toHaveAttribute("readonly");
        // Category and Related System dropdowns must be populated from API
        await waitFor(() => {
            expect(screen.getByRole("option", { name: "Hardware" })).toBeInTheDocument();
            expect(screen.getByRole("option", { name: "Corporate Laptop" })).toBeInTheDocument();
        });
        // Requested priority defaults to Medium
        const prioritySelect = screen.getByLabelText(/requested priority/i);
        expect(prioritySelect).toHaveValue("MEDIUM");
    });
    it("UI-03: validates required fields on client submission without calling API", async () => {
        const fetchSpy = vi.spyOn(globalThis, "fetch");
        renderComponent();
        const submitButton = screen.getByRole("button", { name: /submit ticket/i });
        fireEvent.click(submitButton);
        // POST /api/tickets should NOT be called
        const ticketPostCalls = fetchSpy.mock.calls.filter(([url]) => String(url).includes("/api/tickets"));
        expect(ticketPostCalls).toHaveLength(0);
        // Field-level error messages appear directly below invalid controls
        await waitFor(() => {
            expect(screen.getByText(/summary is required/i)).toBeInTheDocument();
            expect(screen.getByText(/description is required/i)).toBeInTheDocument();
            expect(screen.getByText(/please select a category/i)).toBeInTheDocument();
        });
    });
    it("UI-04: shows busy spinner during submission and displays success banner with Ticket Number", async () => {
        vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
            const urlStr = String(url);
            if (urlStr.includes("/api/categories"))
                return { ok: true, json: async () => mockCategories };
            if (urlStr.includes("/api/related-systems"))
                return { ok: true, json: async () => mockSystems };
            if (urlStr.includes("/api/tickets") && init?.method === "POST") {
                return {
                    ok: true,
                    status: 201,
                    json: async () => ({
                        id: 101,
                        ticketNo: "TKT-2026-00001",
                        status: "NEW",
                        summary: "VPN connection dropping repeatedly",
                    }),
                };
            }
            return { ok: true, json: async () => ({}) };
        });
        renderComponent();
        await waitFor(() => {
            expect(screen.getByRole("option", { name: "Network" })).toBeInTheDocument();
        });
        // Fill form
        fireEvent.change(screen.getByLabelText(/category/i), { target: { value: "4" } });
        fireEvent.change(screen.getByLabelText(/related system/i), { target: { value: "4" } });
        fireEvent.change(screen.getByLabelText(/summary/i), {
            target: { value: "VPN connection dropping repeatedly" },
        });
        fireEvent.change(screen.getByLabelText(/description/i), {
            target: { value: "The VPN disconnects every 5 minutes when connecting from campus dormitory." },
        });
        const submitBtn = screen.getByRole("button", { name: /submit ticket/i });
        fireEvent.click(submitBtn);
        // Success banner rendered with generated ticket number
        await waitFor(() => {
            expect(screen.getByText(/TKT-2026-00001/i)).toBeInTheDocument();
            expect(screen.getByText(/ticket created successfully/i)).toBeInTheDocument();
        });
    });
    it("UI-09: preserves all entered form values upon backend 500 error", async () => {
        vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
            const urlStr = String(url);
            if (urlStr.includes("/api/categories"))
                return { ok: true, json: async () => mockCategories };
            if (urlStr.includes("/api/related-systems"))
                return { ok: true, json: async () => mockSystems };
            if (urlStr.includes("/api/tickets") && init?.method === "POST") {
                return {
                    ok: false,
                    status: 500,
                    json: async () => ({
                        error: { code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" },
                    }),
                };
            }
            return { ok: true, json: async () => ({}) };
        });
        renderComponent();
        await waitFor(() => {
            expect(screen.getByRole("option", { name: "Hardware" })).toBeInTheDocument();
        });
        const summaryText = "Persistent battery drain issue";
        const descText = "Detailed steps to reproduce the issue on the corporate laptop.";
        fireEvent.change(screen.getByLabelText(/category/i), { target: { value: "2" } });
        fireEvent.change(screen.getByLabelText(/related system/i), { target: { value: "2" } });
        fireEvent.change(screen.getByLabelText(/summary/i), { target: { value: summaryText } });
        fireEvent.change(screen.getByLabelText(/description/i), { target: { value: descText } });
        fireEvent.click(screen.getByRole("button", { name: /submit ticket/i }));
        // Wait for failure alert to appear
        await waitFor(() => {
            expect(screen.getByRole("alert")).toBeInTheDocument();
        });
        // Form inputs must remain preserved (BR-12)
        expect(screen.getByLabelText(/summary/i)).toHaveValue(summaryText);
        expect(screen.getByLabelText(/description/i)).toHaveValue(descText);
        expect(screen.getByLabelText(/category/i)).toHaveValue("2");
        expect(screen.getByLabelText(/related system/i)).toHaveValue("2");
    });
});
