import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useContext } from "react";
import { AuthContext } from "../context/AuthContext.js";
import { getAdminUsersApi, createAdminUserApi, updateAdminUserApi, resetUserPasswordApi, } from "../api.js";
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
export default function UserManagement({ onNavigate }) {
    const auth = useContext(AuthContext);
    // Authorization check
    const isAuthorized = auth?.user?.role === "ADMINISTRATOR";
    // Search & Filter State
    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("ALL");
    // Data & Lifecycle State
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [apiError, setApiError] = useState(null);
    // Modal States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [deactivateConfirmTarget, setDeactivateConfirmTarget] = useState(null);
    // Create Form State
    const [createName, setCreateName] = useState("");
    const [createEmail, setCreateEmail] = useState("");
    const [createRole, setCreateRole] = useState("REQUESTER");
    const [createIsActive, setCreateIsActive] = useState(true);
    const [createPassword, setCreatePassword] = useState("");
    const [showCreatePassword, setShowCreatePassword] = useState(false);
    const [createError, setCreateError] = useState(null);
    const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
    // Edit Form State
    const [editName, setEditName] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editRole, setEditRole] = useState("REQUESTER");
    const [editError, setEditError] = useState(null);
    const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
    // Password Reset Section within Edit Modal
    const [isResetSectionOpen, setIsResetSectionOpen] = useState(false);
    const [resetPasswordInput, setResetPasswordInput] = useState("");
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [resetError, setResetError] = useState(null);
    const [resetSuccess, setResetSuccess] = useState(null);
    const [isSubmittingReset, setIsSubmittingReset] = useState(false);
    // Debounce search input (300ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchInput.trim());
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);
    // Fetch Users
    const fetchUsers = useCallback(async () => {
        if (!isAuthorized)
            return;
        setIsLoading(true);
        setApiError(null);
        try {
            const data = await getAdminUsersApi({
                search: debouncedSearch || undefined,
                role: roleFilter !== "ALL" ? roleFilter : undefined,
            });
            setUsers(Array.isArray(data) ? data : []);
        }
        catch (err) {
            setApiError(err?.message || "Failed to load user directory.");
        }
        finally {
            setIsLoading(false);
        }
    }, [isAuthorized, debouncedSearch, roleFilter]);
    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);
    // Active Admin Count (used for Last Active Admin protection)
    const activeAdminCount = users.filter((u) => u.role === "ADMINISTRATOR" && u.isActive).length;
    // Password Validation Helpers
    const validatePasswordComplexity = (pw) => {
        const isLengthValid = pw.length >= 8 && pw.length <= 128;
        const isCasesValid = /[a-z]/.test(pw) && /[A-Z]/.test(pw);
        const isSpecialValid = /\d/.test(pw) && SPECIAL_CHAR_REGEX.test(pw);
        return {
            isValid: isLengthValid && isCasesValid && isSpecialValid,
            isLengthValid,
            isCasesValid,
            isSpecialValid,
        };
    };
    const createPasswordCheck = validatePasswordComplexity(createPassword);
    const resetPasswordCheck = validatePasswordComplexity(resetPasswordInput);
    // Create Form Validity
    const isCreateFormValid = createName.trim().length >= 2 &&
        createName.trim().length <= 100 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createEmail.trim()) &&
        createPasswordCheck.isValid;
    // Edit Form Validity
    const isEditFormValid = editName.trim().length >= 2 &&
        editName.trim().length <= 100 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail.trim());
    // Handle Open Edit Modal
    const handleOpenEdit = (user) => {
        setEditingUser(user);
        setEditName(user.displayName);
        setEditEmail(user.email);
        setEditRole(user.role);
        setEditError(null);
        setIsResetSectionOpen(false);
        setResetPasswordInput("");
        setResetError(null);
        setResetSuccess(null);
    };
    // Close Edit Modal and reset state
    const handleCloseEdit = () => {
        setEditingUser(null);
        setEditName("");
        setEditEmail("");
        setEditError(null);
        setIsResetSectionOpen(false);
        setResetPasswordInput("");
        setResetError(null);
        setResetSuccess(null);
    };
    // Handle Open Create Modal
    const handleOpenCreate = () => {
        setCreateName("");
        setCreateEmail("");
        setCreateRole("REQUESTER");
        setCreateIsActive(true);
        setCreatePassword("");
        setShowCreatePassword(false);
        setCreateError(null);
        setIsCreateModalOpen(true);
    };
    // Close Create Modal and reset state
    const handleCloseCreate = () => {
        setIsCreateModalOpen(false);
        setCreateName("");
        setCreateEmail("");
        setCreatePassword("");
        setCreateError(null);
    };
    // Submit Create User
    const handleSubmitCreate = async (e) => {
        e.preventDefault();
        if (!isCreateFormValid || isSubmittingCreate)
            return;
        setCreateError(null);
        setIsSubmittingCreate(true);
        try {
            const payload = {
                displayName: createName.trim(),
                email: createEmail.trim(),
                role: createRole,
                isActive: createIsActive,
                initialPassword: createPassword,
            };
            await createAdminUserApi(payload);
            handleCloseCreate();
            await fetchUsers();
        }
        catch (err) {
            if (err?.code === "DUPLICATE_EMAIL" || err?.status === 409) {
                setCreateError("A user with this email address already exists.");
            }
            else {
                setCreateError(err?.message || "Failed to create user account.");
            }
        }
        finally {
            setIsSubmittingCreate(false);
        }
    };
    // Submit Edit User
    const handleSubmitEdit = async (e) => {
        e.preventDefault();
        if (!editingUser || !isEditFormValid || isSubmittingEdit)
            return;
        setEditError(null);
        setIsSubmittingEdit(true);
        try {
            const payload = {};
            if (editName.trim() !== editingUser.displayName)
                payload.displayName = editName.trim();
            if (editEmail.trim() !== editingUser.email)
                payload.email = editEmail.trim();
            if (editRole !== editingUser.role)
                payload.role = editRole;
            // Only send if there are changes
            if (Object.keys(payload).length > 0) {
                const updated = await updateAdminUserApi(editingUser.id, payload);
                // Context Synchronization: if current admin updated their own name or email, refresh auth
                if (auth?.user?.id === editingUser.id && (payload.displayName || payload.email)) {
                    if (auth.refreshUser) {
                        await auth.refreshUser();
                    }
                }
                setEditingUser(updated);
            }
            handleCloseEdit();
            await fetchUsers();
        }
        catch (err) {
            if (err?.code === "DUPLICATE_EMAIL" || err?.status === 409) {
                setEditError("A user with this email address already exists.");
            }
            else if (err?.code === "LAST_ADMIN_PROTECTION") {
                setEditError("Cannot deactivate or re-role the only active Administrator in the system.");
            }
            else if (err?.code === "SELF_DEACTIVATION_PROHIBITED") {
                setEditError("You cannot deactivate your own active Administrator account.");
            }
            else {
                setEditError(err?.message || "Failed to update user account.");
            }
        }
        finally {
            setIsSubmittingEdit(false);
        }
    };
    // Toggle User Active Status (Activation or Deactivation prompt)
    const handleToggleActiveClick = () => {
        if (!editingUser)
            return;
        if (editingUser.isActive) {
            // Prompt confirmation before deactivating
            setDeactivateConfirmTarget(editingUser);
        }
        else {
            // Reactivate directly
            handleConfirmReactivate(editingUser);
        }
    };
    const handleConfirmReactivate = async (targetUser) => {
        setEditError(null);
        try {
            await updateAdminUserApi(targetUser.id, { isActive: true });
            handleCloseEdit();
            await fetchUsers();
        }
        catch (err) {
            setEditError(err?.message || "Failed to activate user.");
        }
    };
    const handleConfirmDeactivate = async () => {
        if (!deactivateConfirmTarget)
            return;
        setEditError(null);
        try {
            await updateAdminUserApi(deactivateConfirmTarget.id, { isActive: false });
            setDeactivateConfirmTarget(null);
            handleCloseEdit();
            await fetchUsers();
        }
        catch (err) {
            setDeactivateConfirmTarget(null);
            if (err?.code === "SELF_DEACTIVATION_PROHIBITED") {
                setEditError("You cannot deactivate your own active Administrator account.");
            }
            else if (err?.code === "LAST_ADMIN_PROTECTION") {
                setEditError("Cannot deactivate or re-role the only active Administrator in the system.");
            }
            else {
                setEditError(err?.message || "Failed to deactivate user.");
            }
        }
    };
    // Submit Password Reset
    const handleSubmitResetPassword = async (e) => {
        e.preventDefault();
        if (!editingUser || !resetPasswordCheck.isValid || isSubmittingReset)
            return;
        setResetError(null);
        setResetSuccess(null);
        setIsSubmittingReset(true);
        try {
            await resetUserPasswordApi(editingUser.id, {
                initialPassword: resetPasswordInput,
            });
            setResetSuccess("Initial password successfully updated. User must change password at next login.");
            setResetPasswordInput("");
            // Update local state to reflect mustChangePassword = true
            setEditingUser({ ...editingUser, mustChangePassword: true });
            await fetchUsers();
        }
        catch (err) {
            setResetError(err?.message || "Failed to reset password.");
        }
        finally {
            setIsSubmittingReset(false);
        }
    };
    // Clear all filters
    const handleClearFilters = () => {
        setSearchInput("");
        setDebouncedSearch("");
        setRoleFilter("ALL");
    };
    // Helpers for Badges
    const getRoleBadgeClass = (role) => {
        switch (role) {
            case "ADMINISTRATOR":
                return "badge-role-admin";
            case "IT_STAFF":
                return "badge-role-staff";
            default:
                return "badge-role-requester";
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
    // 403 Forbidden View for non-administrators
    if (!isAuthorized) {
        return (_jsx("main", { className: "container-fluid py-5 px-lg-5 flex-grow-1", style: { maxWidth: 1280 }, "data-testid": "forbidden-state", children: _jsxs("div", { className: "zen-card text-center p-5 mx-auto", style: { maxWidth: 560 }, children: [_jsx("div", { style: { fontSize: "3.5rem" }, className: "mb-3", children: "\uD83D\uDEAB" }), _jsx("h1", { className: "h4 fw-bold mb-2 text-danger", children: "Access Denied" }), _jsx("p", { className: "text-muted mb-4", children: "Access Denied. You do not have permission to access User Management." }), _jsx("div", { children: _jsx("button", { type: "button", className: "btn btn-zen-primary", onClick: () => onNavigate ? onNavigate(auth?.user?.role === "IT_STAFF" ? "queue" : "tickets") : undefined, "data-testid": "go-back-btn", children: "Return to Dashboard" }) })] }) }));
    }
    const hasActiveFilters = Boolean(searchInput.trim()) || roleFilter !== "ALL";
    // Calculate safety restrictions for editing user
    const isEditingSelf = editingUser ? auth?.user?.id === editingUser.id : false;
    const isEditingSoleActiveAdmin = editingUser?.role === "ADMINISTRATOR" && editingUser?.isActive && activeAdminCount <= 1;
    return (_jsxs("main", { className: "container-fluid py-4 px-lg-5 flex-grow-1", style: { maxWidth: 1280 }, children: [_jsxs("div", { className: "d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "h3 fw-bold mb-1", style: { color: "var(--color-primary-green)" }, children: "User Management" }), _jsx("p", { className: "text-muted small mb-0", "data-testid": "user-count", children: isLoading
                                    ? "Loading user accounts..."
                                    : users.length > 0
                                        ? `Showing ${users.length} user account${users.length === 1 ? "" : "s"}`
                                        : "Showing 0 user accounts" })] }), _jsxs("div", { className: "d-flex align-items-center gap-2", children: [_jsxs("button", { type: "button", className: "btn btn-outline-secondary d-inline-flex align-items-center gap-2", onClick: () => fetchUsers(), disabled: isLoading, "aria-label": "Refresh user list", "data-testid": "refresh-users-btn", children: [_jsx("span", { style: { fontSize: "1rem" }, children: "\uD83D\uDD04" }), _jsx("span", { children: "Refresh" })] }), _jsxs("button", { type: "button", className: "btn btn-zen-primary d-inline-flex align-items-center gap-2", onClick: handleOpenCreate, "data-testid": "create-user-btn", children: [_jsx("span", { style: { fontSize: "1.1rem", lineHeight: 1 }, children: "\u2795" }), _jsx("span", { children: "Create User" })] })] })] }), _jsx("div", { className: "zen-card p-3 mb-4", children: _jsxs("div", { className: "row g-2 align-items-center", children: [_jsx("div", { className: "col-12 col-md-6 col-lg-5", children: _jsxs("div", { className: "input-group", children: [_jsx("span", { className: "input-group-text bg-white border-end-0 text-muted", children: "\uD83D\uDD0D" }), _jsx("input", { type: "text", className: "form-control border-start-0 ps-0", placeholder: "Search users by name or email...", value: searchInput, onChange: (e) => setSearchInput(e.target.value), "aria-label": "Search users by name or email", "data-testid": "search-user-input" })] }) }), _jsx("div", { className: "col-12 col-md-4 col-lg-3", children: _jsxs("div", { className: "input-group", children: [_jsx("span", { className: "input-group-text bg-white border-end-0 text-muted small", children: "Role:" }), _jsxs("select", { className: "form-select border-start-0 ps-2", value: roleFilter, onChange: (e) => setRoleFilter(e.target.value), "aria-label": "Filter users by role", "data-testid": "role-filter-select", children: [_jsx("option", { value: "ALL", children: "All Roles" }), _jsx("option", { value: "REQUESTER", children: "Requester" }), _jsx("option", { value: "IT_STAFF", children: "IT Staff" }), _jsx("option", { value: "ADMINISTRATOR", children: "Administrator" })] })] }) }), hasActiveFilters && (_jsx("div", { className: "col-12 col-md-2 col-lg-2", children: _jsx("button", { type: "button", className: "btn btn-outline-secondary w-100", onClick: handleClearFilters, "data-testid": "clear-filters-btn", children: "Clear Filters" }) }))] }) }), apiError && (_jsxs("div", { className: "alert alert-danger d-flex align-items-center justify-content-between p-3 mb-4", role: "alert", "data-testid": "api-error-state", children: [_jsxs("div", { children: [_jsx("strong", { children: "Unable to load users." }), " ", apiError] }), _jsx("button", { type: "button", className: "btn btn-sm btn-outline-danger", onClick: () => fetchUsers(), "data-testid": "retry-btn", children: "Retry" })] })), isLoading && (_jsx("div", { className: "zen-card p-4 mb-4", "data-testid": "loading-skeleton", children: _jsx("div", { className: "d-flex flex-column gap-3", children: [1, 2, 3, 4, 5].map((i) => (_jsx("div", { className: "zen-skeleton-bar w-100", style: { height: "2.5rem" } }, i))) }) })), !isLoading && !apiError && (_jsxs(_Fragment, { children: [users.length === 0 && (_jsxs("div", { className: "zen-card text-center p-5 mb-4", "data-testid": "no-results-state", children: [_jsx("div", { style: { fontSize: "3.5rem" }, className: "mb-2", children: "\uD83D\uDC65" }), _jsx("h2", { className: "h5 fw-bold mb-2", children: "No user accounts found." }), _jsx("p", { className: "text-muted small mb-4 mx-auto", style: { maxWidth: 460 }, children: hasActiveFilters
                                    ? "No user accounts match your search criteria. Try clearing filters."
                                    : "There are currently no user accounts in the directory." }), hasActiveFilters && (_jsx("button", { type: "button", className: "btn btn-zen-primary", onClick: handleClearFilters, "data-testid": "no-results-clear-btn", children: "Clear Filters" }))] })), users.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "d-none d-md-block zen-table-container mb-4 table-responsive", children: _jsxs("table", { className: "zen-table table align-middle", "data-testid": "user-management-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: { width: "25%" }, children: "NAME" }), _jsx("th", { style: { width: "30%" }, children: "EMAIL" }), _jsx("th", { style: { width: "15%" }, children: "ROLE" }), _jsx("th", { style: { width: "15%" }, children: "STATUS" }), _jsx("th", { className: "text-end", style: { width: "15%" }, children: "ACTIONS" })] }) }), _jsx("tbody", { children: users.map((u) => (_jsxs("tr", { "data-testid": `user-row-${u.id}`, children: [_jsx("td", { children: _jsx("span", { className: "fw-semibold text-dark", "data-testid": `user-name-${u.id}`, children: u.displayName }) }), _jsx("td", { children: _jsx("span", { className: "text-muted font-monospace small", "data-testid": `user-email-${u.id}`, children: u.email }) }), _jsx("td", { children: _jsx("span", { className: `badge ${getRoleBadgeClass(u.role)}`, "data-testid": `user-role-${u.id}`, children: getRoleLabel(u.role) }) }), _jsx("td", { children: _jsx("span", { className: `badge ${u.isActive ? "badge-status-active" : "badge-status-inactive"}`, "data-testid": `user-status-${u.id}`, children: u.isActive ? "Active" : "Inactive" }) }), _jsx("td", { className: "text-end", children: _jsx("button", { type: "button", className: "btn btn-sm btn-outline-secondary", onClick: () => handleOpenEdit(u), "data-testid": `edit-user-btn-${u.id}`, "aria-label": `Edit user ${u.displayName}`, children: "Edit" }) })] }, u.id))) })] }) }), _jsx("div", { className: "d-md-none d-flex flex-column gap-3 mb-4", children: users.map((u) => (_jsxs("div", { className: "zen-card p-3 shadow-sm", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-start mb-2", children: [_jsxs("div", { children: [_jsx("h6", { className: "fw-bold mb-1", children: u.displayName }), _jsx("div", { className: "text-muted small font-monospace", children: u.email })] }), _jsx("span", { className: `badge ${u.isActive ? "badge-status-active" : "badge-status-inactive"}`, children: u.isActive ? "Active" : "Inactive" })] }), _jsxs("div", { className: "d-flex justify-content-between align-items-center mt-3 pt-2 border-top", children: [_jsx("span", { className: `badge ${getRoleBadgeClass(u.role)}`, children: getRoleLabel(u.role) }), _jsx("button", { type: "button", className: "btn btn-sm btn-outline-secondary", onClick: () => handleOpenEdit(u), "data-testid": `mobile-edit-user-btn-${u.id}`, children: "Edit User" })] })] }, u.id))) })] }))] })), isCreateModalOpen && (_jsx("div", { className: "modal-backdrop-custom d-flex justify-content-center align-items-center", style: {
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    backgroundColor: "rgba(26, 46, 36, 0.5)",
                    zIndex: 1050,
                    padding: "1rem",
                    overflowY: "auto",
                }, role: "dialog", "aria-modal": "true", "aria-labelledby": "create-user-modal-title", "data-testid": "create-user-modal", children: _jsxs("div", { className: "zen-card p-4 w-100 shadow-lg", style: { maxWidth: 540 }, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsx("h2", { className: "h5 fw-bold mb-0", id: "create-user-modal-title", children: "Create New User" }), _jsx("button", { type: "button", className: "btn-close", onClick: handleCloseCreate, "aria-label": "Close modal", "data-testid": "close-create-modal" })] }), createError && (_jsx("div", { className: "alert alert-danger py-2 px-3 mb-3 small", role: "alert", "data-testid": "create-error-alert", children: createError })), _jsxs("form", { onSubmit: handleSubmitCreate, children: [_jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "create-name", className: "form-label fw-semibold small", children: ["Full Name ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { id: "create-name", type: "text", className: "form-control", placeholder: "e.g. Somchai Jaidee", value: createName, onChange: (e) => setCreateName(e.target.value), required: true, "data-testid": "create-name-input" })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "create-email", className: "form-label fw-semibold small", children: ["Email Address ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { id: "create-email", type: "email", className: "form-control", placeholder: "e.g. somchai.jai@kmutt.ac.th", value: createEmail, onChange: (e) => setCreateEmail(e.target.value), required: true, "data-testid": "create-email-input" })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "create-role", className: "form-label fw-semibold small", children: ["Role ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("select", { id: "create-role", className: "form-select", value: createRole, onChange: (e) => setCreateRole(e.target.value), required: true, "data-testid": "create-role-select", children: [_jsx("option", { value: "REQUESTER", children: "Requester" }), _jsx("option", { value: "IT_STAFF", children: "IT Staff" }), _jsx("option", { value: "ADMINISTRATOR", children: "Administrator" })] })] }), _jsxs("div", { className: "mb-3 form-check", children: [_jsx("input", { id: "create-active", type: "checkbox", className: "form-check-input", checked: createIsActive, onChange: (e) => setCreateIsActive(e.target.checked), "data-testid": "create-active-toggle" }), _jsx("label", { htmlFor: "create-active", className: "form-check-label small fw-semibold", children: "Active account" })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "create-password", className: "form-label fw-semibold small", children: ["Initial Password ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("div", { className: "input-group", children: [_jsx("input", { id: "create-password", type: showCreatePassword ? "text" : "password", className: "form-control", placeholder: "Enter initial temporary password", value: createPassword, onChange: (e) => setCreatePassword(e.target.value), required: true, "data-testid": "create-password-input" }), _jsx("button", { type: "button", className: "btn btn-outline-secondary", onClick: () => setShowCreatePassword((prev) => !prev), "aria-label": showCreatePassword ? "Hide password" : "Show password", "data-testid": "toggle-create-password", children: showCreatePassword ? "🙈" : "👁" })] }), _jsx("div", { className: "text-muted small mt-1", children: "\u2139 User will be forced to change this password on their next login." }), _jsxs("div", { className: "p-2 rounded bg-light border mt-2 small", children: [_jsx("div", { className: "fw-semibold mb-1", style: { fontSize: "0.78rem" }, children: "Password Complexity Checklist:" }), _jsxs("ul", { className: "list-unstyled mb-0 ps-1", style: { fontSize: "0.75rem" }, children: [_jsxs("li", { className: createPasswordCheck.isLengthValid ? "text-success" : "text-muted", children: [createPasswordCheck.isLengthValid ? "✓" : "○", " 8\u2013128 characters"] }), _jsxs("li", { className: createPasswordCheck.isCasesValid ? "text-success" : "text-muted", children: [createPasswordCheck.isCasesValid ? "✓" : "○", " Both uppercase and lowercase letters"] }), _jsxs("li", { className: createPasswordCheck.isSpecialValid ? "text-success" : "text-muted", children: [createPasswordCheck.isSpecialValid ? "✓" : "○", " At least one number and special character"] })] })] })] }), _jsxs("div", { className: "d-flex justify-content-end gap-2 pt-2 border-top", children: [_jsx("button", { type: "button", className: "btn btn-outline-secondary", onClick: handleCloseCreate, disabled: isSubmittingCreate, "data-testid": "cancel-create-btn", children: "Cancel" }), _jsx("button", { type: "submit", className: "btn btn-zen-primary", disabled: !isCreateFormValid || isSubmittingCreate, "data-testid": "submit-create-btn", children: isSubmittingCreate ? "Saving..." : "Save User" })] })] })] }) })), editingUser && (_jsx("div", { className: "modal-backdrop-custom d-flex justify-content-center align-items-center", style: {
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    backgroundColor: "rgba(26, 46, 36, 0.5)",
                    zIndex: 1050,
                    padding: "1rem",
                    overflowY: "auto",
                }, role: "dialog", "aria-modal": "true", "aria-labelledby": "edit-user-modal-title", "data-testid": "edit-user-modal", children: _jsxs("div", { className: "zen-card p-4 w-100 shadow-lg", style: { maxWidth: 580 }, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsxs("h2", { className: "h5 fw-bold mb-0", id: "edit-user-modal-title", children: ["Edit User: ", editingUser.displayName] }), _jsx("button", { type: "button", className: "btn-close", onClick: handleCloseEdit, "aria-label": "Close modal", "data-testid": "close-edit-modal" })] }), isEditingSelf && (_jsx("div", { className: "alert alert-warning py-2 px-3 mb-3 small", role: "alert", "data-testid": "safety-alert", children: "\u26A0\uFE0F You cannot deactivate your own active Administrator account." })), !isEditingSelf && isEditingSoleActiveAdmin && (_jsx("div", { className: "alert alert-warning py-2 px-3 mb-3 small", role: "alert", "data-testid": "safety-alert", children: "\u26A0\uFE0F Cannot deactivate or re-role the only active Administrator in the system." })), editError && (_jsx("div", { className: "alert alert-danger py-2 px-3 mb-3 small", role: "alert", "data-testid": "edit-error-alert", children: editError })), _jsxs("form", { onSubmit: handleSubmitEdit, children: [_jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "edit-name", className: "form-label fw-semibold small", children: ["Full Name ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { id: "edit-name", type: "text", className: "form-control", value: editName, onChange: (e) => setEditName(e.target.value), required: true, "data-testid": "edit-name-input" })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "edit-email", className: "form-label fw-semibold small", children: ["Email Address ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { id: "edit-email", type: "email", className: "form-control", value: editEmail, onChange: (e) => setEditEmail(e.target.value), required: true, "data-testid": "edit-email-input" })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "edit-role", className: "form-label fw-semibold small", children: ["Role ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("select", { id: "edit-role", className: "form-select", value: editRole, onChange: (e) => setEditRole(e.target.value), required: true, disabled: isEditingSoleActiveAdmin, "data-testid": "edit-role-select", children: [_jsx("option", { value: "REQUESTER", disabled: isEditingSoleActiveAdmin, children: "Requester" }), _jsx("option", { value: "IT_STAFF", disabled: isEditingSoleActiveAdmin, children: "IT Staff" }), _jsx("option", { value: "ADMINISTRATOR", children: "Administrator" })] }), isEditingSoleActiveAdmin && (_jsx("div", { className: "text-muted small mt-1", children: "Role change locked: Only active Administrator." }))] }), _jsxs("div", { className: "mb-3 d-flex align-items-center justify-content-between p-2 bg-light rounded border", children: [_jsxs("div", { children: [_jsx("div", { className: "small fw-semibold", children: "Account Status" }), _jsx("div", { className: "text-muted small", children: editingUser.isActive
                                                        ? "User can log in and submit tickets."
                                                        : "Account deactivated. Login is blocked." })] }), _jsx("div", { children: _jsx("span", { className: `badge ${editingUser.isActive ? "badge-status-active" : "badge-status-inactive"}`, children: editingUser.isActive ? "Active" : "Inactive" }) })] }), _jsxs("div", { className: "mb-4 zen-card p-3 border", "data-testid": "reset-password-section", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center", children: [_jsxs("div", { children: [_jsx("h6", { className: "fw-bold mb-0 small", children: "Credential Management" }), _jsx("div", { className: "text-muted small", style: { fontSize: "0.75rem" }, children: "Set a new initial password requiring change on next login." })] }), _jsx("button", { type: "button", className: "btn btn-sm btn-outline-secondary", onClick: () => {
                                                        setIsResetSectionOpen((prev) => !prev);
                                                        setResetError(null);
                                                        setResetSuccess(null);
                                                        setResetPasswordInput("");
                                                    }, "data-testid": "toggle-reset-section-btn", children: isResetSectionOpen ? "Hide" : "Reset Initial Password" })] }), isResetSectionOpen && (_jsxs("div", { className: "mt-3 pt-3 border-top", children: [resetSuccess && (_jsxs("div", { className: "alert alert-success py-2 px-3 mb-2 small", role: "alert", "data-testid": "reset-password-success", children: ["\u2713 ", resetSuccess] })), resetError && (_jsx("div", { className: "alert alert-danger py-2 px-3 mb-2 small", role: "alert", "data-testid": "reset-password-error", children: resetError })), _jsxs("div", { className: "mb-2", children: [_jsx("label", { htmlFor: "reset-password-input", className: "form-label small fw-semibold", children: "New Initial Password" }), _jsxs("div", { className: "input-group", children: [_jsx("input", { id: "reset-password-input", type: showResetPassword ? "text" : "password", className: "form-control", placeholder: "Enter new temporary password", value: resetPasswordInput, onChange: (e) => setResetPasswordInput(e.target.value), "data-testid": "reset-password-input" }), _jsx("button", { type: "button", className: "btn btn-outline-secondary", onClick: () => setShowResetPassword((prev) => !prev), "data-testid": "toggle-reset-password", children: showResetPassword ? "🙈" : "👁" })] })] }), _jsx("div", { className: "p-2 rounded bg-light border mb-2 small", children: _jsxs("ul", { className: "list-unstyled mb-0 ps-1", style: { fontSize: "0.75rem" }, children: [_jsxs("li", { className: resetPasswordCheck.isLengthValid ? "text-success" : "text-muted", children: [resetPasswordCheck.isLengthValid ? "✓" : "○", " 8\u2013128 characters"] }), _jsxs("li", { className: resetPasswordCheck.isCasesValid ? "text-success" : "text-muted", children: [resetPasswordCheck.isCasesValid ? "✓" : "○", " Both uppercase and lowercase letters"] }), _jsxs("li", { className: resetPasswordCheck.isSpecialValid ? "text-success" : "text-muted", children: [resetPasswordCheck.isSpecialValid ? "✓" : "○", " At least one number and special character"] })] }) }), _jsx("button", { type: "button", className: "btn btn-sm btn-outline-success w-100", onClick: handleSubmitResetPassword, disabled: !resetPasswordCheck.isValid || isSubmittingReset, "data-testid": "submit-reset-password-btn", children: isSubmittingReset ? "Updating Password..." : "Update Password" })] }))] }), _jsxs("div", { className: "d-flex justify-content-between align-items-center pt-2 border-top", children: [_jsx("div", { children: editingUser.isActive ? (_jsx("button", { type: "button", className: "btn btn-outline-danger btn-sm", onClick: handleToggleActiveClick, disabled: isEditingSelf || isEditingSoleActiveAdmin, title: isEditingSelf
                                                    ? "You cannot deactivate your own account"
                                                    : isEditingSoleActiveAdmin
                                                        ? "Cannot deactivate the sole active administrator"
                                                        : undefined, "data-testid": "toggle-status-btn", children: "Deactivate User" })) : (_jsx("button", { type: "button", className: "btn btn-outline-success btn-sm", onClick: handleToggleActiveClick, "data-testid": "toggle-status-btn", children: "Activate User" })) }), _jsxs("div", { className: "d-flex gap-2", children: [_jsx("button", { type: "button", className: "btn btn-outline-secondary btn-sm", onClick: handleCloseEdit, disabled: isSubmittingEdit, "data-testid": "cancel-edit-btn", children: "Cancel" }), _jsx("button", { type: "submit", className: "btn btn-zen-primary btn-sm", disabled: !isEditFormValid || isSubmittingEdit, "data-testid": "submit-edit-btn", children: isSubmittingEdit ? "Saving..." : "Save User" })] })] })] })] }) })), deactivateConfirmTarget && (_jsx("div", { className: "modal-backdrop-custom d-flex justify-content-center align-items-center", style: {
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    backgroundColor: "rgba(26, 46, 36, 0.6)",
                    zIndex: 1060,
                    padding: "1rem",
                }, role: "dialog", "aria-modal": "true", "aria-labelledby": "deactivate-modal-title", "data-testid": "deactivate-confirm-modal", children: _jsxs("div", { className: "zen-card p-4 w-100 shadow-lg", style: { maxWidth: 460 }, children: [_jsxs("div", { className: "text-center mb-3", children: [_jsx("div", { style: { fontSize: "2.5rem" }, className: "mb-2", children: "\u26A0\uFE0F" }), _jsx("h2", { className: "h5 fw-bold mb-2 text-danger", id: "deactivate-modal-title", children: "Deactivate User Account" }), _jsxs("p", { className: "text-muted small mb-0", children: ["Are you sure you want to deactivate ", _jsx("strong", { children: deactivateConfirmTarget.displayName }), "? Inactive users cannot log in to TokTickIT, and all their active sessions will be terminated immediately."] })] }), _jsxs("div", { className: "d-flex justify-content-center gap-2 pt-3 border-top", children: [_jsx("button", { type: "button", className: "btn btn-secondary btn-sm", onClick: () => setDeactivateConfirmTarget(null), "data-testid": "cancel-deactivate-btn", children: "Cancel" }), _jsx("button", { type: "button", className: "btn btn-danger btn-sm", onClick: handleConfirmDeactivate, "data-testid": "confirm-deactivate-btn", children: "Confirm Deactivation" })] })] }) }))] }));
}
