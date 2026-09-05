import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { checkSystem } from "./api.js";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import Navbar from "./components/Navbar.js";
import RequesterSelector from "./components/RequesterSelector.js";
import CreateTicket from "./components/CreateTicket.js";
import MyTickets from "./components/MyTickets.js";
import "./theme.css";
function AppContent() {
    const { selectedRequester, isSelectorOpen } = useRequester();
    const [activeView, setActiveView] = useState("tickets");
    const [state, setState] = useState("idle");
    const [categories, setCategories] = useState([]);
    const [error, setError] = useState(null);
    async function handleCheck() {
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
    return (_jsxs("div", { className: "min-vh-100 d-flex flex-column pb-5 pb-md-0", style: { backgroundColor: "var(--color-page-bg)" }, children: [_jsx(Navbar, { activeView: activeView, onNavigate: setActiveView }), (!selectedRequester || isSelectorOpen) && _jsx(RequesterSelector, {}), activeView === "create-ticket" ? (_jsx(CreateTicket, { onCancel: () => setActiveView("tickets") })) : (_jsxs(_Fragment, { children: [_jsx(MyTickets, { onNavigateCreate: () => setActiveView("create-ticket") }), _jsx("div", { className: "container py-3 px-lg-5", style: { maxWidth: 1280 }, children: _jsx("div", { className: "card border-0 bg-transparent mb-4", children: _jsx("div", { className: "card-body p-0", children: _jsxs("details", { className: "text-muted small", children: [_jsx("summary", { className: "cursor-pointer fw-semibold mb-2", children: "Lab 1 Service Connectivity Diagnostics" }), _jsxs("div", { className: "zen-card p-3 mt-2", style: { maxWidth: 600 }, children: [_jsx("h6", { className: "fw-bold mb-2", children: "System Status Check" }), _jsx("button", { className: "btn btn-sm btn-zen-secondary mb-2", onClick: handleCheck, disabled: state === "loading", children: state === "loading" ? "Loading…" : "Check System" }), state === "error" && (_jsxs("div", { className: "alert alert-danger py-2 px-3 mt-2", role: "alert", children: [_jsx("h6", { className: "alert-heading mb-1 small", children: "Status: Offline" }), _jsx("p", { className: "mb-0 small", children: error ?? "Unable to connect to TokTickIT API server" })] })), state === "loading" && (_jsxs("div", { className: "alert alert-info py-2 px-3 mt-2", role: "alert", children: [_jsx("h6", { className: "alert-heading mb-1 small", children: "Status: Loading..." }), _jsx("p", { className: "mb-0 small", children: "Loading categories..." })] })), state === "success" && (_jsxs("div", { className: "alert alert-success py-2 px-3 mt-2", role: "alert", children: [_jsx("h6", { className: "alert-heading mb-1 small", children: "Status: Online" }), _jsx("p", { className: "mb-0 small", children: error ?? "Connected to TokTickIT API server" }), _jsx("ul", { className: "list-group list-group-flush mt-2 small", children: categories.map((cat) => (_jsx("li", { className: "list-group-item bg-transparent py-1 px-0", children: cat.name }, cat.id))) })] }))] })] }) }) }) })] }))] }));
}
export default function App() {
    return (_jsx(RequesterProvider, { children: _jsx(AppContent, {}) }));
}
