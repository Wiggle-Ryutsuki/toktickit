import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Navbar from "../../src/components/Navbar";
import { AuthContext, AuthContextValue } from "../../src/context/AuthContext";
import { RequesterProvider } from "../../src/context/RequesterContext";

describe("Navbar Component (UI-03)", () => {
  let mockLogout: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockLogout = vi.fn();
  });

  function renderNavbar(user: any) {
    const mockContext: AuthContextValue = {
      user,
      isLoading: false,
      isAuthenticated: !!user,
      login: vi.fn() as any,
      logout: mockLogout as any,
      changePassword: vi.fn() as any,
      refreshUser: vi.fn() as any,
    };

    return render(
      <AuthContext.Provider value={mockContext}>
        <RequesterProvider>
          <Navbar />
        </RequesterProvider>
      </AuthContext.Provider>
    );
  }

  it("UI-03.1: Displays authenticated Requester displayName and Requester role badge", () => {
    renderNavbar({
      id: 1,
      displayName: "Jennifer Anderson",
      email: "jennifer.anderson@kmutt.ac.th",
      role: "REQUESTER",
      mustChangePassword: false,
    });

    expect(screen.getByTestId("user-display-name")).toHaveTextContent("Jennifer Anderson");
    const badge = screen.getByTestId("user-role-badge");
    expect(badge).toHaveTextContent("Requester");
    expect(badge).toHaveClass("bg-secondary");

    // Decommissioned Development Requester selector & Change button must NOT exist
    expect(screen.queryByTestId("change-requester-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("select-requester-btn")).not.toBeInTheDocument();
  });

  it("UI-03.2: Displays authenticated IT Staff displayName and IT Staff role badge", () => {
    renderNavbar({
      id: 7,
      displayName: "Somchai IT",
      email: "staff.somchai@kmutt.ac.th",
      role: "IT_STAFF",
      mustChangePassword: false,
    });

    expect(screen.getByTestId("user-display-name")).toHaveTextContent("Somchai IT");
    const badge = screen.getByTestId("user-role-badge");
    expect(badge).toHaveTextContent("IT Staff");
    expect(badge).toHaveClass("bg-success");
  });

  it("UI-03.3: Displays authenticated Administrator displayName and Administrator role badge", () => {
    renderNavbar({
      id: 11,
      displayName: "Admin User",
      email: "admin.toktickit@kmutt.ac.th",
      role: "ADMINISTRATOR",
      mustChangePassword: false,
    });

    expect(screen.getByTestId("user-display-name")).toHaveTextContent("Admin User");
    const badge = screen.getByTestId("user-role-badge");
    expect(badge).toHaveTextContent("Administrator");
    expect(badge).toHaveClass("bg-dark");
  });

  it("UI-03.4: Clicking Logout button triggers auth.logout", () => {
    renderNavbar({
      id: 1,
      displayName: "Jennifer Anderson",
      email: "jennifer.anderson@kmutt.ac.th",
      role: "REQUESTER",
      mustChangePassword: false,
    });

    const logoutBtn = screen.getByTestId("logout-btn");
    expect(logoutBtn).toBeInTheDocument();
    fireEvent.click(logoutBtn);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("UI-03.5: Opens profile dropdown, displays full email, and allows navigating to change-password", () => {
    const mockNavigate = vi.fn();
    const mockContext: AuthContextValue = {
      user: {
        id: 1,
        displayName: "Jennifer Anderson",
        email: "jennifer.anderson@kmutt.ac.th",
        role: "REQUESTER",
        mustChangePassword: false,
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn() as any,
      logout: mockLogout as any,
      changePassword: vi.fn() as any,
      refreshUser: vi.fn() as any,
    };

    render(
      <AuthContext.Provider value={mockContext}>
        <RequesterProvider>
          <Navbar onNavigate={mockNavigate} />
        </RequesterProvider>
      </AuthContext.Provider>
    );

    const profileBtn = screen.getByTestId("active-requester-display");
    fireEvent.click(profileBtn);

    expect(screen.getByText("jennifer.anderson@kmutt.ac.th")).toBeInTheDocument();
    const changePassBtn = screen.getByTestId("desktop-change-password-btn");
    expect(changePassBtn).toBeInTheDocument();

    fireEvent.click(changePassBtn);
    expect(mockNavigate).toHaveBeenCalledWith("change-password");
  });
});
