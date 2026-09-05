import React, { useState, useEffect, useRef } from "react";
import { useRequester } from "../context/RequesterContext.js";

export interface NavbarProps {
  activeView?: "tickets" | "create-ticket";
  onNavigate?: (view: "tickets" | "create-ticket") => void;
}

export default function Navbar({ activeView = "tickets", onNavigate }: NavbarProps) {
  const { selectedRequester, openSelector } = useRequester();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    if (isProfileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileMenuOpen]);

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
              <span style={{ fontSize: "1.25rem" }}>🎫</span>
              <span>TokTickIT</span>
            </a>

            {/* Desktop Navigation Links (>=768px) */}
            <nav className="d-none d-md-flex gap-3">
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
            </nav>
          </div>

          {/* Desktop Requester Badge & Action (>=768px) */}
          <div className="d-none d-md-flex align-items-center gap-2">
            {selectedRequester ? (
              <>
                <span className="zen-user-badge" data-testid="active-requester-display">
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

          {/* Mobile Requester Pill & Dropdown (<768px) */}
          <div className="d-md-none position-relative" ref={menuRef}>
            {selectedRequester ? (
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
                  aria-label="Requester profile and navigation menu"
                >
                  <span>👤</span>
                  <span className="fw-semibold text-truncate" style={{ maxWidth: "120px" }}>
                    {selectedRequester.displayName.split(" ")[0]}
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
                    {/* User Info Header */}
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
                        <div className="fw-bold small text-truncate">{selectedRequester.displayName}</div>
                        <div className="text-muted text-truncate" style={{ fontSize: "0.72rem" }}>
                          {selectedRequester.email}
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <span className="badge bg-light text-success border" style={{ fontSize: "0.75rem" }}>
                        Role: {selectedRequester.role}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm btn-zen-secondary w-100"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        openSelector();
                      }}
                    >
                      Change Requester
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                type="button"
                className="btn-zen-outline-light btn-sm"
                onClick={openSelector}
              >
                Select
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Idea 1: App-Style Dock <768px) */}
      <nav className="zen-mobile-bottom-nav d-md-none" aria-label="Mobile Navigation">
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
      </nav>
    </>
  );
}
