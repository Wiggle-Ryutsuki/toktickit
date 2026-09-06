import React, { useState, useEffect, useRef } from "react";

export interface SoftRemovalModalProps {
  isOpen: boolean;
  filename: string;
  attachmentId: number;
  onConfirm: (reason: string) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function SoftRemovalModal({
  isOpen,
  filename,
  onConfirm,
  onCancel,
  isSubmitting = false,
}: SoftRemovalModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setError(null);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onCancel();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onCancel]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Removal reason is required (minimum 3 characters).");
      return;
    }
    if (trimmed.length < 3) {
      setError("Removal reason must be at least 3 characters.");
      return;
    }
    if (trimmed.length > 255) {
      setError("Removal reason cannot exceed 255 characters.");
      return;
    }
    setError(null);
    onConfirm(trimmed);
  };

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="soft-removal-modal-title"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1050 }}
    >
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content border-0 shadow">
          <div className="modal-header border-bottom-0 pb-0">
            <h5 className="modal-title fw-semibold text-danger" id="soft-removal-modal-title">
              Confirm Attachment Removal
            </h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onCancel}
              disabled={isSubmitting}
            />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body py-3">
              <p className="mb-2 text-muted">
                Are you sure you want to remove <strong className="text-dark">{filename}</strong>?
              </p>
              <p className="small text-muted mb-3">
                This action cannot be undone. Download links for this file will be permanently blocked,
                and an audit record with your removal reason will remain visible on the ticket.
              </p>

              <div className="mb-2">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label htmlFor="removal-reason" className="form-label small fw-semibold mb-0">
                    Removal Reason <span className="text-danger">*</span>
                  </label>
                  <span className="small text-muted">{reason.trim().length} / 255</span>
                </div>
                <textarea
                  id="removal-reason"
                  ref={textareaRef}
                  className={`form-control ${error ? "is-invalid" : ""}`}
                  rows={3}
                  maxLength={255}
                  placeholder="Enter reason for removal (e.g., Uploaded duplicate file by accident)"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={isSubmitting}
                />
                {error && (
                  <div className="invalid-feedback d-block mt-1 small" role="alert">
                    {error}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer border-top-0 pt-0">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-danger d-inline-flex align-items-center"
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  />
                )}
                Confirm Removal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
