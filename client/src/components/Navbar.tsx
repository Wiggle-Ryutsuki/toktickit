import React from "react";
import { useRequester } from "../context/RequesterContext.js";

export interface NavbarProps {
  activeView?: "tickets" | "create-ticket";
  onNavigate?: (view: "tickets" | "create-ticket") => void;
}

export default function Navbar({ activeView = "tickets", onNavigate }: NavbarProps) {
  const { selectedRequester, openSelector } = useRequester();

  return (
    <header className="zen-header navbar navbar-expand-lg">
      <div className="container-fluid d-flex justify-content-between align-items-center">
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
          <nav className="d-flex gap-3">
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

        <div className="d-flex align-items-center gap-2">
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
      </div>
    </header>
  );
}
