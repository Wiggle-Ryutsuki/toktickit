import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useAuth } from "../context/AuthContext.js";
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
export default function ChangePassword({ onSuccess, onCancel } = {}) {
    const { changePassword, logout, user } = useAuth();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [globalError, setGlobalError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Password Policy Checks
    const isLengthValid = newPassword.length >= 8 && newPassword.length <= 128;
    const isCasesValid = /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword);
    const isSpecialValid = /\d/.test(newPassword) && SPECIAL_CHAR_REGEX.test(newPassword);
    const isMatchValid = confirmPassword.length > 0 && newPassword === confirmPassword;
    const isFormValid = Boolean(currentPassword.trim()) &&
        isLengthValid &&
        isCasesValid &&
        isSpecialValid &&
        isMatchValid;
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isFormValid)
            return;
        if (newPassword === currentPassword) {
            setGlobalError("New password cannot be identical to current password.");
            return;
        }
        setGlobalError(null);
        setIsSubmitting(true);
        try {
            await changePassword(currentPassword, newPassword, confirmPassword);
            onSuccess?.();
        }
        catch (err) {
            setGlobalError(err?.message || "Failed to update password. Please try again.");
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsx("div", { className: onCancel ? "d-flex align-items-center justify-content-center px-3 py-4 w-100" : "min-vh-100 d-flex align-items-center justify-content-center px-3 py-5", style: { backgroundColor: onCancel ? "transparent" : "var(--color-page-bg, #f5f7f6)" }, children: _jsxs("div", { className: "zen-card card border-0 p-4 p-sm-5 w-100 shadow-sm", style: {
                maxWidth: "480px",
                borderRadius: "12px",
                backgroundColor: "var(--color-surface, #ffffff)",
                border: "1px solid var(--color-border-subtle, #dde5e1)",
            }, children: [_jsxs("div", { className: "text-center mb-4", children: [_jsx("div", { className: "d-inline-flex align-items-center justify-content-center rounded-circle mb-3", style: {
                                width: "48px",
                                height: "48px",
                                backgroundColor: "var(--color-pale-green, #eaf6ef)",
                                color: "var(--color-primary-green, #006b3c)",
                            }, children: _jsx("span", { className: "material-symbols-outlined", style: { fontSize: "1.75rem" }, children: "avg_pace" }) }), _jsx("h3", { className: "fw-bold mb-1", style: { color: "var(--color-text-primary, #1a2e24)", letterSpacing: "-0.02em" }, children: "Change Your Password" }), _jsxs("p", { className: "text-muted small mb-0", children: ["You must change your password to continue.", user?.email && (_jsxs("span", { className: "d-block text-truncate fw-semibold mt-1", children: ["Account: ", user.email] }))] })] }), globalError && (_jsxs("div", { className: "alert alert-danger alert-dismissible fade show py-2 px-3 mb-4 small", role: "alert", "data-testid": "change-password-error-alert", children: [_jsx("div", { className: "d-flex align-items-center gap-2", children: _jsx("span", { className: "fw-semibold", children: globalError }) }), _jsx("button", { type: "button", className: "btn-close py-2 px-3", "aria-label": "Close", onClick: () => setGlobalError(null) })] })), _jsxs("form", { onSubmit: handleSubmit, noValidate: true, children: [_jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "currentPassword", className: "form-label fw-semibold small mb-1", style: { color: "var(--color-text-primary, #1a2e24)" }, children: ["Current (temporary) password ", _jsx("span", { style: { color: "var(--color-error, #b3261e)" }, children: "*" })] }), _jsxs("div", { className: "input-group", children: [_jsx("input", { id: "currentPassword", type: showCurrent ? "text" : "password", name: "currentPassword", className: "form-control", placeholder: "Enter current password", autoComplete: "current-password", value: currentPassword, onChange: (e) => setCurrentPassword(e.target.value), "data-testid": "current-password-input", required: true }), _jsx("button", { type: "button", className: "btn btn-outline-secondary", onClick: () => setShowCurrent((prev) => !prev), "aria-label": showCurrent ? "Hide current password" : "Show current password", "data-testid": "current-password-toggle-btn", style: { borderColor: "#ced4da" }, children: showCurrent ? "Hide" : "Show" })] })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "newPassword", className: "form-label fw-semibold small mb-1", style: { color: "var(--color-text-primary, #1a2e24)" }, children: ["New password ", _jsx("span", { style: { color: "var(--color-error, #b3261e)" }, children: "*" })] }), _jsxs("div", { className: "input-group", children: [_jsx("input", { id: "newPassword", type: showNew ? "text" : "password", name: "newPassword", className: "form-control", placeholder: "Enter new password", autoComplete: "new-password", maxLength: 128, value: newPassword, onChange: (e) => setNewPassword(e.target.value), "data-testid": "new-password-input", required: true }), _jsx("button", { type: "button", className: "btn btn-outline-secondary", onClick: () => setShowNew((prev) => !prev), "aria-label": showNew ? "Hide new password" : "Show new password", "data-testid": "new-password-toggle-btn", style: { borderColor: "#ced4da" }, children: showNew ? "Hide" : "Show" })] })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "confirmPassword", className: "form-label fw-semibold small mb-1", style: { color: "var(--color-text-primary, #1a2e24)" }, children: ["Confirm new password ", _jsx("span", { style: { color: "var(--color-error, #b3261e)" }, children: "*" })] }), _jsxs("div", { className: "input-group", children: [_jsx("input", { id: "confirmPassword", type: showConfirm ? "text" : "password", name: "confirmPassword", className: "form-control", placeholder: "Confirm new password", autoComplete: "new-password", maxLength: 128, value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), "data-testid": "confirm-password-input", required: true }), _jsx("button", { type: "button", className: "btn btn-outline-secondary", onClick: () => setShowConfirm((prev) => !prev), "aria-label": showConfirm ? "Hide confirm password" : "Show confirm password", "data-testid": "confirm-password-toggle-btn", style: { borderColor: "#ced4da" }, children: showConfirm ? "Hide" : "Show" })] })] }), _jsxs("div", { className: "p-3 mb-4 rounded-3", style: {
                                backgroundColor: "var(--color-page-bg, #f5f7f6)",
                                border: "1px solid var(--color-border-subtle, #dde5e1)",
                            }, children: [_jsx("p", { className: "fw-semibold small mb-2", style: { color: "var(--color-text-primary, #1a2e24)" }, children: "Password Requirements:" }), _jsxs("ul", { className: "list-unstyled mb-0 small", children: [_jsxs("li", { className: `d-flex align-items-center gap-2 mb-1 ${isLengthValid ? "text-success fw-medium" : "text-muted"}`, "data-testid": "rule-length", children: [_jsx("span", { children: isLengthValid ? "✓" : "○" }), _jsx("span", { children: "Be at least 8 characters (max 128)" })] }), _jsxs("li", { className: `d-flex align-items-center gap-2 mb-1 ${isCasesValid ? "text-success fw-medium" : "text-muted"}`, "data-testid": "rule-cases", children: [_jsx("span", { children: isCasesValid ? "✓" : "○" }), _jsx("span", { children: "Include upper and lower case letters" })] }), _jsxs("li", { className: `d-flex align-items-center gap-2 mb-1 ${isSpecialValid ? "text-success fw-medium" : "text-muted"}`, "data-testid": "rule-special", children: [_jsx("span", { children: isSpecialValid ? "✓" : "○" }), _jsx("span", { children: "Include a number and a special character" })] }), _jsxs("li", { className: `d-flex align-items-center gap-2 ${isMatchValid ? "text-success fw-medium" : "text-muted"}`, "data-testid": "rule-match", children: [_jsx("span", { children: isMatchValid ? "✓" : "○" }), _jsx("span", { children: "Passwords match" })] })] })] }), _jsxs("div", { className: "d-flex gap-2", children: [onCancel && (_jsx("button", { type: "button", className: "btn btn-outline-secondary w-50 py-2 fw-semibold", onClick: onCancel, "data-testid": "change-password-cancel-btn", children: "Cancel" })), _jsx("button", { type: "submit", className: `btn btn-zen-primary ${onCancel ? "w-50" : "w-100"} py-2 fw-semibold`, disabled: !isFormValid || isSubmitting, "data-testid": "change-password-submit-btn", children: isSubmitting ? (_jsxs("span", { className: "d-flex align-items-center justify-content-center gap-2", children: [_jsx("span", { className: "spinner-border spinner-border-sm", role: "status", "aria-hidden": "true" }), _jsx("span", { children: "Updating Password..." })] })) : ("Continue") })] })] }), _jsxs("div", { className: "mt-4 pt-3 text-center border-top d-flex justify-content-between align-items-center", children: [_jsx("span", { className: "text-muted small", children: "Not you?" }), _jsx("button", { type: "button", className: "btn btn-link btn-sm text-decoration-none p-0", style: { color: "var(--color-primary-green, #006b3c)" }, onClick: () => logout(), "data-testid": "change-password-logout-btn", children: "Sign out" })] })] }) }));
}
