import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";

export default function Login() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = "Please enter a valid email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setGlobalError(null);
    setIsSubmitting(true);

    try {
      await login(trimmedEmail, password);
    } catch (err: any) {
      const message =
        err?.message || "Invalid email or password. Please try again.";
      setGlobalError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center px-3 py-5"
      style={{ backgroundColor: "var(--color-page-bg, #f5f7f6)" }}
    >
      <div
        className="zen-card card border-0 p-4 p-sm-5 w-100 shadow-sm"
        style={{
          maxWidth: "440px",
          borderRadius: "12px",
          backgroundColor: "var(--color-surface, #ffffff)",
          border: "1px solid var(--color-border-subtle, #dde5e1)",
        }}
      >
        {/* Brand Header */}
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
            TokTickIT
          </h3>
          <p className="text-muted small mb-0">Sign in to your account</p>
        </div>

        {/* Global Error Alert */}
        {globalError && (
          <div
            className="alert alert-danger alert-dismissible fade show py-2 px-3 mb-4 small"
            role="alert"
            data-testid="login-error-alert"
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

        {/* Login Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label
              htmlFor="email"
              className="form-label fw-semibold small mb-1"
              style={{ color: "var(--color-text-primary, #1a2e24)" }}
            >
              Email address <span style={{ color: "var(--color-error, #b3261e)" }}>*</span>
            </label>
            <input
              id="email"
              type="email"
              name="email"
              className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`}
              placeholder="user@kmutt.ac.th"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
              data-testid="email-input"
            />
            {fieldErrors.email && (
              <div className="invalid-feedback d-block small" data-testid="email-error">
                {fieldErrors.email}
              </div>
            )}
          </div>

          <div className="mb-4">
            <label
              htmlFor="password"
              className="form-label fw-semibold small mb-1"
              style={{ color: "var(--color-text-primary, #1a2e24)" }}
            >
              Password <span style={{ color: "var(--color-error, #b3261e)" }}>*</span>
            </label>
            <div className="input-group">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                className={`form-control ${fieldErrors.password ? "is-invalid" : ""}`}
                placeholder="Enter password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                data-testid="password-input"
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                data-testid="password-toggle-btn"
                style={{ borderColor: "#ced4da" }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {fieldErrors.password && (
              <div className="invalid-feedback d-block small" data-testid="password-error">
                {fieldErrors.password}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-zen-primary w-100 py-2 fw-semibold"
            disabled={isSubmitting}
            data-testid="login-submit-btn"
          >
            {isSubmitting ? (
              <span className="d-flex align-items-center justify-content-center gap-2">
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                <span>Signing In...</span>
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-4 pt-3 text-center border-top">
          <p className="text-muted small mb-0" style={{ fontSize: "0.8rem" }}>
            TokTickIT Support &middot; KMUTT IT Helpdesk
          </p>
        </div>
      </div>
    </div>
  );
}
