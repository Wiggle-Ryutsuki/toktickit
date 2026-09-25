import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useAuth } from "../context/AuthContext.js";
export default function Login() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [globalError, setGlobalError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        const errors = {};
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            errors.email = "Email address is required.";
        }
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
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
        }
        catch (err) {
            const message = err?.message || "Invalid email or password. Please try again.";
            setGlobalError(message);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsx("div", { className: "min-vh-100 d-flex align-items-center justify-content-center px-3 py-5", style: { backgroundColor: "var(--color-page-bg, #f5f7f6)" }, children: _jsxs("div", { className: "zen-card card border-0 p-4 p-sm-5 w-100 shadow-sm", style: {
                maxWidth: "440px",
                borderRadius: "12px",
                backgroundColor: "var(--color-surface, #ffffff)",
                border: "1px solid var(--color-border-subtle, #dde5e1)",
            }, children: [_jsxs("div", { className: "text-center mb-4", children: [_jsx("div", { className: "d-inline-flex align-items-center justify-content-center rounded-circle mb-3", style: {
                                width: "48px",
                                height: "48px",
                                backgroundColor: "var(--color-pale-green, #eaf6ef)",
                                color: "var(--color-primary-green, #006b3c)",
                            }, children: _jsx("span", { className: "material-symbols-outlined", style: { fontSize: "1.75rem" }, children: "avg_pace" }) }), _jsx("h3", { className: "fw-bold mb-1", style: { color: "var(--color-text-primary, #1a2e24)", letterSpacing: "-0.02em" }, children: "TokTickIT" }), _jsx("p", { className: "text-muted small mb-0", children: "Sign in to your account" })] }), globalError && (_jsxs("div", { className: "alert alert-danger alert-dismissible fade show py-2 px-3 mb-4 small", role: "alert", "data-testid": "login-error-alert", children: [_jsx("div", { className: "d-flex align-items-center gap-2", children: _jsx("span", { className: "fw-semibold", children: globalError }) }), _jsx("button", { type: "button", className: "btn-close py-2 px-3", "aria-label": "Close", onClick: () => setGlobalError(null) })] })), _jsxs("form", { onSubmit: handleSubmit, noValidate: true, children: [_jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "email", className: "form-label fw-semibold small mb-1", style: { color: "var(--color-text-primary, #1a2e24)" }, children: ["Email address ", _jsx("span", { style: { color: "var(--color-error, #b3261e)" }, children: "*" })] }), _jsx("input", { id: "email", type: "email", name: "email", className: `form-control ${fieldErrors.email ? "is-invalid" : ""}`, placeholder: "user@kmutt.ac.th", autoComplete: "email", value: email, onChange: (e) => {
                                        setEmail(e.target.value);
                                        if (fieldErrors.email) {
                                            setFieldErrors((prev) => ({ ...prev, email: undefined }));
                                        }
                                    }, "data-testid": "email-input" }), fieldErrors.email && (_jsx("div", { className: "invalid-feedback d-block small", "data-testid": "email-error", children: fieldErrors.email }))] }), _jsxs("div", { className: "mb-4", children: [_jsxs("label", { htmlFor: "password", className: "form-label fw-semibold small mb-1", style: { color: "var(--color-text-primary, #1a2e24)" }, children: ["Password ", _jsx("span", { style: { color: "var(--color-error, #b3261e)" }, children: "*" })] }), _jsxs("div", { className: "input-group", children: [_jsx("input", { id: "password", type: showPassword ? "text" : "password", name: "password", className: `form-control ${fieldErrors.password ? "is-invalid" : ""}`, placeholder: "Enter password", autoComplete: "current-password", value: password, onChange: (e) => {
                                                setPassword(e.target.value);
                                                if (fieldErrors.password) {
                                                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                                                }
                                            }, "data-testid": "password-input" }), _jsx("button", { type: "button", className: "btn btn-outline-secondary", onClick: () => setShowPassword((prev) => !prev), "aria-label": showPassword ? "Hide password" : "Show password", "data-testid": "password-toggle-btn", style: { borderColor: "#ced4da" }, children: showPassword ? "Hide" : "Show" })] }), fieldErrors.password && (_jsx("div", { className: "invalid-feedback d-block small", "data-testid": "password-error", children: fieldErrors.password }))] }), _jsx("button", { type: "submit", className: "btn btn-zen-primary w-100 py-2 fw-semibold", disabled: isSubmitting, "data-testid": "login-submit-btn", children: isSubmitting ? (_jsxs("span", { className: "d-flex align-items-center justify-content-center gap-2", children: [_jsx("span", { className: "spinner-border spinner-border-sm", role: "status", "aria-hidden": "true" }), _jsx("span", { children: "Signing In..." })] })) : ("Sign In") })] }), _jsx("div", { className: "mt-4 pt-3 text-center border-top", children: _jsx("p", { className: "text-muted small mb-0", style: { fontSize: "0.8rem" }, children: "TokTickIT Support \u00B7 KMUTT IT Helpdesk" }) })] }) }));
}
