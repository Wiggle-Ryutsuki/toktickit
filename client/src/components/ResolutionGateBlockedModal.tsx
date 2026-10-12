import React from "react";

export interface ResolutionGateBlockedModalProps {
  isOpen: boolean;
  message?: string;
  fieldErrorMsg?: string;
  onReviewActions: () => void;
  onDismiss: () => void;
}

export default function ResolutionGateBlockedModal({
  isOpen,
  message,
  fieldErrorMsg,
  onReviewActions,
  onDismiss,
}: ResolutionGateBlockedModalProps): React.ReactElement | null {
  if (!isOpen) return null;

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="resolution-gate-title"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.55)", zIndex: 1060 }}
      data-testid="resolution-gate-modal"
    >
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "520px" }}>
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: "12px", overflow: "hidden" }}>
          {/* High-Contrast Warning Header */}
          <div
            className="modal-header text-white px-4 py-3 border-0"
            style={{ backgroundColor: "#B22222" /* High-contrast crimson alert */ }}
          >
            <div className="d-flex align-items-center gap-2">
              <span className="fs-4" aria-hidden="true">⚠️</span>
              <h5 className="modal-title fw-bold mb-0 text-white" id="resolution-gate-title">
                Action Required: Incomplete Actions Taken
              </h5>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              aria-label="Close"
              onClick={onDismiss}
              data-testid="resolution-gate-close-btn"
            ></button>
          </div>

          {/* Modal Body */}
          <div className="modal-body p-4 bg-white text-dark">
            <p className="mb-3" style={{ fontSize: "0.95rem", lineHeight: 1.6 }}>
              {message ||
                "This ticket cannot be resolved or closed because open action(s) taken remain in Planned or In Progress status."}
            </p>

            {fieldErrorMsg && (
              <div
                className="alert alert-warning py-2 px-3 small border mb-3 fw-semibold text-dark"
                style={{ backgroundColor: "#FFF8E7", borderColor: "#FFE082" }}
                data-testid="resolution-gate-action-count"
              >
                📋 {fieldErrorMsg}
              </div>
            )}

            <p className="text-muted small mb-0">
              Please mark all actions taken as <strong>Completed</strong> or <strong>Cancelled</strong> before resolving or closing this ticket.
            </p>
          </div>

          {/* Modal Footer with Clear Actions */}
          <div className="modal-footer bg-light px-4 py-3 border-top d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm px-3"
              onClick={onDismiss}
              data-testid="resolution-gate-dismiss-btn"
            >
              [Dismiss]
            </button>
            <button
              type="button"
              className="btn btn-zen-primary btn-sm px-3 fw-semibold"
              onClick={onReviewActions}
              data-testid="resolution-gate-review-btn"
            >
              [Review Actions Taken]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
