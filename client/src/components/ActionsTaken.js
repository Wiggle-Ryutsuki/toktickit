import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useContext, useRef } from "react";
import { AuthContext } from "../context/AuthContext.js";
import { getTicketActionsApi, createTicketActionApi, updateTicketActionApi, getStaffAssigneesApi, } from "../api.js";
function formatActionDateTime(isoString) {
    if (!isoString)
        return "—";
    try {
        const d = new Date(isoString);
        return d.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    }
    catch {
        return isoString;
    }
}
function getStatusBadgeConfig(status) {
    switch (status) {
        case "PLANNED":
            return {
                badgeClass: "badge bg-light text-dark border",
                icon: "⏱️",
                label: "Planned",
            };
        case "IN_PROGRESS":
            return {
                badgeClass: "badge bg-info-subtle text-info-emphasis border border-info-subtle",
                icon: "⚡",
                label: "In Progress",
            };
        case "COMPLETED":
            return {
                badgeClass: "badge bg-success-subtle text-success-emphasis border border-success-subtle",
                icon: "✓",
                label: "Completed",
            };
        case "CANCELLED":
            return {
                badgeClass: "badge bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle",
                icon: "✕",
                label: "Cancelled",
            };
        default:
            return {
                badgeClass: "badge bg-light text-dark border",
                icon: "⏱️",
                label: status,
            };
    }
}
export default function ActionsTaken({ ticketId, isReadOnly = false }) {
    const auth = useContext(AuthContext);
    const canManage = !isReadOnly && auth?.user?.role !== "REQUESTER";
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    // Staff assignees list for select dropdown
    const [staffList, setStaffList] = useState([]);
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create");
    const [editingAction, setEditingAction] = useState(null);
    // Form field states
    const [description, setDescription] = useState("");
    const [result, setResult] = useState("");
    const [status, setStatus] = useState("PLANNED");
    const [assigneeId, setAssigneeId] = useState("");
    const [isFollowUpRequired, setIsFollowUpRequired] = useState(false);
    const [followUpNote, setFollowUpNote] = useState("");
    const [attachmentNotes, setAttachmentNotes] = useState("");
    const [actionDateTime, setActionDateTime] = useState("");
    // Validation & async submission states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    const [modalError, setModalError] = useState(null);
    // Focus management refs
    const descriptionInputRef = useRef(null);
    const triggerButtonRef = useRef(null);
    // Load staff assignees
    const loadStaffAssignees = useCallback(async () => {
        try {
            const data = await getStaffAssigneesApi();
            setStaffList(data);
        }
        catch {
            // Non-fatal if staff cannot be fetched immediately
        }
    }, []);
    // Fetch actions for ticket
    const fetchActions = useCallback(async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const data = await getTicketActionsApi(ticketId);
            // Deterministically sort by actionDateTime ascending, then id ascending (BR-16)
            const sorted = [...data].sort((a, b) => {
                const timeDiff = new Date(a.actionDateTime).getTime() - new Date(b.actionDateTime).getTime();
                if (timeDiff !== 0)
                    return timeDiff;
                return a.id - b.id;
            });
            setActions(sorted);
        }
        catch (err) {
            setFetchError(err.message || "Failed to load Actions Taken.");
        }
        finally {
            setLoading(false);
        }
    }, [ticketId]);
    useEffect(() => {
        fetchActions();
    }, [fetchActions]);
    // Open Create Modal
    const handleOpenCreateModal = (e) => {
        if (e?.currentTarget) {
            triggerButtonRef.current = e.currentTarget;
        }
        setModalMode("create");
        setEditingAction(null);
        setDescription("");
        setResult("");
        setStatus("PLANNED");
        setAssigneeId("");
        setIsFollowUpRequired(false);
        setFollowUpNote("");
        setAttachmentNotes("");
        // Default to current local time formatted for datetime-local
        const now = new Date();
        const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        setActionDateTime(localIso);
        setFormErrors({});
        setModalError(null);
        setIsModalOpen(true);
        loadStaffAssignees();
    };
    // Open Edit Modal
    const handleOpenEditModal = (action, e) => {
        if (e?.currentTarget) {
            triggerButtonRef.current = e.currentTarget;
        }
        setModalMode("edit");
        setEditingAction(action);
        setDescription(action.description);
        setResult(action.result || "");
        setStatus(action.status);
        setAssigneeId(action.assignee ? String(action.assignee.id) : "");
        setIsFollowUpRequired(action.isFollowUpRequired);
        setFollowUpNote(action.followUpNote || "");
        setAttachmentNotes(action.attachmentNotes || "");
        if (action.actionDateTime) {
            const dt = new Date(action.actionDateTime);
            const localIso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16);
            setActionDateTime(localIso);
        }
        else {
            setActionDateTime("");
        }
        setFormErrors({});
        setModalError(null);
        setIsModalOpen(true);
        loadStaffAssignees();
    };
    // Close Modal
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingAction(null);
        setFormErrors({});
        setModalError(null);
        if (triggerButtonRef.current) {
            triggerButtonRef.current.focus();
        }
    };
    // Focus trap and autofocus on modal open
    useEffect(() => {
        if (isModalOpen) {
            setTimeout(() => {
                descriptionInputRef.current?.focus();
            }, 50);
            const handleKeyDown = (e) => {
                if (e.key === "Escape") {
                    handleCloseModal();
                }
            };
            window.addEventListener("keydown", handleKeyDown);
            return () => window.removeEventListener("keydown", handleKeyDown);
        }
    }, [isModalOpen]);
    // Dynamic Follow-Up Checkbox toggle handler (BR-05, FR-41)
    const handleFollowUpCheckboxChange = (e) => {
        const checked = e.target.checked;
        setIsFollowUpRequired(checked);
        if (!checked) {
            setFollowUpNote("");
            setFormErrors((prev) => {
                const updated = { ...prev };
                delete updated.followUpNote;
                return updated;
            });
        }
    };
    // Client-side validation logic (BR-05, FR-41, AC-06)
    const validateForm = () => {
        const errors = {};
        if (!description || description.trim().length < 5) {
            errors.description = "Action description is required (min 5 characters).";
        }
        else if (description.trim().length > 1000) {
            errors.description = "Action description cannot exceed 1000 characters.";
        }
        if (result && result.trim().length > 1000) {
            errors.result = "Action result cannot exceed 1000 characters.";
        }
        if (isFollowUpRequired) {
            if (!followUpNote || followUpNote.trim().length < 3) {
                errors.followUpNote = "Follow-up note is required when follow-up is requested (min 3 characters).";
            }
            else if (followUpNote.trim().length > 500) {
                errors.followUpNote = "Follow-up note cannot exceed 500 characters.";
            }
        }
        if (attachmentNotes && attachmentNotes.trim().length > 255) {
            errors.attachmentNotes = "Attachment notes cannot exceed 255 characters.";
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };
    // Form Submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }
        setIsSubmitting(true);
        setModalError(null);
        const parsedAssigneeId = assigneeId ? parseInt(assigneeId, 10) : null;
        const isoDateTime = actionDateTime ? new Date(actionDateTime).toISOString() : undefined;
        try {
            if (modalMode === "create") {
                const payload = {
                    description: description.trim(),
                    result: result.trim() ? result.trim() : null,
                    status,
                    assigneeId: parsedAssigneeId,
                    isFollowUpRequired,
                    followUpNote: isFollowUpRequired ? followUpNote.trim() : null,
                    attachmentNotes: attachmentNotes.trim() ? attachmentNotes.trim() : null,
                    actionDateTime: isoDateTime,
                };
                const newAction = await createTicketActionApi(ticketId, payload);
                // Immediate update in state without full page reload (AC-03)
                setActions((prev) => [...prev, newAction]);
                handleCloseModal();
            }
            else if (modalMode === "edit" && editingAction) {
                const payload = {
                    description: description.trim(),
                    result: result.trim() ? result.trim() : null,
                    status,
                    assigneeId: parsedAssigneeId,
                    isFollowUpRequired,
                    followUpNote: isFollowUpRequired ? followUpNote.trim() : null,
                    attachmentNotes: attachmentNotes.trim() ? attachmentNotes.trim() : null,
                    version: editingAction.version,
                };
                const updatedAction = await updateTicketActionApi(ticketId, editingAction.id, payload);
                // Immediate update in state without full page reload (AC-03)
                setActions((prev) => prev.map((item) => (item.id === updatedAction.id ? updatedAction : item)));
                handleCloseModal();
            }
        }
        catch (err) {
            if (err.status === 409) {
                setModalError("Action has been updated by another user. Please close and reload.");
            }
            else {
                setModalError(err.message || "Failed to save Action Taken. Please verify inputs.");
            }
        }
        finally {
            setIsSubmitting(false);
        }
    };
    // Check if editing action is in terminal status (BR-17)
    const isEditingTerminal = modalMode === "edit" &&
        editingAction !== null &&
        (editingAction.status === "COMPLETED" || editingAction.status === "CANCELLED");
    return (_jsxs("div", { className: "card border-0 shadow-sm mb-4", id: "actions-taken-container", "data-testid": "actions-taken-section", children: [_jsxs("div", { className: "card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center flex-wrap gap-2", children: [_jsxs("div", { className: "d-flex align-items-center gap-2", children: [_jsx("h5", { className: "fw-bold mb-0 text-dark small text-uppercase", children: "\uD83D\uDCCB Actions Taken" }), _jsxs("span", { className: "badge bg-light text-dark border", "data-testid": "actions-count-badge", children: [actions.length, " ", actions.length === 1 ? "action" : "actions"] })] }), canManage && (_jsxs("button", { type: "button", className: "btn btn-zen-primary btn-sm d-flex align-items-center gap-1", onClick: handleOpenCreateModal, "data-testid": "add-action-btn", children: [_jsx("span", { children: "+" }), _jsx("span", { children: "Add Action Taken" })] }))] }), _jsx("div", { className: "card-body p-0", children: loading ? (_jsxs("div", { className: "text-center py-4 text-muted small", "data-testid": "actions-loading", children: [_jsx("span", { className: "spinner-border spinner-border-sm me-2", role: "status", "aria-hidden": "true" }), "Loading actions taken..."] })) : fetchError ? (_jsx("div", { className: "p-4", children: _jsx("div", { className: "alert alert-danger mb-0 small", role: "alert", "data-testid": "actions-fetch-error", children: fetchError }) })) : actions.length === 0 ? (
                /* Empty State (FR-38, UI-11) */
                _jsxs("div", { className: "p-4 text-center text-muted", "data-testid": "actions-empty-state", children: [_jsx("div", { className: "fs-1 mb-2", children: "\uD83D\uDCCB" }), _jsx("h6", { className: "fw-semibold text-dark mb-1", children: "No actions taken recorded for this ticket yet." }), canManage ? (_jsxs(_Fragment, { children: [_jsx("p", { className: "small mb-3 text-muted", children: "Document diagnostic steps, hardware fixes, or technical actions taken to resolve this ticket." }), _jsx("button", { type: "button", className: "btn btn-zen-outline btn-sm", onClick: handleOpenCreateModal, "data-testid": "add-first-action-btn", children: "+ Add the First Action" })] })) : (_jsx("p", { className: "small mb-0 text-muted", children: "IT Staff have not logged technical action lines for this ticket yet." }))] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "d-none d-md-block table-responsive", children: _jsxs("table", { className: "table table-hover align-middle mb-0", "data-testid": "actions-table", children: [_jsx("thead", { className: "table-light small text-uppercase text-muted", children: _jsxs("tr", { children: [_jsx("th", { scope: "col", style: { width: "16%" }, children: "Date/Time" }), _jsx("th", { scope: "col", style: { width: "32%" }, children: "Description" }), _jsx("th", { scope: "col", style: { width: "18%" }, children: "Result" }), _jsx("th", { scope: "col", style: { width: "12%" }, children: "Status" }), _jsx("th", { scope: "col", style: { width: "12%" }, children: "Performed By" }), _jsx("th", { scope: "col", style: { width: "10%" }, children: "Assignee" }), canManage && (_jsx("th", { scope: "col", className: "text-end", style: { width: "8%" }, children: "Actions" }))] }) }), _jsx("tbody", { className: "small", children: actions.map((action) => {
                                            const badgeConfig = getStatusBadgeConfig(action.status);
                                            return (_jsxs("tr", { "data-testid": `action-row-${action.id}`, children: [_jsx("td", { className: "text-muted text-nowrap", children: formatActionDateTime(action.actionDateTime) }), _jsxs("td", { children: [_jsx("div", { className: "text-dark fw-medium", style: { whiteSpace: "pre-wrap" }, children: action.description }), action.isFollowUpRequired && action.followUpNote && (_jsxs("div", { className: "mt-1 p-1 px-2 rounded bg-warning-subtle border border-warning-subtle small text-dark d-flex align-items-center gap-1", "data-testid": `action-follow-up-${action.id}`, children: [_jsx("span", { "aria-hidden": "true", children: "\u26A0\uFE0F" }), _jsxs("span", { children: [_jsx("strong", { children: "Follow-Up:" }), " ", action.followUpNote, action.attachmentNotes && (_jsxs("span", { className: "text-muted ms-1", children: ["(Ref: ", action.attachmentNotes, ")"] }))] })] })), !action.isFollowUpRequired && action.attachmentNotes && (_jsxs("div", { className: "mt-1 small text-muted", children: [_jsx("span", { className: "fw-medium", children: "Attachment Note:" }), " ", action.attachmentNotes] }))] }), _jsx("td", { className: "text-muted", style: { whiteSpace: "pre-wrap" }, children: action.result ? action.result : "—" }), _jsx("td", { children: _jsxs("span", { className: badgeConfig.badgeClass, "data-testid": `action-status-badge-${action.id}`, children: [_jsx("span", { className: "me-1", "aria-hidden": "true", children: badgeConfig.icon }), badgeConfig.label] }) }), _jsx("td", { className: "text-dark", children: action.performedBy?.displayName || "—" }), _jsx("td", { className: "text-dark", children: action.assignee?.displayName || (_jsx("span", { className: "text-muted fst-italic", children: "Unassigned" })) }), canManage && (_jsx("td", { className: "text-end", children: _jsx("button", { type: "button", className: "btn btn-outline-secondary btn-sm py-0 px-2", onClick: (e) => handleOpenEditModal(action, e), "aria-label": `Edit Action ${action.id}`, "data-testid": `edit-action-btn-${action.id}`, children: "Edit" }) }))] }, action.id));
                                        }) })] }) }), _jsx("div", { className: "d-md-none p-3 d-flex flex-column gap-3", "data-testid": "actions-mobile-cards", children: actions.map((action) => {
                                const badgeConfig = getStatusBadgeConfig(action.status);
                                return (_jsxs("div", { className: "card border shadow-none p-3 bg-light", "data-testid": `action-card-${action.id}`, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-2", children: [_jsxs("span", { className: badgeConfig.badgeClass, "data-testid": `action-status-badge-mobile-${action.id}`, children: [_jsx("span", { className: "me-1", "aria-hidden": "true", children: badgeConfig.icon }), badgeConfig.label] }), _jsx("span", { className: "text-muted small", children: formatActionDateTime(action.actionDateTime) })] }), _jsxs("div", { className: "mb-2", children: [_jsx("div", { className: "fw-bold small text-muted text-uppercase", children: "Description:" }), _jsx("div", { className: "text-dark small", style: { whiteSpace: "pre-wrap" }, children: action.description })] }), action.result && (_jsxs("div", { className: "mb-2", children: [_jsx("div", { className: "fw-bold small text-muted text-uppercase", children: "Result:" }), _jsx("div", { className: "text-dark small", style: { whiteSpace: "pre-wrap" }, children: action.result })] })), action.isFollowUpRequired && action.followUpNote && (_jsxs("div", { className: "mb-2 p-2 rounded bg-warning-subtle border border-warning-subtle small text-dark", "data-testid": `action-follow-up-mobile-${action.id}`, children: [_jsxs("div", { children: [_jsx("strong", { children: "\u26A0\uFE0F Follow-Up Required:" }), " ", action.followUpNote] }), action.attachmentNotes && (_jsxs("div", { className: "text-muted small mt-1", children: ["Ref: ", action.attachmentNotes] }))] })), _jsxs("div", { className: "d-flex justify-content-between text-muted small border-top pt-2 mt-1", children: [_jsxs("div", { children: [_jsx("span", { children: "By: " }), _jsx("strong", { className: "text-dark", children: action.performedBy?.displayName || "—" })] }), _jsxs("div", { children: [_jsx("span", { children: "Assignee: " }), _jsx("strong", { className: "text-dark", children: action.assignee?.displayName || "Unassigned" })] })] }), canManage && (_jsx("div", { className: "mt-3 pt-2 border-top", children: _jsx("button", { type: "button", className: "btn btn-outline-secondary btn-sm w-100", style: { minHeight: "44px" }, onClick: (e) => handleOpenEditModal(action, e), "data-testid": `edit-action-btn-mobile-${action.id}`, children: "\u270F\uFE0F Edit Action" }) }))] }, action.id));
                            }) })] })) }), isModalOpen && (_jsx("div", { className: "modal fade show d-block", tabIndex: -1, role: "dialog", "aria-modal": "true", "aria-labelledby": "action-modal-title", style: { backgroundColor: "rgba(0, 0, 0, 0.5)" }, "data-testid": "action-modal", children: _jsx("div", { className: "modal-dialog modal-dialog-centered modal-lg", children: _jsxs("div", { className: "modal-content shadow border-0", children: [_jsxs("div", { className: "modal-header bg-light", children: [_jsx("h5", { className: "modal-title fw-bold", id: "action-modal-title", "data-testid": "action-modal-title", children: modalMode === "create" ? "Add Action Taken" : "Edit Action Taken" }), _jsx("button", { type: "button", className: "btn-close", onClick: handleCloseModal, "aria-label": "Close", disabled: isSubmitting })] }), _jsxs("form", { onSubmit: handleSubmit, noValidate: true, children: [_jsxs("div", { className: "modal-body p-4", children: [modalError && (_jsx("div", { className: "alert alert-danger small d-flex align-items-center mb-3", role: "alert", "data-testid": "action-form-error", children: _jsx("span", { children: modalError }) })), _jsxs("div", { className: "row g-3", children: [_jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { htmlFor: "action-performed-by", className: "form-label small fw-semibold text-muted", children: "Performed By" }), _jsx("input", { type: "text", id: "action-performed-by", className: "form-control form-control-sm", style: { backgroundColor: "var(--color-input-readonly, #eef3f0)" }, readOnly: true, value: modalMode === "create"
                                                                    ? auth?.user?.displayName || "Authenticated IT Staff"
                                                                    : editingAction?.performedBy?.displayName || "Authenticated IT Staff", "data-testid": "action-performed-by-input" }), _jsx("div", { className: "form-text small text-muted", children: "Automatically recorded from current authenticated session." })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { htmlFor: "action-datetime", className: "form-label small fw-semibold text-muted", children: "Action Date & Time" }), _jsx("input", { type: "datetime-local", id: "action-datetime", className: "form-control form-control-sm", value: actionDateTime, onChange: (e) => setActionDateTime(e.target.value), "data-testid": "action-datetime-input" })] }), _jsxs("div", { className: "col-12", children: [_jsxs("label", { htmlFor: "action-description", className: "form-label small fw-semibold text-dark", children: ["Description ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("textarea", { ref: descriptionInputRef, id: "action-description", rows: 3, className: `form-control form-control-sm ${formErrors.description ? "is-invalid" : ""}`, placeholder: "Detail technical actions performed, diagnostic findings, or maintenance steps...", value: description, onChange: (e) => setDescription(e.target.value), required: true, minLength: 5, maxLength: 1000, "aria-describedby": formErrors.description ? "description-error" : undefined, "data-testid": "action-description-input" }), formErrors.description ? (_jsx("div", { id: "description-error", className: "invalid-feedback small", "data-testid": "description-error", children: formErrors.description })) : (_jsx("div", { className: "form-text small text-muted", children: "Minimum 5 characters, up to 1000 characters." }))] }), _jsxs("div", { className: "col-12", children: [_jsx("label", { htmlFor: "action-result", className: "form-label small fw-semibold text-muted", children: "Result / Outcome Notes" }), _jsx("textarea", { id: "action-result", rows: 2, className: `form-control form-control-sm ${formErrors.result ? "is-invalid" : ""}`, placeholder: "Outcome, test results, hardware readings, or component replacements...", value: result, onChange: (e) => setResult(e.target.value), maxLength: 1000, "data-testid": "action-result-input" }), formErrors.result && (_jsx("div", { className: "invalid-feedback small", children: formErrors.result }))] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "action-status", className: "form-label small fw-semibold text-dark", children: ["Status ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("select", { id: "action-status", className: "form-select form-select-sm", value: status, onChange: (e) => setStatus(e.target.value), "data-testid": "action-status-select", children: [_jsx("option", { value: "PLANNED", disabled: isEditingTerminal, children: "Planned" }), _jsx("option", { value: "IN_PROGRESS", disabled: isEditingTerminal, children: "In Progress" }), _jsx("option", { value: "COMPLETED", children: "Completed" }), _jsx("option", { value: "CANCELLED", children: "Cancelled" })] }), isEditingTerminal && (_jsx("div", { className: "form-text small text-muted", children: "Terminal status (Completed / Cancelled) cannot be reverted to Planned or In Progress." }))] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { htmlFor: "action-assignee", className: "form-label small fw-semibold text-muted", children: "Assignee" }), _jsxs("select", { id: "action-assignee", className: "form-select form-select-sm", value: assigneeId, onChange: (e) => setAssigneeId(e.target.value), "data-testid": "action-assignee-select", children: [_jsx("option", { value: "", children: "Unassigned (None)" }), staffList.map((staff) => (_jsxs("option", { value: staff.id, children: [staff.displayName, " (", staff.role === "ADMINISTRATOR" ? "Admin" : "IT Staff", ")"] }, staff.id)))] }), _jsx("div", { className: "form-text small text-muted", children: "Assignee can be any active IT Staff or Administrator." })] }), _jsx("div", { className: "col-12", children: _jsxs("div", { className: "form-check form-switch mt-2", children: [_jsx("input", { type: "checkbox", id: "action-follow-up-required", className: "form-check-input", checked: isFollowUpRequired, onChange: handleFollowUpCheckboxChange, "data-testid": "action-followup-checkbox" }), _jsx("label", { htmlFor: "action-follow-up-required", className: "form-check-label small fw-semibold text-dark", children: "Follow-Up Required" })] }) }), _jsxs("div", { className: "col-12", children: [_jsxs("label", { htmlFor: "action-follow-up-note", className: "form-label small fw-semibold text-muted", children: ["Follow-Up Note ", isFollowUpRequired && _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { type: "text", id: "action-follow-up-note", className: `form-control form-control-sm ${formErrors.followUpNote ? "is-invalid" : ""}`, placeholder: isFollowUpRequired
                                                                    ? "Describe necessary follow-up actions (min 3 characters)..."
                                                                    : "Check 'Follow-Up Required' above to enable", value: followUpNote, onChange: (e) => setFollowUpNote(e.target.value), disabled: !isFollowUpRequired, "aria-describedby": formErrors.followUpNote ? "followup-note-error" : undefined, "data-testid": "action-followup-note-input" }), formErrors.followUpNote ? (_jsx("div", { id: "followup-note-error", className: "invalid-feedback small", "data-testid": "followup-note-error", children: formErrors.followUpNote })) : (isFollowUpRequired && (_jsx("div", { className: "form-text small text-muted", children: "Mandatory when follow-up is required (min 3 characters)." })))] }), _jsxs("div", { className: "col-12", children: [_jsx("label", { htmlFor: "action-attachment-notes", className: "form-label small fw-semibold text-muted", children: "Attachment Notes (Physical Reference / File Pointer)" }), _jsx("input", { type: "text", id: "action-attachment-notes", className: `form-control form-control-sm ${formErrors.attachmentNotes ? "is-invalid" : ""}`, placeholder: "e.g. memtest-log.txt, invoice-receipt-882.pdf", value: attachmentNotes, onChange: (e) => setAttachmentNotes(e.target.value), maxLength: 255, "data-testid": "action-attachment-notes-input" }), formErrors.attachmentNotes && (_jsx("div", { className: "invalid-feedback small", children: formErrors.attachmentNotes }))] })] })] }), _jsxs("div", { className: "modal-footer bg-light", children: [_jsx("button", { type: "button", className: "btn btn-zen-secondary btn-sm", onClick: handleCloseModal, disabled: isSubmitting, "data-testid": "action-cancel-btn", children: "Cancel" }), _jsx("button", { type: "submit", className: "btn btn-zen-primary btn-sm d-flex align-items-center gap-2", disabled: isSubmitting, "data-testid": "action-submit-btn", children: isSubmitting ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "spinner-border spinner-border-sm", role: "status", "aria-hidden": "true" }), _jsx("span", { children: "Saving..." })] })) : (_jsx("span", { children: "Save Action" })) })] })] })] }) }) }))] }));
}
