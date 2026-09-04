import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { checkSystem } from "./api.js";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import Navbar from "./components/Navbar.js";
import RequesterSelector from "./components/RequesterSelector.js";
import "./theme.css";
function AppContent() {
    const { selectedRequester, isSelectorOpen } = useRequester();
    const [state, setState] = useState("idle");
    const [categories, setCategories] = useState([]);
    const [error, setError] = useState(null);
    async function handleCheck() {
        // TODO(Issue 4): set loading, call checkSystem(), then either
        //   - success: store categories and show Online + the list, or
        //   - error: show Offline + a useful message.
        setState("loading");
        setError(null);
        try {
            const res = await checkSystem();
            setCategories(res.categories);
            setState("success");
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Backend service is unavailable");
            setState("error");
        }
    }
    return (_jsxs("div", { className: "min-vh-100 d-flex flex-column", style: { backgroundColor: "var(--color-page-bg)" }, children: [_jsx(Navbar, {}), (!selectedRequester || isSelectorOpen) && _jsx(RequesterSelector, {}), _jsxs("main", { className: "container py-4 flex-grow-1", style: { maxWidth: 800 }, children: [selectedRequester && (_jsxs("div", { className: "alert alert-success d-flex align-items-center justify-content-between py-2 px-3 mb-4", role: "status", children: [_jsxs("div", { children: [_jsx("span", { className: "fw-semibold", children: "Active Requester Context:" }), " ", selectedRequester.displayName, " (", selectedRequester.email, ")"] }), _jsxs("span", { className: "badge bg-success", children: ["Role: ", selectedRequester.role] })] })), _jsxs("div", { className: "zen-card p-4 mb-4", children: [_jsx("h2", { className: "h4 mb-3 fw-bold", style: { color: "var(--color-primary-green)" }, children: "System Status Check" }), _jsx("p", { className: "text-muted small mb-3", children: "Verify backend database and API connectivity from Lab 1 baseline." }), _jsx("button", { className: "btn btn-zen-primary", onClick: handleCheck, disabled: state === "loading", children: state === "loading" ? "Loading…" : "Check System" }), state === "error" && (_jsxs("div", { className: "alert alert-danger mt-4", role: "alert", children: [_jsx("h5", { className: "alert-heading mb-1", children: "Status: Offline" }), _jsx("p", { className: "mb-0", children: error ?? "Unable to connect to TokTickIT API server" })] })), state === "loading" && (_jsxs("div", { className: "alert alert-info mt-4", role: "alert", children: [_jsx("h5", { className: "alert-heading mb-1", children: "Status: Loading..." }), _jsx("p", { className: "mb-0", children: "Loading categories..." })] })), state === "success" && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "alert alert-success mt-4", role: "alert", children: [_jsx("h5", { className: "alert-heading mb-1", children: "Status: Online" }), _jsx("p", { className: "mb-0", children: error ?? "Connected to TokTickIT API server" })] }), _jsxs("h6", { className: "mt-3", children: ["Categories (", categories.length, ")"] }), _jsx("ul", { className: "list-group mt-3", children: categories.map((cat) => (_jsx("li", { className: "list-group-item", children: cat.name }, cat.id))) })] }))] })] })] }));
}
export default function App() {
    return (_jsx(RequesterProvider, { children: _jsx(AppContent, {}) }));
}
