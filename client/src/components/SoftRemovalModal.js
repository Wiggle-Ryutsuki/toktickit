import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
export default function SoftRemovalModal({ isOpen, filename, onConfirm, onCancel, isSubmitting = false, }) {
    const [reason, setReason] = useState("");
    const [error, setError] = useState(null);
    const textareaRef = useRef(null);
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
        function handleKeyDown(e) {
            if (e.key === "Escape" && isOpen && !isSubmitting) {
                onCancel();
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, isSubmitting, onCancel]);
    if (!isOpen)
        return null;
    const handleSubmit = (e) => {
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
    return (_jsx("div", { className: "modal show d-block", tabIndex: -1, role: "dialog", "aria-modal": "true", "aria-labelledby": "soft-removal-modal-title", style: { backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1050 }, children: _jsx("div", { className: "modal-dialog modal-dialog-centered", role: "document", children: _jsxs("div", { className: "modal-content border-0 shadow", children: [_jsxs("div", { className: "modal-header border-bottom-0 pb-0", children: [_jsx("h5", { className: "modal-title fw-semibold text-danger", id: "soft-removal-modal-title", children: "Confirm Attachment Removal" }), _jsx("button", { type: "button", className: "btn-close", "aria-label": "Close", onClick: onCancel, disabled: isSubmitting })] }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "modal-body py-3", children: [_jsxs("p", { className: "mb-2 text-muted", children: ["Are you sure you want to remove ", _jsx("strong", { className: "text-dark", children: filename }), "?"] }), _jsx("p", { className: "small text-muted mb-3", children: "This action cannot be undone. Download links for this file will be permanently blocked, and an audit record with your removal reason will remain visible on the ticket." }), _jsxs("div", { className: "mb-2", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-1", children: [_jsxs("label", { htmlFor: "removal-reason", className: "form-label small fw-semibold mb-0", children: ["Removal Reason ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("span", { className: "small text-muted", children: [reason.trim().length, " / 255"] })] }), _jsx("textarea", { id: "removal-reason", ref: textareaRef, className: `form-control ${error ? "is-invalid" : ""}`, rows: 3, maxLength: 255, placeholder: "Enter reason for removal (e.g., Uploaded duplicate file by accident)", value: reason, onChange: (e) => {
                                                    setReason(e.target.value);
                                                    if (error)
                                                        setError(null);
                                                }, disabled: isSubmitting }), error && (_jsx("div", { className: "invalid-feedback d-block mt-1 small", role: "alert", children: error }))] })] }), _jsxs("div", { className: "modal-footer border-top-0 pt-0", children: [_jsx("button", { type: "button", className: "btn btn-outline-secondary", onClick: onCancel, disabled: isSubmitting, children: "Cancel" }), _jsxs("button", { type: "submit", className: "btn btn-danger d-inline-flex align-items-center", disabled: isSubmitting, children: [isSubmitting && (_jsx("span", { className: "spinner-border spinner-border-sm me-2", role: "status", "aria-hidden": "true" })), "Confirm Removal"] })] })] })] }) }) }));
}
