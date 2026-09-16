import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";

const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

export interface ChangePasswordProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ChangePassword({ onSuccess, onCancel }: ChangePasswordProps = {}) {
  const { changePassword, logout, user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password Policy Checks
  const isLengthValid = newPassword.length >= 8 && newPassword.length <= 128;
  const isCasesValid = /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword);
  const isSpecialValid = /\d/.test(newPassword) && SPECIAL_CHAR_REGEX.test(newPassword);
  const isMatchValid = confirmPassword.length > 0 && newPassword === confirmPassword;

  const isFormValid =
    Boolean(currentPassword.trim()) &&
    isLengthValid &&
    isCasesValid &&
    isSpecialValid &&
    isMatchValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) return;

    if (newPassword === currentPassword) {
      setGlobalError("New password cannot be identical to current password.");
      return;
    }

    setGlobalError(null);
    setIsSubmitting(true);

    try {
      await changePassword(currentPassword, newPassword, confirmPassword);
      onSuccess?.();
    } catch (err: any) {
      setGlobalError(err?.message || "Failed to update password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={onCancel ? "d-flex align-items-center justify-content-center px-3 py-4 w-100" : "min-vh-100 d-flex align-items-center justify-content-center px-3 py-5"}
      style={{ backgroundColor: onCancel ? "transparent" : "var(--color-page-bg, #f5f7f6)" }}
    >
      <div
        className="zen-card card border-0 p-4 p-sm-5 w-100 shadow-sm"
        style={{
          maxWidth: "480px",
          borderRadius: "12px",
          backgroundColor: "var(--color-surface, #ffffff)",
          border: "1px solid var(--color-border-subtle, #dde5e1)",
        }}
      >
        {/* Header */}
        <div className="text-center mb-4">
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
            style={{
              width: "48px",
              height: "48px",
              backgroundColor: "var(--color-pale-green, #eaf6ef)",
              color: "var(--color-primary-green, #006b3c)",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "1.75rem" }}>
              avg_pace
            </span>
          </div>
          <h3
            className="fw-bold mb-1"
            style={{ color: "var(--color-text-primary, #1a2e24)", letterSpacing: "-0.02em" }}
          >
            Change Your Password
          </h3>
          <p className="text-muted small mb-0">
            You must change your password to continue.
            {user?.email && (
              <span className="d-block text-truncate fw-semibold mt-1">
                Account: {user.email}
              </span>
            )}
          </p>
        </div>

        {/* Global Error Alert */}
        {globalError && (
          <div
            className="alert alert-danger alert-dismissible fade show py-2 px-3 mb-4 small"
            role="alert"
            data-testid="change-password-error-alert"
          >
            <div className="d-flex align-items-center gap-2">
              <span className="fw-semibold">{globalError}</span>
            </div>
            <button
              type="button"
              className="btn-close py-2 px-3"
              aria-label="Close"
              onClick={() => setGlobalError(null)}
            />
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Current Password */}
          <div className="mb-3">
            <label
              htmlFor="currentPassword"
              className="form-label fw-semibold small mb-1"
              style={{ color: "var(--color-text-primary, #1a2e24)" }}
            >
              Current (temporary) password <span style={{ color: "var(--color-error, #b3261e)" }}>*</span>
            </label>
            <div className="input-group">
              <input
                id="currentPassword"
                type={showCurrent ? "text" : "password"}
                name="currentPassword"
                className="form-control"
                placeholder="••••••••"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                data-testid="current-password-input"
                required
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowCurrent((prev) => !prev)}
                aria-label={showCurrent ? "Hide current password" : "Show current password"}
                data-testid="current-password-toggle-btn"
                style={{ borderColor: "#ced4da" }}
              >
                {showCurrent ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="mb-3">
            <label
              htmlFor="newPassword"
              className="form-label fw-semibold small mb-1"
              style={{ color: "var(--color-text-primary, #1a2e24)" }}
            >
              New password <span style={{ color: "var(--color-error, #b3261e)" }}>*</span>
            </label>
            <div className="input-group">
              <input
                id="newPassword"
                type={showNew ? "text" : "password"}
                name="newPassword"
                className="form-control"
                placeholder="••••••••"
                autoComplete="new-password"
                maxLength={128}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                data-testid="new-password-input"
                required
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowNew((prev) => !prev)}
                aria-label={showNew ? "Hide new password" : "Show new password"}
                data-testid="new-password-toggle-btn"
                style={{ borderColor: "#ced4da" }}
              >
                {showNew ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="mb-3">
            <label
              htmlFor="confirmPassword"
              className="form-label fw-semibold small mb-1"
              style={{ color: "var(--color-text-primary, #1a2e24)" }}
            >
              Confirm new password <span style={{ color: "var(--color-error, #b3261e)" }}>*</span>
            </label>
            <div className="input-group">
              <input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                className="form-control"
                placeholder="••••••••"
                autoComplete="new-password"
                maxLength={128}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                data-testid="confirm-password-input"
                required
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowConfirm((prev) => !prev)}
                aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                data-testid="confirm-password-toggle-btn"
                style={{ borderColor: "#ced4da" }}
              >
                {showConfirm ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Real-Time Password Policy Checklist */}
          <div
            className="p-3 mb-4 rounded-3"
            style={{
              backgroundColor: "var(--color-page-bg, #f5f7f6)",
              border: "1px solid var(--color-border-subtle, #dde5e1)",
            }}
          >
            <p className="fw-semibold small mb-2" style={{ color: "var(--color-text-primary, #1a2e24)" }}>
              Password Requirements:
            </p>
            <ul className="list-unstyled mb-0 small">
              <li
                className={`d-flex align-items-center gap-2 mb-1 ${
                  isLengthValid ? "text-success fw-medium" : "text-muted"
                }`}
                data-testid="rule-length"
              >
                <span>{isLengthValid ? "✓" : "○"}</span>
                <span>Be at least 8 characters (max 128)</span>
              </li>
              <li
                className={`d-flex align-items-center gap-2 mb-1 ${
                  isCasesValid ? "text-success fw-medium" : "text-muted"
                }`}
                data-testid="rule-cases"
              >
                <span>{isCasesValid ? "✓" : "○"}</span>
                <span>Include upper and lower case letters</span>
              </li>
              <li
                className={`d-flex align-items-center gap-2 mb-1 ${
                  isSpecialValid ? "text-success fw-medium" : "text-muted"
                }`}
                data-testid="rule-special"
              >
                <span>{isSpecialValid ? "✓" : "○"}</span>
                <span>Include a number and a special character</span>
              </li>
              <li
                className={`d-flex align-items-center gap-2 ${
                  isMatchValid ? "text-success fw-medium" : "text-muted"
                }`}
                data-testid="rule-match"
              >
                <span>{isMatchValid ? "✓" : "○"}</span>
                <span>Passwords match</span>
              </li>
            </ul>
          </div>

          {/* Submit and Optional Cancel Button */}
          <div className="d-flex gap-2">
            {onCancel && (
              <button
                type="button"
                className="btn btn-outline-secondary w-50 py-2 fw-semibold"
                onClick={onCancel}
                data-testid="change-password-cancel-btn"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className={`btn btn-zen-primary ${onCancel ? "w-50" : "w-100"} py-2 fw-semibold`}
              disabled={!isFormValid || isSubmitting}
              data-testid="change-password-submit-btn"
            >
              {isSubmitting ? (
                <span className="d-flex align-items-center justify-content-center gap-2">
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  <span>Updating Password...</span>
                </span>
              ) : (
                "Continue"
              )}
            </button>
          </div>
        </form>

        <div className="mt-4 pt-3 text-center border-top d-flex justify-content-between align-items-center">
          <span className="text-muted small">Not you?</span>
          <button
            type="button"
            className="btn btn-link btn-sm text-decoration-none p-0"
            style={{ color: "var(--color-primary-green, #006b3c)" }}
            onClick={() => logout()}
            data-testid="change-password-logout-btn"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
