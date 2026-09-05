import React, { useState, useEffect } from "react";
import { useRequester } from "../context/RequesterContext.js";

export default function RequesterSelector() {
  const {
    selectedRequester,
    setSelectedRequester,
    requesters,
    isLoading,
    error,
    reloadRequesters,
    closeSelector,
  } = useRequester();

  const [selectedId, setSelectedId] = useState<string>(
    selectedRequester ? String(selectedRequester.id) : ""
  );

  useEffect(() => {
    if (selectedRequester) {
      setSelectedId(String(selectedRequester.id));
    }
  }, [selectedRequester]);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    const chosen = requesters.find((r) => r.id === Number(selectedId));
    if (chosen) {
      setSelectedRequester(chosen);
      closeSelector();
    }
  };

  return (
    <div
      className="modal-backdrop-custom d-flex justify-content-center align-items-center"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(26, 46, 36, 0.5)",
        zIndex: 1050,
        padding: "1rem",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="requester-modal-title"
    >
      <div
        className="zen-card p-4 w-100"
        style={{ maxWidth: 540 }}
      >
        <div className="text-center mb-3">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              backgroundColor: "var(--color-pale-green)",
              color: "var(--color-secondary-green)",
              fontSize: "1.75rem",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            👥
          </div>
          <h2 id="requester-modal-title" className="h4 mt-3 mb-1 fw-bold">
            Select Development Requester
          </h2>
          <p className="text-muted small mb-0">
            Choose a development requester to simulate the current requester context for Lab 2.
            This is for testing only and is not a login screen.
          </p>
        </div>

        {/* Informational Banner */}
        <div className="zen-banner-test mb-3 d-flex gap-2 align-items-start">
          <span style={{ fontSize: "1.2rem" }}>🛡️</span>
          <div>
            <div className="fw-semibold small">Authentication coming in Lab 3</div>
            <div className="small text-muted">
              In Lab 3, this selection will be replaced with secure authentication so you can access the system with your own account.
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-4" data-testid="requester-loading">
            <div className="spinner-border text-success" role="status">
              <span className="visually-hidden">Loading…</span>
            </div>
            <p className="mt-2 text-muted small">Loading development requesters…</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="alert alert-danger" role="alert" data-testid="requester-error">
            <h6 className="alert-heading fw-bold mb-1">Server Connection Error</h6>
            <p className="small mb-2">{error}</p>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={reloadRequesters}
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && requesters.length === 0 && (
          <div className="alert alert-warning" role="alert" data-testid="requester-empty">
            <h6 className="alert-heading fw-bold mb-1">No Active Requesters Found</h6>
            <p className="small mb-2">
              No active development requesters were found in the database. Please run the database seed script (`npm run prisma:seed`).
            </p>
            <button
              type="button"
              className="btn btn-sm btn-outline-warning text-dark"
              onClick={reloadRequesters}
            >
              Refresh
            </button>
          </div>
        )}

        {/* Selection Form */}
        {!isLoading && !error && requesters.length > 0 && (
          <form onSubmit={handleContinue}>
            <div className="mb-3">
              <label htmlFor="requester-select" className="form-label fw-semibold mb-1">
                Development Requester <span className="text-danger">*</span>
              </label>
              <select
                id="requester-select"
                className="form-select"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                required
                data-testid="requester-select"
              >
                <option value="">-- Choose a Requester --</option>
                {requesters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.displayName} ({r.email})
                  </option>
                ))}
              </select>
              <div className="form-text mt-1 text-muted small">
                ℹ️ Only active development requesters are shown.
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4 pt-2 border-top">
              {selectedRequester && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={closeSelector}
                  data-testid="requester-cancel-btn"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="btn btn-zen-primary d-flex align-items-center gap-1"
                disabled={!selectedId}
                data-testid="requester-continue-btn"
              >
                <span>Continue</span>
                <span>&rarr;</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
