import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { useRequester } from "../context/RequesterContext.js";
export default function Navbar({ activeView = "tickets", onNavigate }) {
    const { selectedRequester, openSelector } = useRequester();
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const menuRef = useRef(null);
    // Close profile dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsProfileMenuOpen(false);
            }
        }
        if (isProfileMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isProfileMenuOpen]);
    return (_jsxs(_Fragment, { children: [_jsx("header", { className: "zen-header navbar navbar-expand-lg sticky-top", children: _jsxs("div", { className: "container-fluid d-flex justify-content-between align-items-center", children: [_jsxs("div", { className: "d-flex align-items-center gap-4", children: [_jsxs("a", { className: "navbar-brand d-flex align-items-center gap-2 m-0 text-decoration-none", href: "#/", onClick: (e) => {
                                        e.preventDefault();
                                        onNavigate?.("tickets");
                                    }, children: [_jsx("span", { className: "material-symbols-outlined", style: { fontSize: "1.5rem" }, children: "avg_pace" }), _jsx("span", { children: "TokTickIT" })] }), _jsxs("nav", { className: "d-none d-md-flex gap-3", children: [_jsx("a", { className: `nav-link text-decoration-none ${activeView === "tickets" ? "active" : ""}`, href: "#/my-tickets", onClick: (e) => {
                                                e.preventDefault();
                                                onNavigate?.("tickets");
                                            }, children: "My Tickets" }), _jsx("a", { className: `nav-link text-decoration-none ${activeView === "create-ticket" ? "active" : ""}`, href: "#/create-ticket", onClick: (e) => {
                                                e.preventDefault();
                                                onNavigate?.("create-ticket");
                                            }, children: "+ Create Ticket" })] })] }), _jsx("div", { className: "d-none d-md-flex align-items-center gap-2", children: selectedRequester ? (_jsxs(_Fragment, { children: [_jsxs("span", { className: "zen-user-badge", "data-testid": "active-requester-display", children: [_jsx("span", { children: "\uD83D\uDC64" }), _jsx("span", { className: "fw-semibold", children: selectedRequester.displayName }), _jsx("span", { className: "badge bg-light text-success ms-1", children: "Requester" })] }), _jsx("button", { type: "button", className: "btn-zen-outline-light", onClick: openSelector, "data-testid": "change-requester-btn", children: "Change Requester" })] })) : (_jsx("button", { type: "button", className: "btn-zen-outline-light", onClick: openSelector, "data-testid": "select-requester-btn", children: "Select Requester" })) }), _jsx("div", { className: "d-md-none position-relative", ref: menuRef, children: selectedRequester ? (_jsxs(_Fragment, { children: [_jsxs("button", { type: "button", className: "btn btn-sm text-white d-flex align-items-center gap-1 px-2 py-1", style: {
                                            backgroundColor: "rgba(255, 255, 255, 0.18)",
                                            border: "1px solid rgba(255, 255, 255, 0.35)",
                                            borderRadius: "20px",
                                            fontSize: "0.85rem",
                                        }, onClick: () => setIsProfileMenuOpen((prev) => !prev), "aria-expanded": isProfileMenuOpen, "aria-label": "Requester profile and navigation menu", children: [_jsx("span", { children: "\uD83D\uDC64" }), _jsx("span", { className: "fw-semibold text-truncate", style: { maxWidth: "120px" }, children: selectedRequester.displayName.split(" ")[0] }), _jsx("span", { style: { fontSize: "0.65rem", opacity: 0.85 }, children: "\u25BC" })] }), isProfileMenuOpen && (_jsxs("div", { className: "zen-card p-3 shadow-lg position-absolute end-0 mt-2 text-dark", style: {
                                            width: "250px",
                                            zIndex: 1060,
                                            border: "1px solid #DDE5E1",
                                            borderRadius: "12px",
                                            backgroundColor: "#ffffff",
                                        }, children: [_jsxs("div", { className: "d-flex align-items-center gap-2 mb-2", children: [_jsx("div", { className: "d-flex align-items-center justify-content-center rounded-circle flex-shrink-0", style: {
                                                            width: "36px",
                                                            height: "36px",
                                                            backgroundColor: "var(--color-pale-green)",
                                                            color: "var(--color-primary-green)",
                                                            fontSize: "1.1rem",
                                                        }, children: "\uD83D\uDC64" }), _jsxs("div", { className: "overflow-hidden", children: [_jsx("div", { className: "fw-bold small text-truncate", children: selectedRequester.displayName }), _jsx("div", { className: "text-muted text-truncate", style: { fontSize: "0.72rem" }, children: selectedRequester.email })] })] }), _jsx("div", { className: "mb-3", children: _jsxs("span", { className: "badge bg-light text-success border", style: { fontSize: "0.75rem" }, children: ["Role: ", selectedRequester.role] }) }), _jsx("button", { type: "button", className: "btn btn-sm btn-zen-secondary w-100", onClick: () => {
                                                    setIsProfileMenuOpen(false);
                                                    openSelector();
                                                }, children: "Change Requester" })] }))] })) : (_jsx("button", { type: "button", className: "btn-zen-outline-light btn-sm", onClick: openSelector, children: "Select" })) })] }) }), _jsxs("nav", { className: "zen-mobile-bottom-nav d-md-none", "aria-label": "Mobile Navigation", children: [_jsxs("button", { type: "button", className: `zen-mobile-nav-item ${activeView === "tickets" ? "active" : ""}`, onClick: () => onNavigate?.("tickets"), "aria-current": activeView === "tickets" ? "page" : undefined, children: [_jsx("span", { style: { fontSize: "1.25rem", lineHeight: 1 }, children: "\uD83D\uDCCB" }), _jsx("span", { children: "My Tickets" })] }), _jsxs("button", { type: "button", className: `zen-mobile-nav-item ${activeView === "create-ticket" ? "active" : ""}`, onClick: () => onNavigate?.("create-ticket"), "aria-current": activeView === "create-ticket" ? "page" : undefined, children: [_jsx("span", { style: { fontSize: "1.25rem", lineHeight: 1 }, children: "\u2795" }), _jsx("span", { children: "Create Ticket" })] })] })] }));
}
