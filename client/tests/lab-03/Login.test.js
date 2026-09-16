import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Login from "../../src/components/Login";
import { AuthContext } from "../../src/context/AuthContext";
describe("Login Component (UI-01)", () => {
    let mockLogin;
    let mockContext;
    beforeEach(() => {
        vi.restoreAllMocks();
        mockLogin = vi.fn();
        mockContext = {
            user: null,
            isLoading: false,
            isAuthenticated: false,
            login: mockLogin,
            logout: vi.fn(),
            changePassword: vi.fn(),
            refreshUser: vi.fn(),
        };
    });
    function renderLogin(contextValue = mockContext) {
        return render(_jsx(AuthContext.Provider, { value: contextValue, children: _jsx(Login, {}) }));
    }
    it("UI-01.1: Form renders brand header, email and password input fields, and submit button", () => {
        renderLogin();
        expect(screen.getByText("TokTickIT")).toBeInTheDocument();
        expect(screen.getByText(/Sign in to your account/i)).toBeInTheDocument();
        expect(screen.getByTestId("email-input")).toBeInTheDocument();
        expect(screen.getByTestId("password-input")).toBeInTheDocument();
        expect(screen.getByTestId("login-submit-btn")).toBeInTheDocument();
    });
    it("UI-01.2: Submitting empty fields displays inline validation errors without calling API", async () => {
        renderLogin();
        const submitBtn = screen.getByTestId("login-submit-btn");
        fireEvent.click(submitBtn);
        expect(await screen.findByTestId("email-error")).toHaveTextContent(/Email address is required/i);
        expect(await screen.findByTestId("password-error")).toHaveTextContent(/Password is required/i);
        expect(mockLogin).not.toHaveBeenCalled();
    });
    it("UI-01.3: Toggles password visibility between masked and unmasked", () => {
        renderLogin();
        const passwordInput = screen.getByTestId("password-input");
        const toggleBtn = screen.getByTestId("password-toggle-btn");
        expect(passwordInput).toHaveAttribute("type", "password");
        expect(toggleBtn).toHaveTextContent(/Show/i);
        fireEvent.click(toggleBtn);
        expect(passwordInput).toHaveAttribute("type", "text");
        expect(toggleBtn).toHaveTextContent(/Hide/i);
        fireEvent.click(toggleBtn);
        expect(passwordInput).toHaveAttribute("type", "password");
    });
    it("UI-01.4: Submitting valid credentials calls login API with trimmed email and shows busy state", async () => {
        let resolveLogin;
        const loginPromise = new Promise((resolve) => {
            resolveLogin = resolve;
        });
        mockLogin.mockReturnValue(loginPromise);
        renderLogin();
        fireEvent.change(screen.getByTestId("email-input"), {
            target: { value: "  jennifer.anderson@kmutt.ac.th  " },
        });
        fireEvent.change(screen.getByTestId("password-input"), {
            target: { value: "Password123!" },
        });
        const submitBtn = screen.getByTestId("login-submit-btn");
        fireEvent.click(submitBtn);
        // Busy state / disabled during request
        expect(submitBtn).toBeDisabled();
        expect(submitBtn).toHaveTextContent(/Signing In.../i);
        expect(mockLogin).toHaveBeenCalledWith("jennifer.anderson@kmutt.ac.th", "Password123!");
        // Resolve login
        resolveLogin({
            id: 1,
            email: "jennifer.anderson@kmutt.ac.th",
            displayName: "Jennifer Anderson",
            role: "REQUESTER",
            mustChangePassword: false,
        });
        await waitFor(() => {
            expect(submitBtn).not.toBeDisabled();
        });
    });
    it("UI-01.5: API failure displays dismissible error alert banner", async () => {
        mockLogin.mockRejectedValue(new Error("Invalid email or password. Please try again."));
        renderLogin();
        fireEvent.change(screen.getByTestId("email-input"), {
            target: { value: "jennifer.anderson@kmutt.ac.th" },
        });
        fireEvent.change(screen.getByTestId("password-input"), {
            target: { value: "WrongPassword!" },
        });
        fireEvent.click(screen.getByTestId("login-submit-btn"));
        const alert = await screen.findByTestId("login-error-alert");
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent("Invalid email or password. Please try again.");
        // Dismiss alert
        const dismissBtn = alert.querySelector(".btn-close");
        expect(dismissBtn).toBeInTheDocument();
        fireEvent.click(dismissBtn);
        await waitFor(() => {
            expect(screen.queryByTestId("login-error-alert")).not.toBeInTheDocument();
        });
    });
});
