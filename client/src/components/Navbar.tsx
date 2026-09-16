import React, { useState, useEffect, useRef, useContext } from "react";
import { AuthContext } from "../context/AuthContext.js";
import { useRequester } from "../context/RequesterContext.js";

export interface NavbarProps {
  activeView?: "tickets" | "create-ticket" | "ticket-detail" | "change-password" | "queue" | "admin";
  onNavigate?: (view: any) => void;
}

export default function Navbar({ activeView = "tickets", onNavigate }: NavbarProps) {
  const auth = useContext(AuthContext);
  const { selectedRequester, openSelector } = useRequester();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isDesktopProfileOpen, setIsDesktopProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const desktopMenuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (desktopMenuRef.current && !desktopMenuRef.current.contains(event.target as Node)) {
        setIsDesktopProfileOpen(false);
      }
    }
    if (isProfileMenuOpen || isDesktopProfileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileMenuOpen, isDesktopProfileOpen]);

  const activeUser = auth?.user
    ? {
        displayName: auth.user.displayName,
        email: auth.user.email,
        role: auth.user.role,
      }
    : selectedRequester
    ? {
        displayName: selectedRequester.displayName,
        email: selectedRequester.email,
        role: selectedRequester.role,
      }
    : null;

  const handleLogout = async () => {
    if (auth?.logout) {
      await auth.logout();
    }
  };

  const getRoleBadgeClass = (role?: string) => {
    switch (role) {
      case "ADMINISTRATOR":
        return "bg-dark text-white";
      case "IT_STAFF":
        return "bg-success text-white";
      default:
        return "bg-secondary text-white";
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case "ADMINISTRATOR":
        return "Administrator";
      case "IT_STAFF":
        return "IT Staff";
      default:
        return "Requester";
    }
  };

  return (
    <>
      {/* Top Navigation Header */}
      <header className="zen-header navbar navbar-expand-lg sticky-top">
        <div className="container-fluid d-flex justify-content-between align-items-center">
          {/* Brand & Desktop Links */}
          <div className="d-flex align-items-center gap-4">
            <a
              className="navbar-brand d-flex align-items-center gap-2 m-0 text-decoration-none"
              href="#/"
              onClick={(e) => {
                e.preventDefault();
                onNavigate?.("tickets");
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "1.5rem" }}>
                avg_pace
              </span>
              <span>TokTickIT</span>
            </a>

            {/* Role-Based Desktop Navigation Links (>=768px) */}
            <nav className="d-none d-md-flex gap-3">
              {(!activeUser || activeUser.role === "REQUESTER") && (
                <>
                  <a
                    className={`nav-link text-decoration-none ${activeView === "tickets" ? "active" : ""}`}
                    href="#/my-tickets"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate?.("tickets");
                    }}
                  >
                    My Tickets
                  </a>
                  <a
                    className={`nav-link text-decoration-none ${activeView === "create-ticket" ? "active" : ""}`}
                    href="#/create-ticket"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate?.("create-ticket");
                    }}
                  >
                    + Create Ticket
                  </a>
                </>
              )}

              {activeUser?.role === "IT_STAFF" && (
                <>
                  <a
                    className={`nav-link text-decoration-none ${activeView === "queue" ? "active" : ""}`}
                    href="#/queue"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate?.("queue");
                    }}
                  >
                    My Queue
                  </a>
                  <a
                    className={`nav-link text-decoration-none ${activeView === "create-ticket" ? "active" : ""}`}
                    href="#/create-ticket"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate?.("create-ticket");
                    }}
                  >
                    + Create Ticket
                  </a>
                </>
              )}

              {activeUser?.role === "ADMINISTRATOR" && (
                <>
                  <a
                    className={`nav-link text-decoration-none ${activeView === "admin" ? "active" : ""}`}
                    href="#/admin/users"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate?.("admin");
                    }}
                  >
                    Admin
                  </a>
                  <a
                    className={`nav-link text-decoration-none ${activeView === "queue" ? "active" : ""}`}
                    href="#/queue"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate?.("queue");
                    }}
                  >
                    My Queue
                  </a>
                </>
              )}
            </nav>
          </div>

          {/* Desktop User Profile Badge & Logout (>=768px) */}
          <div className="d-none d-md-flex align-items-center gap-3">
            {auth?.user ? (
              <div className="position-relative d-flex align-items-center gap-2" ref={desktopMenuRef}>
                <button
                  type="button"
                  className="zen-user-badge d-flex align-items-center gap-2 border-0 bg-transparent text-white p-0"
                  style={{ cursor: "pointer" }}
                  onClick={() => setIsDesktopProfileOpen((prev) => !prev)}
                  aria-expanded={isDesktopProfileOpen}
                  aria-label="User account menu"
                  data-testid="active-requester-display"
                >
                  <span
                    className="d-flex align-items-center gap-2 px-3 py-1 rounded-pill"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.18)",
                      border: "1px solid rgba(255, 255, 255, 0.35)",
                    }}
                  >
                    <span>👤</span>
                    <span className="fw-semibold text-white" data-testid="user-display-name">
                      {auth.user.displayName}
                    </span>
                    <span
                      className={`badge ${getRoleBadgeClass(auth.user.role)} ms-1`}
                      data-testid="user-role-badge"
                    >
                      {getRoleLabel(auth.user.role)}
                    </span>
                    <span style={{ fontSize: "0.65rem", opacity: 0.85 }}>▼</span>
                  </span>
                </button>

                {isDesktopProfileOpen && (
                  <div
                    className="zen-card p-3 shadow-lg position-absolute end-0 text-dark"
                    style={{
                      top: "calc(100% + 10px)",
                      width: "280px",
                      zIndex: 1060,
                      border: "1px solid #DDE5E1",
                      borderRadius: "12px",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <div
                        className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                        style={{
                          width: "38px",
                          height: "38px",
                          backgroundColor: "var(--color-pale-green, #eaf6ef)",
                          color: "var(--color-primary-green, #006b3c)",
                          fontSize: "1.2rem",
                        }}
                      >
                        👤
                      </div>
                      <div className="overflow-hidden">
                        <div className="fw-bold small text-truncate">{auth.user.displayName}</div>
                        <div className="text-muted text-truncate" style={{ fontSize: "0.75rem" }} title={auth.user.email}>
                          {auth.user.email}
                        </div>
                      </div>
                    </div>

                    <div className="mb-2">
                      <span
                        className={`badge ${getRoleBadgeClass(auth.user.role)}`}
                        style={{ fontSize: "0.75rem" }}
                      >
                        Role: {getRoleLabel(auth.user.role)}
                      </span>
                    </div>

                    <hr className="my-2" />

                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success w-100 d-flex align-items-center justify-content-center gap-2"
                      onClick={() => {
                        setIsDesktopProfileOpen(false);
                        onNavigate?.("change-password");
                      }}
                      data-testid="desktop-change-password-btn"
                    >
                      <span>🔑</span>
                      <span>Change Password</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  className="btn-zen-outline-light"
                  onClick={handleLogout}
                  data-testid="logout-btn"
                >
                  Logout
                </button>
              </div>
            ) : selectedRequester ? (
              <>
                <span
                  className="zen-user-badge d-flex align-items-center gap-2"
                  data-testid="active-requester-display"
                >
                  <span>👤</span>
                  <span className="fw-semibold">{selectedRequester.displayName}</span>
                  <span className="badge bg-light text-success ms-1">Requester</span>
                </span>
                <button
                  type="button"
                  className="btn-zen-outline-light"
                  onClick={openSelector}
                  data-testid="change-requester-btn"
                >
                  Change Requester
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn-zen-outline-light"
                onClick={openSelector}
                data-testid="select-requester-btn"
              >
                Select Requester
              </button>
            )}
          </div>

          {/* Mobile User Pill & Dropdown (<768px) */}
          <div className="d-md-none position-relative" ref={menuRef}>
            {activeUser && (
              <>
                <button
                  type="button"
                  className="btn btn-sm text-white d-flex align-items-center gap-1 px-2 py-1"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.18)",
                    border: "1px solid rgba(255, 255, 255, 0.35)",
                    borderRadius: "20px",
                    fontSize: "0.85rem",
                  }}
                  onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                  aria-expanded={isProfileMenuOpen}
                  aria-label="User profile and navigation menu"
                >
                  <span>👤</span>
                  <span className="fw-semibold text-truncate" style={{ maxWidth: "120px" }}>
                    {activeUser.displayName.split(" ")[0]}
                  </span>
                  <span style={{ fontSize: "0.65rem", opacity: 0.85 }}>▼</span>
                </button>

                {isProfileMenuOpen && (
                  <div
                    className="zen-card p-3 shadow-lg position-absolute end-0 mt-2 text-dark"
                    style={{
                      width: "250px",
                      zIndex: 1060,
                      border: "1px solid #DDE5E1",
                      borderRadius: "12px",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <div
                        className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                        style={{
                          width: "36px",
                          height: "36px",
                          backgroundColor: "var(--color-pale-green)",
                          color: "var(--color-primary-green)",
                          fontSize: "1.1rem",
                        }}
                      >
                        👤
                      </div>
                      <div className="overflow-hidden">
                        <div className="fw-bold small text-truncate">{activeUser.displayName}</div>
                        <div className="text-muted text-truncate" style={{ fontSize: "0.72rem" }}>
                          {activeUser.email}
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <span
                        className={`badge ${getRoleBadgeClass(activeUser.role)}`}
                        style={{ fontSize: "0.75rem" }}
                      >
                        Role: {getRoleLabel(activeUser.role)}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success w-100 d-flex align-items-center justify-content-center gap-2 mb-2"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onNavigate?.("change-password");
                      }}
                      data-testid="mobile-change-password-btn"
                    >
                      <span>🔑</span>
                      <span>Change Password</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger w-100"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        handleLogout();
                      }}
                      data-testid="mobile-logout-btn"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (<768px) */}
      <nav className="zen-mobile-bottom-nav d-md-none" aria-label="Mobile Navigation">
        {(!activeUser || activeUser.role === "REQUESTER") && (
          <>
            <button
              type="button"
              className={`zen-mobile-nav-item ${activeView === "tickets" ? "active" : ""}`}
              onClick={() => onNavigate?.("tickets")}
              aria-current={activeView === "tickets" ? "page" : undefined}
            >
              <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>📋</span>
              <span>My Tickets</span>
            </button>

            <button
              type="button"
              className={`zen-mobile-nav-item ${activeView === "create-ticket" ? "active" : ""}`}
              onClick={() => onNavigate?.("create-ticket")}
              aria-current={activeView === "create-ticket" ? "page" : undefined}
            >
              <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>➕</span>
              <span>Create Ticket</span>
            </button>
          </>
        )}

        {activeUser?.role === "IT_STAFF" && (
          <>
            <button
              type="button"
              className={`zen-mobile-nav-item ${activeView === "queue" ? "active" : ""}`}
              onClick={() => onNavigate?.("queue")}
              aria-current={activeView === "queue" ? "page" : undefined}
            >
              <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>📥</span>
              <span>My Queue</span>
            </button>
            <button
              type="button"
              className={`zen-mobile-nav-item ${activeView === "create-ticket" ? "active" : ""}`}
              onClick={() => onNavigate?.("create-ticket")}
              aria-current={activeView === "create-ticket" ? "page" : undefined}
            >
              <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>➕</span>
              <span>Create Ticket</span>
            </button>
          </>
        )}

        {activeUser?.role === "ADMINISTRATOR" && (
          <>
            <button
              type="button"
              className={`zen-mobile-nav-item ${activeView === "admin" ? "active" : ""}`}
              onClick={() => onNavigate?.("admin")}
              aria-current={activeView === "admin" ? "page" : undefined}
            >
              <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>👥</span>
              <span>Admin</span>
            </button>
            <button
              type="button"
              className={`zen-mobile-nav-item ${activeView === "queue" ? "active" : ""}`}
              onClick={() => onNavigate?.("queue")}
              aria-current={activeView === "queue" ? "page" : undefined}
            >
              <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>📥</span>
              <span>My Queue</span>
            </button>
          </>
        )}
      </nav>
    </>
  );
}
