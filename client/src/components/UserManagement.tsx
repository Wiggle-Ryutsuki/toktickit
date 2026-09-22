import React, { useState, useEffect, useCallback, useContext } from "react";
import { AuthContext } from "../context/AuthContext.js";
import {
  getAdminUsersApi,
  createAdminUserApi,
  updateAdminUserApi,
  resetUserPasswordApi,
  AdminUserDto,
  CreateAdminUserPayload,
  UpdateAdminUserPayload,
} from "../api.js";

const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

export interface UserManagementProps {
  onNavigate?: (view: any) => void;
}

export default function UserManagement({ onNavigate }: UserManagementProps) {
  const auth = useContext(AuthContext);

  // Authorization check
  const isAuthorized = auth?.user?.role === "ADMINISTRATOR";

  // Search & Filter State
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Data & Lifecycle State
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<AdminUserDto | null>(null);
  const [deactivateConfirmTarget, setDeactivateConfirmTarget] = useState<AdminUserDto | null>(null);

  // Create Form State
  const [createName, setCreateName] = useState<string>("");
  const [createEmail, setCreateEmail] = useState<string>("");
  const [createRole, setCreateRole] = useState<"REQUESTER" | "IT_STAFF" | "ADMINISTRATOR">("REQUESTER");
  const [createIsActive, setCreateIsActive] = useState<boolean>(true);
  const [createPassword, setCreatePassword] = useState<string>("");
  const [showCreatePassword, setShowCreatePassword] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);

  // Edit Form State
  const [editName, setEditName] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editRole, setEditRole] = useState<"REQUESTER" | "IT_STAFF" | "ADMINISTRATOR">("REQUESTER");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);

  // Password Reset Section within Edit Modal
  const [isResetSectionOpen, setIsResetSectionOpen] = useState<boolean>(false);
  const [resetPasswordInput, setResetPasswordInput] = useState<string>("");
  const [showResetPassword, setShowResetPassword] = useState<boolean>(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [isSubmittingReset, setIsSubmittingReset] = useState<boolean>(false);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    if (!isAuthorized) return;
    setIsLoading(true);
    setApiError(null);
    try {
      const data = await getAdminUsersApi({
        search: debouncedSearch || undefined,
        role: roleFilter !== "ALL" ? roleFilter : undefined,
      });
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setApiError(err?.message || "Failed to load user directory.");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthorized, debouncedSearch, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Active Admin Count (used for Last Active Admin protection)
  const activeAdminCount = users.filter(
    (u) => u.role === "ADMINISTRATOR" && u.isActive
  ).length;

  // Password Validation Helpers
  const validatePasswordComplexity = (pw: string) => {
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
  const isCreateFormValid =
    createName.trim().length >= 2 &&
    createName.trim().length <= 100 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createEmail.trim()) &&
    createPasswordCheck.isValid;

  // Edit Form Validity
  const isEditFormValid =
    editName.trim().length >= 2 &&
    editName.trim().length <= 100 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail.trim());

  // Handle Open Edit Modal
  const handleOpenEdit = (user: AdminUserDto) => {
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
  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCreateFormValid || isSubmittingCreate) return;

    setCreateError(null);
    setIsSubmittingCreate(true);
    try {
      const payload: CreateAdminUserPayload = {
        displayName: createName.trim(),
        email: createEmail.trim(),
        role: createRole,
        isActive: createIsActive,
        initialPassword: createPassword,
      };
      await createAdminUserApi(payload);
      handleCloseCreate();
      await fetchUsers();
    } catch (err: any) {
      if (err?.code === "DUPLICATE_EMAIL" || err?.status === 409) {
        setCreateError("A user with this email address already exists.");
      } else {
        setCreateError(err?.message || "Failed to create user account.");
      }
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Submit Edit User
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !isEditFormValid || isSubmittingEdit) return;

    setEditError(null);
    setIsSubmittingEdit(true);
    try {
      const payload: UpdateAdminUserPayload = {};
      if (editName.trim() !== editingUser.displayName) payload.displayName = editName.trim();
      if (editEmail.trim() !== editingUser.email) payload.email = editEmail.trim();
      if (editRole !== editingUser.role) payload.role = editRole;

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
    } catch (err: any) {
      if (err?.code === "DUPLICATE_EMAIL" || err?.status === 409) {
        setEditError("A user with this email address already exists.");
      } else if (err?.code === "LAST_ADMIN_PROTECTION") {
        setEditError("Cannot deactivate or re-role the only active Administrator in the system.");
      } else if (err?.code === "SELF_DEACTIVATION_PROHIBITED") {
        setEditError("You cannot deactivate your own active Administrator account.");
      } else {
        setEditError(err?.message || "Failed to update user account.");
      }
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Toggle User Active Status (Activation or Deactivation prompt)
  const handleToggleActiveClick = () => {
    if (!editingUser) return;

    if (editingUser.isActive) {
      // Prompt confirmation before deactivating
      setDeactivateConfirmTarget(editingUser);
    } else {
      // Reactivate directly
      handleConfirmReactivate(editingUser);
    }
  };

  const handleConfirmReactivate = async (targetUser: AdminUserDto) => {
    setEditError(null);
    try {
      await updateAdminUserApi(targetUser.id, { isActive: true });
      handleCloseEdit();
      await fetchUsers();
    } catch (err: any) {
      setEditError(err?.message || "Failed to activate user.");
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateConfirmTarget) return;
    setEditError(null);
    try {
      await updateAdminUserApi(deactivateConfirmTarget.id, { isActive: false });
      setDeactivateConfirmTarget(null);
      handleCloseEdit();
      await fetchUsers();
    } catch (err: any) {
      setDeactivateConfirmTarget(null);
      if (err?.code === "SELF_DEACTIVATION_PROHIBITED") {
        setEditError("You cannot deactivate your own active Administrator account.");
      } else if (err?.code === "LAST_ADMIN_PROTECTION") {
        setEditError("Cannot deactivate or re-role the only active Administrator in the system.");
      } else {
        setEditError(err?.message || "Failed to deactivate user.");
      }
    }
  };

  // Submit Password Reset
  const handleSubmitResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !resetPasswordCheck.isValid || isSubmittingReset) return;

    setResetError(null);
    setResetSuccess(null);
    setIsSubmittingReset(true);
    try {
      await resetUserPasswordApi(editingUser.id, {
        initialPassword: resetPasswordInput,
      });
      setResetSuccess(
        "Initial password successfully updated. User must change password at next login."
      );
      setResetPasswordInput("");
      // Update local state to reflect mustChangePassword = true
      setEditingUser({ ...editingUser, mustChangePassword: true });
      await fetchUsers();
    } catch (err: any) {
      setResetError(err?.message || "Failed to reset password.");
    } finally {
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
  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "ADMINISTRATOR":
        return "badge-role-admin";
      case "IT_STAFF":
        return "badge-role-staff";
      default:
        return "badge-role-requester";
    }
  };

  const getRoleLabel = (role: string) => {
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
    return (
      <main
        className="container-fluid py-5 px-lg-5 flex-grow-1"
        style={{ maxWidth: 1280 }}
        data-testid="forbidden-state"
      >
        <div className="zen-card text-center p-5 mx-auto" style={{ maxWidth: 560 }}>
          <div style={{ fontSize: "3.5rem" }} className="mb-3">
            🚫
          </div>
          <h1 className="h4 fw-bold mb-2 text-danger">Access Denied</h1>
          <p className="text-muted mb-4">
            Access Denied. You do not have permission to access User Management.
          </p>
          <div>
            <button
              type="button"
              className="btn btn-zen-primary"
              onClick={() =>
                onNavigate ? onNavigate(auth?.user?.role === "IT_STAFF" ? "queue" : "tickets") : undefined
              }
              data-testid="go-back-btn"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </main>
    );
  }

  const hasActiveFilters = Boolean(searchInput.trim()) || roleFilter !== "ALL";

  // Calculate safety restrictions for editing user
  const isEditingSelf = editingUser ? auth?.user?.id === editingUser.id : false;
  const isEditingSoleActiveAdmin =
    editingUser?.role === "ADMINISTRATOR" && editingUser?.isActive && activeAdminCount <= 1;

  return (
    <main className="container-fluid py-4 px-lg-5 flex-grow-1" style={{ maxWidth: 1280 }}>
      {/* 1. Header Bar */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1" style={{ color: "var(--color-primary-green)" }}>
            User Management
          </h1>
          <p className="text-muted small mb-0" data-testid="user-count">
            {isLoading
              ? "Loading user accounts..."
              : users.length > 0
              ? `Showing ${users.length} user account${users.length === 1 ? "" : "s"}`
              : "Showing 0 user accounts"}
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
            onClick={() => fetchUsers()}
            disabled={isLoading}
            aria-label="Refresh user list"
            data-testid="refresh-users-btn"
          >
            <span style={{ fontSize: "1rem" }}>🔄</span>
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="btn btn-zen-primary d-inline-flex align-items-center gap-2"
            onClick={handleOpenCreate}
            data-testid="create-user-btn"
          >
            <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>➕</span>
            <span>Create User</span>
          </button>
        </div>
      </div>

      {/* 2. Search & Role Filter Toolbar */}
      <div className="zen-card p-3 mb-4">
        <div className="row g-2 align-items-center">
          {/* Search Input */}
          <div className="col-12 col-md-6 col-lg-5">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted">🔍</span>
              <input
                type="text"
                className="form-control border-start-0 ps-0"
                placeholder="Search users by name or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Search users by name or email"
                data-testid="search-user-input"
              />
            </div>
          </div>

          {/* Role Filter Dropdown */}
          <div className="col-12 col-md-4 col-lg-3">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted small">Role:</span>
              <select
                className="form-select border-start-0 ps-2"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                aria-label="Filter users by role"
                data-testid="role-filter-select"
              >
                <option value="ALL">All Roles</option>
                <option value="REQUESTER">Requester</option>
                <option value="IT_STAFF">IT Staff</option>
                <option value="ADMINISTRATOR">Administrator</option>
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <div className="col-12 col-md-2 col-lg-2">
              <button
                type="button"
                className="btn btn-outline-secondary w-100"
                onClick={handleClearFilters}
                data-testid="clear-filters-btn"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. API Error State */}
      {apiError && (
        <div
          className="alert alert-danger d-flex align-items-center justify-content-between p-3 mb-4"
          role="alert"
          data-testid="api-error-state"
        >
          <div>
            <strong>Unable to load users.</strong> {apiError}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => fetchUsers()}
            data-testid="retry-btn"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4. Loading Skeleton */}
      {isLoading && (
        <div className="zen-card p-4 mb-4" data-testid="loading-skeleton">
          <div className="d-flex flex-column gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="zen-skeleton-bar w-100" style={{ height: "2.5rem" }} />
            ))}
          </div>
        </div>
      )}

      {/* 5. Main Content Area */}
      {!isLoading && !apiError && (
        <>
          {/* Zero Results Matching Filter State */}
          {users.length === 0 && (
            <div className="zen-card text-center p-5 mb-4" data-testid="no-results-state">
              <div style={{ fontSize: "3.5rem" }} className="mb-2">
                👥
              </div>
              <h2 className="h5 fw-bold mb-2">No user accounts found.</h2>
              <p className="text-muted small mb-4 mx-auto" style={{ maxWidth: 460 }}>
                {hasActiveFilters
                  ? "No user accounts match your search criteria. Try clearing filters."
                  : "There are currently no user accounts in the directory."}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  className="btn btn-zen-primary"
                  onClick={handleClearFilters}
                  data-testid="no-results-clear-btn"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {/* Populated User Table (>=768px) */}
          {users.length > 0 && (
            <>
              <div className="d-none d-md-block zen-table-container mb-4 table-responsive">
                <table
                  className="zen-table table align-middle"
                  data-testid="user-management-table"
                >
                  <thead>
                    <tr>
                      <th style={{ width: "25%" }}>NAME</th>
                      <th style={{ width: "30%" }}>EMAIL</th>
                      <th style={{ width: "15%" }}>ROLE</th>
                      <th style={{ width: "15%" }}>STATUS</th>
                      <th className="text-end" style={{ width: "15%" }}>
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} data-testid={`user-row-${u.id}`}>
                        {/* Name */}
                        <td>
                          <span
                            className="fw-semibold text-dark"
                            data-testid={`user-name-${u.id}`}
                          >
                            {u.displayName}
                          </span>
                        </td>

                        {/* Email */}
                        <td>
                          <span
                            className="text-muted font-monospace small"
                            data-testid={`user-email-${u.id}`}
                          >
                            {u.email}
                          </span>
                        </td>

                        {/* Role */}
                        <td>
                          <span
                            className={`badge ${getRoleBadgeClass(u.role)}`}
                            data-testid={`user-role-${u.id}`}
                          >
                            {getRoleLabel(u.role)}
                          </span>
                        </td>

                        {/* Status */}
                        <td>
                          <span
                            className={`badge ${
                              u.isActive ? "badge-status-active" : "badge-status-inactive"
                            }`}
                            data-testid={`user-status-${u.id}`}
                          >
                            {u.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => handleOpenEdit(u)}
                            data-testid={`edit-user-btn-${u.id}`}
                            aria-label={`Edit user ${u.displayName}`}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List (<768px) */}
              <div className="d-md-none d-flex flex-column gap-3 mb-4">
                {users.map((u) => (
                  <div key={u.id} className="zen-card p-3 shadow-sm">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <h6 className="fw-bold mb-1">{u.displayName}</h6>
                        <div className="text-muted small font-monospace">{u.email}</div>
                      </div>
                      <span
                        className={`badge ${
                          u.isActive ? "badge-status-active" : "badge-status-inactive"
                        }`}
                      >
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                      <span className={`badge ${getRoleBadgeClass(u.role)}`}>
                        {getRoleLabel(u.role)}
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => handleOpenEdit(u)}
                        data-testid={`mobile-edit-user-btn-${u.id}`}
                      >
                        Edit User
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/* 6. CREATE USER MODAL DIALOG                                  */}
      {/* ============================================================ */}
      {isCreateModalOpen && (
        <div
          className="modal-backdrop-custom d-flex justify-content-center align-items-center"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(26, 46, 36, 0.5)",
            zIndex: 1050,
            padding: "1rem",
            overflowY: "auto",
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-user-modal-title"
          data-testid="create-user-modal"
        >
          <div className="zen-card p-4 w-100 shadow-lg" style={{ maxWidth: 540 }}>
            {/* Modal Header */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h5 fw-bold mb-0" id="create-user-modal-title">
                Create New User
              </h2>
              <button
                type="button"
                className="btn-close"
                onClick={handleCloseCreate}
                aria-label="Close modal"
                data-testid="close-create-modal"
              />
            </div>

            {/* Error Alert */}
            {createError && (
              <div
                className="alert alert-danger py-2 px-3 mb-3 small"
                role="alert"
                data-testid="create-error-alert"
              >
                {createError}
              </div>
            )}

            <form onSubmit={handleSubmitCreate}>
              {/* Full Name */}
              <div className="mb-3">
                <label htmlFor="create-name" className="form-label fw-semibold small">
                  Full Name <span className="text-danger">*</span>
                </label>
                <input
                  id="create-name"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Somchai Jaidee"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                  data-testid="create-name-input"
                />
              </div>

              {/* Email Address */}
              <div className="mb-3">
                <label htmlFor="create-email" className="form-label fw-semibold small">
                  Email Address <span className="text-danger">*</span>
                </label>
                <input
                  id="create-email"
                  type="email"
                  className="form-control"
                  placeholder="e.g. somchai.jai@kmutt.ac.th"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  required
                  data-testid="create-email-input"
                />
              </div>

              {/* Role Select */}
              <div className="mb-3">
                <label htmlFor="create-role" className="form-label fw-semibold small">
                  Role <span className="text-danger">*</span>
                </label>
                <select
                  id="create-role"
                  className="form-select"
                  value={createRole}
                  onChange={(e) =>
                    setCreateRole(e.target.value as "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR")
                  }
                  required
                  data-testid="create-role-select"
                >
                  <option value="REQUESTER">Requester</option>
                  <option value="IT_STAFF">IT Staff</option>
                  <option value="ADMINISTRATOR">Administrator</option>
                </select>
              </div>

              {/* Active Status Checkbox */}
              <div className="mb-3 form-check">
                <input
                  id="create-active"
                  type="checkbox"
                  className="form-check-input"
                  checked={createIsActive}
                  onChange={(e) => setCreateIsActive(e.target.checked)}
                  data-testid="create-active-toggle"
                />
                <label htmlFor="create-active" className="form-check-label small fw-semibold">
                  Active account
                </label>
              </div>

              {/* Initial Password */}
              <div className="mb-3">
                <label htmlFor="create-password" className="form-label fw-semibold small">
                  Initial Password <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <input
                    id="create-password"
                    type={showCreatePassword ? "text" : "password"}
                    className="form-control"
                    placeholder="Enter initial temporary password"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    required
                    data-testid="create-password-input"
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowCreatePassword((prev) => !prev)}
                    aria-label={showCreatePassword ? "Hide password" : "Show password"}
                    data-testid="toggle-create-password"
                  >
                    {showCreatePassword ? "🙈" : "👁"}
                  </button>
                </div>
                <div className="text-muted small mt-1">
                  ℹ User will be forced to change this password on their next login.
                </div>

                {/* Password Checklist */}
                <div className="p-2 rounded bg-light border mt-2 small">
                  <div className="fw-semibold mb-1" style={{ fontSize: "0.78rem" }}>
                    Password Complexity Checklist:
                  </div>
                  <ul className="list-unstyled mb-0 ps-1" style={{ fontSize: "0.75rem" }}>
                    <li className={createPasswordCheck.isLengthValid ? "text-success" : "text-muted"}>
                      {createPasswordCheck.isLengthValid ? "✓" : "○"} 8–128 characters
                    </li>
                    <li className={createPasswordCheck.isCasesValid ? "text-success" : "text-muted"}>
                      {createPasswordCheck.isCasesValid ? "✓" : "○"} Both uppercase and lowercase letters
                    </li>
                    <li className={createPasswordCheck.isSpecialValid ? "text-success" : "text-muted"}>
                      {createPasswordCheck.isSpecialValid ? "✓" : "○"} At least one number and special character
                    </li>
                  </ul>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="d-flex justify-content-end gap-2 pt-2 border-top">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleCloseCreate}
                  disabled={isSubmittingCreate}
                  data-testid="cancel-create-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-zen-primary"
                  disabled={!isCreateFormValid || isSubmittingCreate}
                  data-testid="submit-create-btn"
                >
                  {isSubmittingCreate ? "Saving..." : "Save User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. EDIT USER MODAL DIALOG                                    */}
      {/* ============================================================ */}
      {editingUser && (
        <div
          className="modal-backdrop-custom d-flex justify-content-center align-items-center"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(26, 46, 36, 0.5)",
            zIndex: 1050,
            padding: "1rem",
            overflowY: "auto",
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-user-modal-title"
          data-testid="edit-user-modal"
        >
          <div className="zen-card p-4 w-100 shadow-lg" style={{ maxWidth: 580 }}>
            {/* Modal Header */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h5 fw-bold mb-0" id="edit-user-modal-title">
                Edit User: {editingUser.displayName}
              </h2>
              <button
                type="button"
                className="btn-close"
                onClick={handleCloseEdit}
                aria-label="Close modal"
                data-testid="close-edit-modal"
              />
            </div>

            {/* Safety Alert Warnings */}
            {isEditingSelf && (
              <div
                className="alert alert-warning py-2 px-3 mb-3 small"
                role="alert"
                data-testid="safety-alert"
              >
                ⚠️ You cannot deactivate your own active Administrator account.
              </div>
            )}

            {!isEditingSelf && isEditingSoleActiveAdmin && (
              <div
                className="alert alert-warning py-2 px-3 mb-3 small"
                role="alert"
                data-testid="safety-alert"
              >
                ⚠️ Cannot deactivate or re-role the only active Administrator in the system.
              </div>
            )}

            {/* Error Alert */}
            {editError && (
              <div
                className="alert alert-danger py-2 px-3 mb-3 small"
                role="alert"
                data-testid="edit-error-alert"
              >
                {editError}
              </div>
            )}

            <form onSubmit={handleSubmitEdit}>
              {/* Full Name */}
              <div className="mb-3">
                <label htmlFor="edit-name" className="form-label fw-semibold small">
                  Full Name <span className="text-danger">*</span>
                </label>
                <input
                  id="edit-name"
                  type="text"
                  className="form-control"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  data-testid="edit-name-input"
                />
              </div>

              {/* Email Address */}
              <div className="mb-3">
                <label htmlFor="edit-email" className="form-label fw-semibold small">
                  Email Address <span className="text-danger">*</span>
                </label>
                <input
                  id="edit-email"
                  type="email"
                  className="form-control"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                  data-testid="edit-email-input"
                />
              </div>

              {/* Role Select */}
              <div className="mb-3">
                <label htmlFor="edit-role" className="form-label fw-semibold small">
                  Role <span className="text-danger">*</span>
                </label>
                <select
                  id="edit-role"
                  className="form-select"
                  value={editRole}
                  onChange={(e) =>
                    setEditRole(e.target.value as "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR")
                  }
                  required
                  disabled={isEditingSoleActiveAdmin}
                  data-testid="edit-role-select"
                >
                  <option value="REQUESTER" disabled={isEditingSoleActiveAdmin}>
                    Requester
                  </option>
                  <option value="IT_STAFF" disabled={isEditingSoleActiveAdmin}>
                    IT Staff
                  </option>
                  <option value="ADMINISTRATOR">Administrator</option>
                </select>
                {isEditingSoleActiveAdmin && (
                  <div className="text-muted small mt-1">
                    Role change locked: Only active Administrator.
                  </div>
                )}
              </div>

              {/* Account Status Info */}
              <div className="mb-3 d-flex align-items-center justify-content-between p-2 bg-light rounded border">
                <div>
                  <div className="small fw-semibold">Account Status</div>
                  <div className="text-muted small">
                    {editingUser.isActive
                      ? "User can log in and submit tickets."
                      : "Account deactivated. Login is blocked."}
                  </div>
                </div>
                <div>
                  <span
                    className={`badge ${
                      editingUser.isActive ? "badge-status-active" : "badge-status-inactive"
                    }`}
                  >
                    {editingUser.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {/* CREDENTIAL MANAGEMENT / RESET INITIAL PASSWORD */}
              <div className="mb-4 zen-card p-3 border" data-testid="reset-password-section">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="fw-bold mb-0 small">Credential Management</h6>
                    <div className="text-muted small" style={{ fontSize: "0.75rem" }}>
                      Set a new initial password requiring change on next login.
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                      setIsResetSectionOpen((prev) => !prev);
                      setResetError(null);
                      setResetSuccess(null);
                      setResetPasswordInput("");
                    }}
                    data-testid="toggle-reset-section-btn"
                  >
                    {isResetSectionOpen ? "Hide" : "Reset Initial Password"}
                  </button>
                </div>

                {isResetSectionOpen && (
                  <div className="mt-3 pt-3 border-top">
                    {resetSuccess && (
                      <div
                        className="alert alert-success py-2 px-3 mb-2 small"
                        role="alert"
                        data-testid="reset-password-success"
                      >
                        ✓ {resetSuccess}
                      </div>
                    )}
                    {resetError && (
                      <div
                        className="alert alert-danger py-2 px-3 mb-2 small"
                        role="alert"
                        data-testid="reset-password-error"
                      >
                        {resetError}
                      </div>
                    )}

                    <div className="mb-2">
                      <label htmlFor="reset-password-input" className="form-label small fw-semibold">
                        New Initial Password
                      </label>
                      <div className="input-group">
                        <input
                          id="reset-password-input"
                          type={showResetPassword ? "text" : "password"}
                          className="form-control"
                          placeholder="Enter new temporary password"
                          value={resetPasswordInput}
                          onChange={(e) => setResetPasswordInput(e.target.value)}
                          data-testid="reset-password-input"
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setShowResetPassword((prev) => !prev)}
                          data-testid="toggle-reset-password"
                        >
                          {showResetPassword ? "🙈" : "👁"}
                        </button>
                      </div>
                    </div>

                    {/* Reset Password Checklist */}
                    <div className="p-2 rounded bg-light border mb-2 small">
                      <ul className="list-unstyled mb-0 ps-1" style={{ fontSize: "0.75rem" }}>
                        <li className={resetPasswordCheck.isLengthValid ? "text-success" : "text-muted"}>
                          {resetPasswordCheck.isLengthValid ? "✓" : "○"} 8–128 characters
                        </li>
                        <li className={resetPasswordCheck.isCasesValid ? "text-success" : "text-muted"}>
                          {resetPasswordCheck.isCasesValid ? "✓" : "○"} Both uppercase and lowercase letters
                        </li>
                        <li className={resetPasswordCheck.isSpecialValid ? "text-success" : "text-muted"}>
                          {resetPasswordCheck.isSpecialValid ? "✓" : "○"} At least one number and special character
                        </li>
                      </ul>
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success w-100"
                      onClick={handleSubmitResetPassword}
                      disabled={!resetPasswordCheck.isValid || isSubmittingReset}
                      data-testid="submit-reset-password-btn"
                    >
                      {isSubmittingReset ? "Updating Password..." : "Update Password"}
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                {/* Left: Deactivate / Activate Button */}
                <div>
                  {editingUser.isActive ? (
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={handleToggleActiveClick}
                      disabled={isEditingSelf || isEditingSoleActiveAdmin}
                      title={
                        isEditingSelf
                          ? "You cannot deactivate your own account"
                          : isEditingSoleActiveAdmin
                          ? "Cannot deactivate the sole active administrator"
                          : undefined
                      }
                      data-testid="toggle-status-btn"
                    >
                      Deactivate User
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline-success btn-sm"
                      onClick={handleToggleActiveClick}
                      data-testid="toggle-status-btn"
                    >
                      Activate User
                    </button>
                  )}
                </div>

                {/* Right: Cancel & Save */}
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={handleCloseEdit}
                    disabled={isSubmittingEdit}
                    data-testid="cancel-edit-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-zen-primary btn-sm"
                    disabled={!isEditFormValid || isSubmittingEdit}
                    data-testid="submit-edit-btn"
                  >
                    {isSubmittingEdit ? "Saving..." : "Save User"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 8. DEACTIVATE CONFIRMATION MODAL                             */}
      {/* ============================================================ */}
      {deactivateConfirmTarget && (
        <div
          className="modal-backdrop-custom d-flex justify-content-center align-items-center"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(26, 46, 36, 0.6)",
            zIndex: 1060,
            padding: "1rem",
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="deactivate-modal-title"
          data-testid="deactivate-confirm-modal"
        >
          <div className="zen-card p-4 w-100 shadow-lg" style={{ maxWidth: 460 }}>
            <div className="text-center mb-3">
              <div style={{ fontSize: "2.5rem" }} className="mb-2">
                ⚠️
              </div>
              <h2 className="h5 fw-bold mb-2 text-danger" id="deactivate-modal-title">
                Deactivate User Account
              </h2>
              <p className="text-muted small mb-0">
                Are you sure you want to deactivate <strong>{deactivateConfirmTarget.displayName}</strong>?
                Inactive users cannot log in to TokTickIT, and all their active sessions will be terminated immediately.
              </p>
            </div>

            <div className="d-flex justify-content-center gap-2 pt-3 border-top">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setDeactivateConfirmTarget(null)}
                data-testid="cancel-deactivate-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleConfirmDeactivate}
                data-testid="confirm-deactivate-btn"
              >
                Confirm Deactivation
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
