import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useRequester } from "../context/RequesterContext.js";
export default function RequesterSelector() {
    const { selectedRequester, setSelectedRequester, requesters, isLoading, error, reloadRequesters, closeSelector, } = useRequester();
    const [selectedId, setSelectedId] = useState(selectedRequester ? String(selectedRequester.id) : "");
    useEffect(() => {
        if (selectedRequester) {
            setSelectedId(String(selectedRequester.id));
        }
    }, [selectedRequester]);
    const handleContinue = (e) => {
        e.preventDefault();
        const chosen = requesters.find((r) => r.id === Number(selectedId));
        if (chosen) {
            setSelectedRequester(chosen);
            closeSelector();
        }
    };
    return (_jsx("div", { className: "modal-backdrop-custom d-flex justify-content-center align-items-center", style: {
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(26, 46, 36, 0.5)",
            zIndex: 1050,
            padding: "1rem",
        }, role: "dialog", "aria-modal": "true", "aria-labelledby": "requester-modal-title", children: _jsxs("div", { className: "zen-card p-4 w-100", style: { maxWidth: 540 }, children: [_jsxs("div", { className: "text-center mb-3", children: [_jsx("div", { style: {
                                width: 56,
                                height: 56,
                                borderRadius: "50%",
                                backgroundColor: "var(--color-pale-green)",
                                color: "var(--color-secondary-green)",
                                fontSize: "1.75rem",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }, children: "\uD83D\uDC65" }), _jsx("h2", { id: "requester-modal-title", className: "h4 mt-3 mb-1 fw-bold", children: "Select Development Requester" }), _jsx("p", { className: "text-muted small mb-0", children: "Choose a development requester to simulate the current requester context for Lab 2. This is for testing only and is not a login screen." })] }), _jsxs("div", { className: "zen-banner-test mb-3 d-flex gap-2 align-items-start", children: [_jsx("span", { style: { fontSize: "1.2rem" }, children: "\uD83D\uDEE1\uFE0F" }), _jsxs("div", { children: [_jsx("div", { className: "fw-semibold small", children: "Authentication coming in Lab 3" }), _jsx("div", { className: "small text-muted", children: "In Lab 3, this selection will be replaced with secure authentication so you can access the system with your own account." })] })] }), isLoading && (_jsxs("div", { className: "text-center py-4", "data-testid": "requester-loading", children: [_jsx("div", { className: "spinner-border text-success", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Loading\u2026" }) }), _jsx("p", { className: "mt-2 text-muted small", children: "Loading development requesters\u2026" })] })), !isLoading && error && (_jsxs("div", { className: "alert alert-danger", role: "alert", "data-testid": "requester-error", children: [_jsx("h6", { className: "alert-heading fw-bold mb-1", children: "Server Connection Error" }), _jsx("p", { className: "small mb-2", children: error }), _jsx("button", { type: "button", className: "btn btn-sm btn-outline-danger", onClick: reloadRequesters, children: "Retry" })] })), !isLoading && !error && requesters.length === 0 && (_jsxs("div", { className: "alert alert-warning", role: "alert", "data-testid": "requester-empty", children: [_jsx("h6", { className: "alert-heading fw-bold mb-1", children: "No Active Requesters Found" }), _jsx("p", { className: "small mb-2", children: "No active development requesters were found in the database. Please run the database seed script (`npm run prisma:seed`)." }), _jsx("button", { type: "button", className: "btn btn-sm btn-outline-warning text-dark", onClick: reloadRequesters, children: "Refresh" })] })), !isLoading && !error && requesters.length > 0 && (_jsxs("form", { onSubmit: handleContinue, children: [_jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "requester-select", className: "form-label fw-semibold mb-1", children: ["Development Requester ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("select", { id: "requester-select", className: "form-select", value: selectedId, onChange: (e) => setSelectedId(e.target.value), required: true, "data-testid": "requester-select", children: [_jsx("option", { value: "", children: "-- Choose a Requester --" }), requesters.map((r) => (_jsxs("option", { value: r.id, children: [r.displayName, " (", r.email, ")"] }, r.id)))] }), _jsx("div", { className: "form-text mt-1 text-muted small", children: "\u2139\uFE0F Only active development requesters are shown." })] }), _jsxs("div", { className: "d-flex justify-content-end gap-2 mt-4 pt-2 border-top", children: [selectedRequester && (_jsx("button", { type: "button", className: "btn btn-outline-secondary", onClick: closeSelector, "data-testid": "requester-cancel-btn", children: "Cancel" })), _jsxs("button", { type: "submit", className: "btn btn-zen-primary d-flex align-items-center gap-1", disabled: !selectedId, "data-testid": "requester-continue-btn", children: [_jsx("span", { children: "Continue" }), _jsx("span", { children: "\u2192" })] })] })] }))] }) }));
}
