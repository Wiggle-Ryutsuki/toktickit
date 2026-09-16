import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ChangePassword from "../../src/components/ChangePassword";
import { AuthContext, AuthContextValue } from "../../src/context/AuthContext";

describe("ChangePassword Component (UI-02)", () => {
  let mockChangePassword: ReturnType<typeof vi.fn>;
  let mockLogout: ReturnType<typeof vi.fn>;
  let mockContext: AuthContextValue;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockChangePassword = vi.fn();
    mockLogout = vi.fn();
    mockContext = {
      user: {
        id: 5,
        email: "firstlogin.requester@kmutt.ac.th",
        displayName: "FirstLogin Requester",
        role: "REQUESTER",
        mustChangePassword: true,
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn() as any,
      logout: mockLogout as any,
      changePassword: mockChangePassword as any,
      refreshUser: vi.fn() as any,
    };
  });

  function renderChangePassword(contextValue = mockContext) {
    return render(
      <AuthContext.Provider value={contextValue}>
        <ChangePassword />
      </AuthContext.Provider>
    );
  }

  it("UI-02.1: Renders heading, 3 password inputs, checklist, and initially disabled Continue button", () => {
    renderChangePassword();

    expect(screen.getByText("Change Your Password")).toBeInTheDocument();
    expect(screen.getByText(/You must change your password to continue/i)).toBeInTheDocument();
    expect(screen.getByTestId("current-password-input")).toBeInTheDocument();
    expect(screen.getByTestId("new-password-input")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-password-input")).toBeInTheDocument();

    expect(screen.getByTestId("rule-length")).toBeInTheDocument();
    expect(screen.getByTestId("rule-cases")).toBeInTheDocument();
    expect(screen.getByTestId("rule-special")).toBeInTheDocument();
    expect(screen.getByTestId("rule-match")).toBeInTheDocument();

    const submitBtn = screen.getByTestId("change-password-submit-btn");
    expect(submitBtn).toBeDisabled();
  });

  it("UI-02.2: Dynamic checklist updates in real time as password complexity rules are satisfied", () => {
    renderChangePassword();

    const newPasswordInput = screen.getByTestId("new-password-input");
    const confirmPasswordInput = screen.getByTestId("confirm-password-input");

    // Initially all rules unfulfilled
    expect(screen.getByTestId("rule-length")).toHaveTextContent("○");
    expect(screen.getByTestId("rule-cases")).toHaveTextContent("○");
    expect(screen.getByTestId("rule-special")).toHaveTextContent("○");
    expect(screen.getByTestId("rule-match")).toHaveTextContent("○");

    // Type 8 characters (lowercase only)
    fireEvent.change(newPasswordInput, { target: { value: "password" } });
    expect(screen.getByTestId("rule-length")).toHaveTextContent("✓");
    expect(screen.getByTestId("rule-cases")).toHaveTextContent("○");

    // Add uppercase
    fireEvent.change(newPasswordInput, { target: { value: "Password" } });
    expect(screen.getByTestId("rule-cases")).toHaveTextContent("✓");
    expect(screen.getByTestId("rule-special")).toHaveTextContent("○");

    // Add digit and special character
    fireEvent.change(newPasswordInput, { target: { value: "Password123!" } });
    expect(screen.getByTestId("rule-special")).toHaveTextContent("✓");
    expect(screen.getByTestId("rule-match")).toHaveTextContent("○");

    // Confirm password matches
    fireEvent.change(confirmPasswordInput, { target: { value: "Password123!" } });
    expect(screen.getByTestId("rule-match")).toHaveTextContent("✓");
  });

  it("UI-02.3: Submit button enables only when all rules are met and current password is provided", () => {
    renderChangePassword();

    const currentInput = screen.getByTestId("current-password-input");
    const newInput = screen.getByTestId("new-password-input");
    const confirmInput = screen.getByTestId("confirm-password-input");
    const submitBtn = screen.getByTestId("change-password-submit-btn");

    expect(submitBtn).toBeDisabled();

    // Fill valid new passwords but leave current password empty
    fireEvent.change(newInput, { target: { value: "NewSecurePass123!" } });
    fireEvent.change(confirmInput, { target: { value: "NewSecurePass123!" } });
    expect(submitBtn).toBeDisabled();

    // Fill current password
    fireEvent.change(currentInput, { target: { value: "InitialPass123!" } });
    expect(submitBtn).not.toBeDisabled();
  });

  it("UI-02.4: Prevents submission and shows alert if new password is identical to current password", async () => {
    renderChangePassword();

    fireEvent.change(screen.getByTestId("current-password-input"), {
      target: { value: "InitialPass123!" },
    });
    fireEvent.change(screen.getByTestId("new-password-input"), {
      target: { value: "InitialPass123!" },
    });
    fireEvent.change(screen.getByTestId("confirm-password-input"), {
      target: { value: "InitialPass123!" },
    });

    const submitBtn = screen.getByTestId("change-password-submit-btn");
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    const alert = await screen.findByTestId("change-password-error-alert");
    expect(alert).toHaveTextContent(/New password cannot be identical to current password/i);
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it("UI-02.5: Submitting valid form calls changePassword API with all fields", async () => {
    mockChangePassword.mockResolvedValue({
      id: 5,
      email: "firstlogin.requester@kmutt.ac.th",
      displayName: "FirstLogin Requester",
      role: "REQUESTER",
      mustChangePassword: false,
    });

    renderChangePassword();

    fireEvent.change(screen.getByTestId("current-password-input"), {
      target: { value: "InitialPass123!" },
    });
    fireEvent.change(screen.getByTestId("new-password-input"), {
      target: { value: "NewPassword456#" },
    });
    fireEvent.change(screen.getByTestId("confirm-password-input"), {
      target: { value: "NewPassword456#" },
    });

    fireEvent.click(screen.getByTestId("change-password-submit-btn"));

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith(
        "InitialPass123!",
        "NewPassword456#",
        "NewPassword456#"
      );
    });
  });

  it("UI-02.6: Logout action allows user to exit change password flow", () => {
    renderChangePassword();

    const logoutBtn = screen.getByTestId("change-password-logout-btn");
    fireEvent.click(logoutBtn);

    expect(mockLogout).toHaveBeenCalled();
  });
});
