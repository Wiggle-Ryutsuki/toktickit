import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { checkSystem } from "./api.js";
export default function App() {
    const [state, setState] = useState("idle");
    const [categories, setCategories] = useState([]);
    void categories;
    const [error, setError] = useState(null);
    void error;
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
    return (_jsxs("div", { className: "container py-5", style: { maxWidth: 640 }, children: [_jsxs("h1", { className: "h3 mb-4", children: ["TokTickIT ", _jsx("span", { className: "text-success", children: "IT Service Desk" })] }), _jsx("button", { className: "btn btn-success", onClick: handleCheck, disabled: state === "loading", children: state === "loading" ? "Loading…" : "Check System" }), state === "error" &&
                _jsxs("div", { className: "alert alert-danger mt-4", role: "alert", children: [_jsx("h5", { className: "alert-heading mb-1", children: "Status: Offline" }), _jsx("p", { className: "mb-0", children: error ?? "Unable to connect to TokTickIT API server" })] }), state === "loading" &&
                _jsxs("div", { className: "alert alert-info mt-4", role: "alert", children: [_jsx("h5", { className: "alert-heading mb-1", children: "Status: Loading..." }), _jsx("p", { className: "mb-0", children: "Loading categories..." })] }), state === "success" && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "alert alert-success mt-4", role: "alert", children: [_jsx("h5", { className: "alert-heading mb-1", children: "Status: Online" }), _jsx("p", { className: "mb-0", children: error ?? "Connected to TokTickIT API server" })] }), _jsxs("h6", { className: "mt-3", children: ["Categories (", categories.length, ")"] }), _jsx("ul", { className: "list-group mt-3", children: categories.map((cat) => (_jsx("li", { className: "list-group-item", children: cat.name }, cat.id))) })] }))] }));
}
