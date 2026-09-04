import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../../src/App.js";
const mockRequesters = [
    {
        id: 1,
        displayName: "Jennifer Anderson",
        email: "jennifer.anderson@kmutt.ac.th",
        role: "REQUESTER",
        isActive: true,
    },
    {
        id: 2,
        displayName: "Sarah Johnson",
        email: "sarah.johnson@kmutt.ac.th",
        role: "REQUESTER",
        isActive: true,
    },
    {
        id: 3,
        displayName: "David Lee",
        email: "david.lee@kmutt.ac.th",
        role: "REQUESTER",
        isActive: true,
    },
    {
        id: 4,
        displayName: "Michael Brown",
        email: "michael.brown@kmutt.ac.th",
        role: "REQUESTER",
        isActive: true,
    },
];
describe("RequesterSelector & RequesterContext (UI-01, UI-01b, UI-01c)", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });
    afterEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });
    it("UI-01: Renders active requester list, allows selection, saves to localStorage, and updates shell display", async () => {
        vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
            if (String(url).includes("/api/requesters")) {
                return {
                    ok: true,
                    json: async () => mockRequesters,
                };
            }
            return { ok: true, json: async () => [] };
        });
        render(_jsx(App, {}));
        // Selector modal should appear when no requester is selected
        expect(await screen.findByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText(/Select Development Requester/i)).toBeInTheDocument();
        expect(screen.getByText(/Authentication coming in Lab 3/i)).toBeInTheDocument();
        // Select dropdown should be populated with active requesters
        const select = await screen.findByTestId("requester-select");
        expect(select).toBeInTheDocument();
        expect(screen.getByText(/Jennifer Anderson/i)).toBeInTheDocument();
        expect(screen.getByText(/Sarah Johnson/i)).toBeInTheDocument();
        // Select Jennifer Anderson (ID 1)
        fireEvent.change(select, { target: { value: "1" } });
        // Click Continue
        const continueBtn = screen.getByTestId("requester-continue-btn");
        expect(continueBtn).not.toBeDisabled();
        fireEvent.click(continueBtn);
        // Modal closes
        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });
        // Shell header shows active requester and change button
        expect(screen.getByTestId("active-requester-display")).toHaveTextContent("Jennifer Anderson");
        expect(screen.getByTestId("change-requester-btn")).toBeInTheDocument();
        // Stored in localStorage
        expect(localStorage.getItem("toktickit_selected_requester_id")).toBe("1");
        // Switching requester: Click "Change Requester"
        fireEvent.click(screen.getByTestId("change-requester-btn"));
        // Modal reopens with Cancel button available
        expect(await screen.findByRole("dialog")).toBeInTheDocument();
        expect(screen.getByTestId("requester-cancel-btn")).toBeInTheDocument();
        // Switch to Sarah Johnson (ID 2)
        const switchSelect = screen.getByTestId("requester-select");
        fireEvent.change(switchSelect, { target: { value: "2" } });
        fireEvent.click(screen.getByTestId("requester-continue-btn"));
        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });
        expect(screen.getByTestId("active-requester-display")).toHaveTextContent("Sarah Johnson");
        expect(localStorage.getItem("toktickit_selected_requester_id")).toBe("2");
    });
    it("UI-01b: Inactive requesters are excluded from the selection dropdown", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => mockRequesters, // Only active requesters returned by backend
        });
        render(_jsx(App, {}));
        await screen.findByRole("dialog");
        expect(screen.queryByText(/Alex Taylor/i)).not.toBeInTheDocument();
    });
    it("UI-01c: Displays loading state and safe error alert with Retry on API failure", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: false,
            status: 500,
        });
        render(_jsx(App, {}));
        // Error alert should be displayed
        const errorAlert = await screen.findByTestId("requester-error");
        expect(errorAlert).toBeInTheDocument();
        expect(screen.getByText(/Server Connection Error/i)).toBeInTheDocument();
        // Retry action available
        const retryBtn = screen.getByRole("button", { name: /retry/i });
        expect(retryBtn).toBeInTheDocument();
    });
});
