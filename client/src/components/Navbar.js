import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef, useContext } from "react";
import { AuthContext } from "../context/AuthContext.js";
import { useRequester } from "../context/RequesterContext.js";
export default function Navbar({ activeView = "tickets", onNavigate }) {
    const auth = useContext(AuthContext);
    const { selectedRequester, openSelector } = useRequester();
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isDesktopProfileOpen, setIsDesktopProfileOpen] = useState(false);
    const menuRef = useRef(null);
    const desktopMenuRef = useRef(null);
    // Close profile dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsProfileMenuOpen(false);
            }
            if (desktopMenuRef.current && !desktopMenuRef.current.contains(event.target)) {
                setIsDesktopProfileOpen(false);
            }
        }
        if (isProfileMenuOpen || isDesktopProfileOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isProfileMenuOpen, isDesktopProfileOpen]);
    const activeUser = auth?.user
        ? {
            displayName: auth.user.displayName,
            email: auth.user.email,
            role: auth.user.role,
        }
        : selectedRequester
            ? {
                displayName: selectedRequester.displayName,
                email: selectedRequester.email,
                role: selectedRequester.role,
            }
            : null;
    const handleLogout = async () => {
        if (auth?.logout) {
            await auth.logout();
        }
    };
    const getRoleBadgeClass = (role) => {
        switch (role) {
            case "ADMINISTRATOR":
                return "bg-dark text-white";
            case "IT_STAFF":
                return "bg-success text-white";
            default:
                return "bg-secondary text-white";
        }
    };
    const getRoleLabel = (role) => {
        switch (role) {
            case "ADMINISTRATOR":
                return "Administrator";
            case "IT_STAFF":
                return "IT Staff";
            default:
                return "Requester";
        }
    };
    return (_jsxs(_Fragment, { children: [_jsx("header", { className: "zen-header navbar navbar-expand-lg sticky-top", children: _jsxs("div", { className: "container-fluid d-flex justify-content-between align-items-center", children: [_jsxs("div", { className: "d-flex align-items-center gap-4", children: [_jsxs("a", { className: "navbar-brand d-flex align-items-center gap-2 m-0 text-decoration-none", href: "#/", onClick: (e) => {
                                        e.preventDefault();
                                        onNavigate?.("tickets");
                                    }, children: [_jsx("span", { className: "material-symbols-outlined", style: { fontSize: "1.5rem" }, children: "avg_pace" }), _jsx("span", { children: "TokTickIT" })] }), _jsxs("nav", { className: "d-none d-md-flex gap-3", children: [(!activeUser || activeUser.role === "REQUESTER") && (_jsxs(_Fragment, { children: [_jsx("a", { className: `nav-link text-decoration-none ${activeView === "tickets" ? "active" : ""}`, href: "#/my-tickets", onClick: (e) => {
                                                        e.preventDefault();
                                                        onNavigate?.("tickets");
                                                    }, children: "My Tickets" }), _jsx("a", { className: `nav-link text-decoration-none ${activeView === "create-ticket" ? "active" : ""}`, href: "#/create-ticket", onClick: (e) => {
                                                        e.preventDefault();
                                                        onNavigate?.("create-ticket");
                                                    }, children: "+ Create Ticket" })] })), activeUser?.role === "IT_STAFF" && (_jsxs(_Fragment, { children: [_jsx("a", { className: `nav-link text-decoration-none ${activeView === "queue" ? "active" : ""}`, href: "#/queue", onClick: (e) => {
                                                        e.preventDefault();
                                                        onNavigate?.("queue");
                                                    }, children: "My Queue" }), _jsx("a", { className: `nav-link text-decoration-none ${activeView === "create-ticket" ? "active" : ""}`, href: "#/create-ticket", onClick: (e) => {
                                                        e.preventDefault();
                                                        onNavigate?.("create-ticket");
                                                    }, children: "+ Create Ticket" })] })), activeUser?.role === "ADMINISTRATOR" && (_jsxs(_Fragment, { children: [_jsx("a", { className: `nav-link text-decoration-none ${activeView === "admin" ? "active" : ""}`, href: "#/admin/users", onClick: (e) => {
                                                        e.preventDefault();
                                                        onNavigate?.("admin");
                                                    }, children: "Admin" }), _jsx("a", { className: `nav-link text-decoration-none ${activeView === "queue" ? "active" : ""}`, href: "#/queue", onClick: (e) => {
                                                        e.preventDefault();
                                                        onNavigate?.("queue");
                                                    }, children: "My Queue" })] }))] })] }), _jsx("div", { className: "d-none d-md-flex align-items-center gap-3", children: auth?.user ? (_jsxs("div", { className: "position-relative d-flex align-items-center gap-2", ref: desktopMenuRef, children: [_jsx("button", { type: "button", className: "zen-user-badge d-flex align-items-center gap-2 border-0 bg-transparent text-white p-0", style: { cursor: "pointer" }, onClick: () => setIsDesktopProfileOpen((prev) => !prev), "aria-expanded": isDesktopProfileOpen, "aria-label": "User account menu", "data-testid": "active-requester-display", children: _jsxs("span", { className: "d-flex align-items-center gap-2 px-3 py-1 rounded-pill", style: {
                                                backgroundColor: "rgba(255, 255, 255, 0.18)",
                                                border: "1px solid rgba(255, 255, 255, 0.35)",
                                            }, children: [_jsx("span", { children: "\uD83D\uDC64" }), _jsx("span", { className: "fw-semibold text-white", "data-testid": "user-display-name", children: auth.user.displayName }), _jsx("span", { className: `badge ${getRoleBadgeClass(auth.user.role)} ms-1`, "data-testid": "user-role-badge", children: getRoleLabel(auth.user.role) }), _jsx("span", { style: { fontSize: "0.65rem", opacity: 0.85 }, children: "\u25BC" })] }) }), isDesktopProfileOpen && (_jsxs("div", { className: "zen-card p-3 shadow-lg position-absolute end-0 text-dark", style: {
                                            top: "calc(100% + 10px)",
                                            width: "280px",
                                            zIndex: 1060,
                                            border: "1px solid #DDE5E1",
                                            borderRadius: "12px",
                                            backgroundColor: "#ffffff",
                                        }, children: [_jsxs("div", { className: "d-flex align-items-center gap-2 mb-2", children: [_jsx("div", { className: "d-flex align-items-center justify-content-center rounded-circle flex-shrink-0", style: {
                                                            width: "38px",
                                                            height: "38px",
                                                            backgroundColor: "var(--color-pale-green, #eaf6ef)",
                                                            color: "var(--color-primary-green, #006b3c)",
                                                            fontSize: "1.2rem",
                                                        }, children: "\uD83D\uDC64" }), _jsxs("div", { className: "overflow-hidden", children: [_jsx("div", { className: "fw-bold small text-truncate", children: auth.user.displayName }), _jsx("div", { className: "text-muted text-truncate", style: { fontSize: "0.75rem" }, title: auth.user.email, children: auth.user.email })] })] }), _jsx("div", { className: "mb-2", children: _jsxs("span", { className: `badge ${getRoleBadgeClass(auth.user.role)}`, style: { fontSize: "0.75rem" }, children: ["Role: ", getRoleLabel(auth.user.role)] }) }), _jsx("hr", { className: "my-2" }), _jsxs("button", { type: "button", className: "btn btn-sm btn-outline-success w-100 d-flex align-items-center justify-content-center gap-2", onClick: () => {
                                                    setIsDesktopProfileOpen(false);
                                                    onNavigate?.("change-password");
                                                }, "data-testid": "desktop-change-password-btn", children: [_jsx("span", { children: "\uD83D\uDD11" }), _jsx("span", { children: "Change Password" })] })] })), _jsx("button", { type: "button", className: "btn-zen-outline-light", onClick: handleLogout, "data-testid": "logout-btn", children: "Logout" })] })) : selectedRequester ? (_jsxs(_Fragment, { children: [_jsxs("span", { className: "zen-user-badge d-flex align-items-center gap-2", "data-testid": "active-requester-display", children: [_jsx("span", { children: "\uD83D\uDC64" }), _jsx("span", { className: "fw-semibold", children: selectedRequester.displayName }), _jsx("span", { className: "badge bg-light text-success ms-1", children: "Requester" })] }), _jsx("button", { type: "button", className: "btn-zen-outline-light", onClick: openSelector, "data-testid": "change-requester-btn", children: "Change Requester" })] })) : (_jsx("button", { type: "button", className: "btn-zen-outline-light", onClick: openSelector, "data-testid": "select-requester-btn", children: "Select Requester" })) }), _jsx("div", { className: "d-md-none position-relative", ref: menuRef, children: activeUser && (_jsxs(_Fragment, { children: [_jsxs("button", { type: "button", className: "btn btn-sm text-white d-flex align-items-center gap-1 px-2 py-1", style: {
                                            backgroundColor: "rgba(255, 255, 255, 0.18)",
                                            border: "1px solid rgba(255, 255, 255, 0.35)",
                                            borderRadius: "20px",
                                            fontSize: "0.85rem",
                                        }, onClick: () => setIsProfileMenuOpen((prev) => !prev), "aria-expanded": isProfileMenuOpen, "aria-label": "User profile and navigation menu", children: [_jsx("span", { children: "\uD83D\uDC64" }), _jsx("span", { className: "fw-semibold text-truncate", style: { maxWidth: "120px" }, children: activeUser.displayName.split(" ")[0] }), _jsx("span", { style: { fontSize: "0.65rem", opacity: 0.85 }, children: "\u25BC" })] }), isProfileMenuOpen && (_jsxs("div", { className: "zen-card p-3 shadow-lg position-absolute end-0 mt-2 text-dark", style: {
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
                                                        }, children: "\uD83D\uDC64" }), _jsxs("div", { className: "overflow-hidden", children: [_jsx("div", { className: "fw-bold small text-truncate", children: activeUser.displayName }), _jsx("div", { className: "text-muted text-truncate", style: { fontSize: "0.72rem" }, children: activeUser.email })] })] }), _jsx("div", { className: "mb-3", children: _jsxs("span", { className: `badge ${getRoleBadgeClass(activeUser.role)}`, style: { fontSize: "0.75rem" }, children: ["Role: ", getRoleLabel(activeUser.role)] }) }), _jsxs("button", { type: "button", className: "btn btn-sm btn-outline-success w-100 d-flex align-items-center justify-content-center gap-2 mb-2", onClick: () => {
                                                    setIsProfileMenuOpen(false);
                                                    onNavigate?.("change-password");
                                                }, "data-testid": "mobile-change-password-btn", children: [_jsx("span", { children: "\uD83D\uDD11" }), _jsx("span", { children: "Change Password" })] }), _jsx("button", { type: "button", className: "btn btn-sm btn-outline-danger w-100", onClick: () => {
                                                    setIsProfileMenuOpen(false);
                                                    handleLogout();
                                                }, "data-testid": "mobile-logout-btn", children: "Logout" })] }))] })) })] }) }), _jsxs("nav", { className: "zen-mobile-bottom-nav d-md-none", "aria-label": "Mobile Navigation", children: [(!activeUser || activeUser.role === "REQUESTER") && (_jsxs(_Fragment, { children: [_jsxs("button", { type: "button", className: `zen-mobile-nav-item ${activeView === "tickets" ? "active" : ""}`, onClick: () => onNavigate?.("tickets"), "aria-current": activeView === "tickets" ? "page" : undefined, children: [_jsx("span", { style: { fontSize: "1.25rem", lineHeight: 1 }, children: "\uD83D\uDCCB" }), _jsx("span", { children: "My Tickets" })] }), _jsxs("button", { type: "button", className: `zen-mobile-nav-item ${activeView === "create-ticket" ? "active" : ""}`, onClick: () => onNavigate?.("create-ticket"), "aria-current": activeView === "create-ticket" ? "page" : undefined, children: [_jsx("span", { style: { fontSize: "1.25rem", lineHeight: 1 }, children: "\u2795" }), _jsx("span", { children: "Create Ticket" })] })] })), activeUser?.role === "IT_STAFF" && (_jsxs(_Fragment, { children: [_jsxs("button", { type: "button", className: `zen-mobile-nav-item ${activeView === "queue" ? "active" : ""}`, onClick: () => onNavigate?.("queue"), "aria-current": activeView === "queue" ? "page" : undefined, children: [_jsx("span", { style: { fontSize: "1.25rem", lineHeight: 1 }, children: "\uD83D\uDCE5" }), _jsx("span", { children: "My Queue" })] }), _jsxs("button", { type: "button", className: `zen-mobile-nav-item ${activeView === "create-ticket" ? "active" : ""}`, onClick: () => onNavigate?.("create-ticket"), "aria-current": activeView === "create-ticket" ? "page" : undefined, children: [_jsx("span", { style: { fontSize: "1.25rem", lineHeight: 1 }, children: "\u2795" }), _jsx("span", { children: "Create Ticket" })] })] })), activeUser?.role === "ADMINISTRATOR" && (_jsxs(_Fragment, { children: [_jsxs("button", { type: "button", className: `zen-mobile-nav-item ${activeView === "admin" ? "active" : ""}`, onClick: () => onNavigate?.("admin"), "aria-current": activeView === "admin" ? "page" : undefined, children: [_jsx("span", { style: { fontSize: "1.25rem", lineHeight: 1 }, children: "\uD83D\uDC65" }), _jsx("span", { children: "Admin" })] }), _jsxs("button", { type: "button", className: `zen-mobile-nav-item ${activeView === "queue" ? "active" : ""}`, onClick: () => onNavigate?.("queue"), "aria-current": activeView === "queue" ? "page" : undefined, children: [_jsx("span", { style: { fontSize: "1.25rem", lineHeight: 1 }, children: "\uD83D\uDCE5" }), _jsx("span", { children: "My Queue" })] })] }))] })] }));
}
