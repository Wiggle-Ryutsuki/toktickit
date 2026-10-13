import React, { useState, useEffect, useCallback, useContext, useRef } from "react";
import { AuthContext } from "../context/AuthContext.js";
import {
  getTicketActionsApi,
  createTicketActionApi,
  updateTicketActionApi,
  getStaffAssigneesApi,
  ActionTakenDto,
  StaffAssigneeDto,
  ActionStatus,
  CreateActionPayload,
  UpdateActionPayload,
} from "../api.js";

export interface ActionsTakenProps {
  ticketId: number;
  isReadOnly?: boolean;
}

function formatActionDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "—";
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
  } catch {
    return isoString;
  }
}

function getStatusBadgeConfig(status: ActionStatus) {
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

export default function ActionsTaken({ ticketId, isReadOnly = false }: ActionsTakenProps) {
  const auth = useContext(AuthContext);
  const canManage = !isReadOnly && auth?.user?.role !== "REQUESTER";

  const [actions, setActions] = useState<ActionTakenDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Staff assignees list for select dropdown
  const [staffList, setStaffList] = useState<StaffAssigneeDto[]>([]);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingAction, setEditingAction] = useState<ActionTakenDto | null>(null);

  // Form field states
  const [description, setDescription] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [status, setStatus] = useState<ActionStatus>("PLANNED");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [isFollowUpRequired, setIsFollowUpRequired] = useState<boolean>(false);
  const [followUpNote, setFollowUpNote] = useState<string>("");
  const [attachmentNotes, setAttachmentNotes] = useState<string>("");
  const [actionDateTime, setActionDateTime] = useState<string>("");

  // Validation & async submission states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [modalError, setModalError] = useState<string | null>(null);

  // Focus management refs
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);

  // Load staff assignees
  const loadStaffAssignees = useCallback(async () => {
    try {
      const data = await getStaffAssigneesApi();
      setStaffList(data);
    } catch {
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
        if (timeDiff !== 0) return timeDiff;
        return a.id - b.id;
      });
      setActions(sorted);
    } catch (err: any) {
      setFetchError(err.message || "Failed to load Actions Taken.");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  // Open Create Modal
  const handleOpenCreateModal = (e?: React.MouseEvent<HTMLButtonElement>) => {
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
  const handleOpenEditModal = (action: ActionTakenDto, e?: React.MouseEvent<HTMLButtonElement>) => {
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
    } else {
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

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          handleCloseModal();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isModalOpen]);

  // Dynamic Follow-Up Checkbox toggle handler (BR-05, FR-41)
  const handleFollowUpCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!description || description.trim().length < 5) {
      errors.description = "Action description is required (min 5 characters).";
    } else if (description.trim().length > 1000) {
      errors.description = "Action description cannot exceed 1000 characters.";
    }

    if (result && result.trim().length > 1000) {
      errors.result = "Action result cannot exceed 1000 characters.";
    }

    if (isFollowUpRequired) {
      if (!followUpNote || followUpNote.trim().length < 3) {
        errors.followUpNote = "Follow-up note is required when follow-up is requested (min 3 characters).";
      } else if (followUpNote.trim().length > 500) {
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
  const handleSubmit = async (e: React.FormEvent) => {
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
        const payload: CreateActionPayload = {
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
      } else if (modalMode === "edit" && editingAction) {
        const payload: UpdateActionPayload = {
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
        setActions((prev) =>
          prev.map((item) => (item.id === updatedAction.id ? updatedAction : item))
        );
        handleCloseModal();
      }
    } catch (err: any) {
      if (err.status === 409) {
        setModalError("Action has been updated by another user. Please close and reload.");
      } else {
        setModalError(err.message || "Failed to save Action Taken. Please verify inputs.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if editing action is in terminal status (BR-17)
  const isEditingTerminal =
    modalMode === "edit" &&
    editingAction !== null &&
    (editingAction.status === "COMPLETED" || editingAction.status === "CANCELLED");

  return (
    <div className="card border-0 shadow-sm mb-4" id="actions-taken-container" data-testid="actions-taken-section">
      {/* Header */}
      <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <h5 className="fw-bold mb-0 text-dark small text-uppercase">
            📋 Actions Taken
          </h5>
          <span className="badge bg-light text-dark border" data-testid="actions-count-badge">
            {actions.length} {actions.length === 1 ? "action" : "actions"}
          </span>
        </div>

        {/* Create button suppressed for Requesters / Read-Only (FR-42, AC-04, BR-13) */}
        {canManage && (
          <button
            type="button"
            className="btn btn-zen-primary btn-sm d-flex align-items-center gap-1"
            onClick={handleOpenCreateModal}
            data-testid="add-action-btn"
          >
            <span>+</span>
            <span>Add Action Taken</span>
          </button>
        )}
      </div>

      <div className="card-body p-0">
        {loading ? (
          <div className="text-center py-4 text-muted small" data-testid="actions-loading">
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
            Loading actions taken...
          </div>
        ) : fetchError ? (
          <div className="p-4">
            <div className="alert alert-danger mb-0 small" role="alert" data-testid="actions-fetch-error">
              {fetchError}
            </div>
          </div>
        ) : actions.length === 0 ? (
          /* Empty State (FR-38, UI-11) */
          <div className="p-4 text-center text-muted" data-testid="actions-empty-state">
            <div className="fs-1 mb-2">📋</div>
            <h6 className="fw-semibold text-dark mb-1">
              No actions taken recorded for this ticket yet.
            </h6>
            {canManage ? (
              <>
                <p className="small mb-3 text-muted">
                  Document diagnostic steps, hardware fixes, or technical actions taken to resolve this ticket.
                </p>
                <button
                  type="button"
                  className="btn btn-zen-outline btn-sm"
                  onClick={handleOpenCreateModal}
                  data-testid="add-first-action-btn"
                >
                  + Add the First Action
                </button>
              </>
            ) : (
              <p className="small mb-0 text-muted">
                IT Staff have not logged technical action lines for this ticket yet.
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Viewport Data Table (>=768px / >=992px) */}
            <div className="d-none d-md-block table-responsive">
              <table className="table table-hover align-middle mb-0" data-testid="actions-table">
                <thead className="table-light small text-uppercase text-muted">
                  <tr>
                    <th scope="col" style={{ width: "16%" }}>Date/Time</th>
                    <th scope="col" style={{ width: "32%" }}>Description</th>
                    <th scope="col" style={{ width: "18%" }}>Result</th>
                    <th scope="col" style={{ width: "12%" }}>Status</th>
                    <th scope="col" style={{ width: "12%" }}>Performed By</th>
                    <th scope="col" style={{ width: "10%" }}>Assignee</th>
                    {/* Action column completely suppressed for Requesters (FR-42, AC-04) */}
                    {canManage && (
                      <th scope="col" className="text-end" style={{ width: "8%" }}>
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="small">
                  {actions.map((action) => {
                    const badgeConfig = getStatusBadgeConfig(action.status);
                    return (
                      <tr key={action.id} data-testid={`action-row-${action.id}`}>
                        {/* Date/Time */}
                        <td className="text-muted text-nowrap">
                          {formatActionDateTime(action.actionDateTime)}
                        </td>

                        {/* Description & Follow-Up Banner */}
                        <td>
                          <div className="text-dark fw-medium" style={{ whiteSpace: "pre-wrap" }}>
                            {action.description}
                          </div>
                          {action.isFollowUpRequired && action.followUpNote && (
                            <div
                              className="mt-1 p-1 px-2 rounded bg-warning-subtle border border-warning-subtle small text-dark d-flex align-items-center gap-1"
                              data-testid={`action-follow-up-${action.id}`}
                            >
                              <span aria-hidden="true">⚠️</span>
                              <span>
                                <strong>Follow-Up:</strong> {action.followUpNote}
                                {action.attachmentNotes && (
                                  <span className="text-muted ms-1">
                                    (Ref: {action.attachmentNotes})
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                          {!action.isFollowUpRequired && action.attachmentNotes && (
                            <div className="mt-1 small text-muted">
                              <span className="fw-medium">Attachment Note:</span> {action.attachmentNotes}
                            </div>
                          )}
                        </td>

                        {/* Result */}
                        <td className="text-muted" style={{ whiteSpace: "pre-wrap" }}>
                          {action.result ? action.result : "—"}
                        </td>

                        {/* Status Badge */}
                        <td>
                          <span
                            className={badgeConfig.badgeClass}
                            data-testid={`action-status-badge-${action.id}`}
                          >
                            <span className="me-1" aria-hidden="true">{badgeConfig.icon}</span>
                            {badgeConfig.label}
                          </span>
                        </td>

                        {/* Performed By */}
                        <td className="text-dark">
                          {action.performedBy?.displayName || "—"}
                        </td>

                        {/* Assignee */}
                        <td className="text-dark">
                          {action.assignee?.displayName || (
                            <span className="text-muted fst-italic">Unassigned</span>
                          )}
                        </td>

                        {/* Edit Control (omitted for Requesters) */}
                        {canManage && (
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm py-0 px-2"
                              onClick={(e) => handleOpenEditModal(action, e)}
                              aria-label={`Edit Action ${action.id}`}
                              data-testid={`edit-action-btn-${action.id}`}
                            >
                              Edit
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards (<768px) */}
            <div className="d-md-none p-3 d-flex flex-column gap-3" data-testid="actions-mobile-cards">
              {actions.map((action) => {
                const badgeConfig = getStatusBadgeConfig(action.status);
                return (
                  <div
                    key={action.id}
                    className="card border shadow-none p-3 bg-light"
                    data-testid={`action-card-${action.id}`}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span
                        className={badgeConfig.badgeClass}
                        data-testid={`action-status-badge-mobile-${action.id}`}
                      >
                        <span className="me-1" aria-hidden="true">{badgeConfig.icon}</span>
                        {badgeConfig.label}
                      </span>
                      <span className="text-muted small">
                        {formatActionDateTime(action.actionDateTime)}
                      </span>
                    </div>

                    <div className="mb-2">
                      <div className="fw-bold small text-muted text-uppercase">Description:</div>
                      <div className="text-dark small" style={{ whiteSpace: "pre-wrap" }}>
                        {action.description}
                      </div>
                    </div>

                    {action.result && (
                      <div className="mb-2">
                        <div className="fw-bold small text-muted text-uppercase">Result:</div>
                        <div className="text-dark small" style={{ whiteSpace: "pre-wrap" }}>
                          {action.result}
                        </div>
                      </div>
                    )}

                    {action.isFollowUpRequired && action.followUpNote && (
                      <div
                        className="mb-2 p-2 rounded bg-warning-subtle border border-warning-subtle small text-dark"
                        data-testid={`action-follow-up-mobile-${action.id}`}
                      >
                        <div>
                          <strong>⚠️ Follow-Up Required:</strong> {action.followUpNote}
                        </div>
                        {action.attachmentNotes && (
                          <div className="text-muted small mt-1">
                            Ref: {action.attachmentNotes}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="d-flex justify-content-between text-muted small border-top pt-2 mt-1">
                      <div>
                        <span>By: </span>
                        <strong className="text-dark">{action.performedBy?.displayName || "—"}</strong>
                      </div>
                      <div>
                        <span>Assignee: </span>
                        <strong className="text-dark">
                          {action.assignee?.displayName || "Unassigned"}
                        </strong>
                      </div>
                    </div>

                    {/* Mobile Edit Button (omitted for Requesters) */}
                    {canManage && (
                      <div className="mt-3 pt-2 border-top">
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm w-100"
                          style={{ minHeight: "44px" }}
                          onClick={(e) => handleOpenEditModal(action, e)}
                          data-testid={`edit-action-btn-mobile-${action.id}`}
                        >
                          ✏️ Edit Action
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Accessible Action Create / Edit Modal Dialog */}
      {isModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="action-modal-title"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          data-testid="action-modal"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content shadow border-0">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold" id="action-modal-title" data-testid="action-modal-title">
                  {modalMode === "create" ? "Add Action Taken" : "Edit Action Taken"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseModal}
                  aria-label="Close"
                  disabled={isSubmitting}
                />
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <div className="modal-body p-4">
                  {/* Modal Alert Error if any */}
                  {modalError && (
                    <div
                      className="alert alert-danger small d-flex align-items-center mb-3"
                      role="alert"
                      data-testid="action-form-error"
                    >
                      <span>{modalError}</span>
                    </div>
                  )}

                  <div className="row g-3">
                    {/* Performed By (Read-only, auto-populated, BR-03) */}
                    <div className="col-12 col-md-6">
                      <label htmlFor="action-performed-by" className="form-label small fw-semibold text-muted">
                        Performed By
                      </label>
                      <input
                        type="text"
                        id="action-performed-by"
                        className="form-control form-control-sm"
                        style={{ backgroundColor: "var(--color-input-readonly, #eef3f0)" }}
                        readOnly
                        value={
                          modalMode === "create"
                            ? auth?.user?.displayName || "Authenticated IT Staff"
                            : editingAction?.performedBy?.displayName || "Authenticated IT Staff"
                        }
                        data-testid="action-performed-by-input"
                      />
                      <div className="form-text small text-muted">
                        Automatically recorded from current authenticated session.
                      </div>
                    </div>

                    {/* Action Date / Time */}
                    <div className="col-12 col-md-6">
                      <label htmlFor="action-datetime" className="form-label small fw-semibold text-muted">
                        Action Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        id="action-datetime"
                        className="form-control form-control-sm"
                        value={actionDateTime}
                        onChange={(e) => setActionDateTime(e.target.value)}
                        data-testid="action-datetime-input"
                      />
                    </div>

                    {/* Description (Required, 5-1000 chars) */}
                    <div className="col-12">
                      <label htmlFor="action-description" className="form-label small fw-semibold text-dark">
                        Description <span className="text-danger">*</span>
                      </label>
                      <textarea
                        ref={descriptionInputRef}
                        id="action-description"
                        rows={3}
                        className={`form-control form-control-sm ${formErrors.description ? "is-invalid" : ""}`}
                        placeholder="Detail technical actions performed, diagnostic findings, or maintenance steps..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        minLength={5}
                        maxLength={1000}
                        aria-describedby={formErrors.description ? "description-error" : undefined}
                        data-testid="action-description-input"
                      />
                      {formErrors.description ? (
                        <div
                          id="description-error"
                          className="invalid-feedback small"
                          data-testid="description-error"
                        >
                          {formErrors.description}
                        </div>
                      ) : (
                        <div className="form-text small text-muted">
                          Minimum 5 characters, up to 1000 characters.
                        </div>
                      )}
                    </div>

                    {/* Result (Optional, max 1000 chars) */}
                    <div className="col-12">
                      <label htmlFor="action-result" className="form-label small fw-semibold text-muted">
                        Result / Outcome Notes
                      </label>
                      <textarea
                        id="action-result"
                        rows={2}
                        className={`form-control form-control-sm ${formErrors.result ? "is-invalid" : ""}`}
                        placeholder="Outcome, test results, hardware readings, or component replacements..."
                        value={result}
                        onChange={(e) => setResult(e.target.value)}
                        maxLength={1000}
                        data-testid="action-result-input"
                      />
                      {formErrors.result && (
                        <div className="invalid-feedback small">{formErrors.result}</div>
                      )}
                    </div>

                    {/* Status Dropdown */}
                    <div className="col-12 col-md-6">
                      <label htmlFor="action-status" className="form-label small fw-semibold text-dark">
                        Status <span className="text-danger">*</span>
                      </label>
                      <select
                        id="action-status"
                        className="form-select form-select-sm"
                        value={status}
                        onChange={(e) => setStatus(e.target.value as ActionStatus)}
                        data-testid="action-status-select"
                      >
                        <option value="PLANNED" disabled={isEditingTerminal}>
                          Planned
                        </option>
                        <option value="IN_PROGRESS" disabled={isEditingTerminal}>
                          In Progress
                        </option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                      {isEditingTerminal && (
                        <div className="form-text small text-muted">
                          Terminal status (Completed / Cancelled) cannot be reverted to Planned or In Progress.
                        </div>
                      )}
                    </div>

                    {/* Assignee Dropdown (BR-02, BR-04) */}
                    <div className="col-12 col-md-6">
                      <label htmlFor="action-assignee" className="form-label small fw-semibold text-muted">
                        Assignee
                      </label>
                      <select
                        id="action-assignee"
                        className="form-select form-select-sm"
                        value={assigneeId}
                        onChange={(e) => setAssigneeId(e.target.value)}
                        data-testid="action-assignee-select"
                      >
                        <option value="">Unassigned (None)</option>
                        {staffList.map((staff) => (
                          <option key={staff.id} value={staff.id}>
                            {staff.displayName} ({staff.role === "ADMINISTRATOR" ? "Admin" : "IT Staff"})
                          </option>
                        ))}
                      </select>
                      <div className="form-text small text-muted">
                        Assignee can be any active IT Staff or Administrator.
                      </div>
                    </div>

                    {/* Follow-Up Required Toggle (BR-05, FR-41) */}
                    <div className="col-12">
                      <div className="form-check form-switch mt-2">
                        <input
                          type="checkbox"
                          id="action-follow-up-required"
                          className="form-check-input"
                          checked={isFollowUpRequired}
                          onChange={handleFollowUpCheckboxChange}
                          data-testid="action-followup-checkbox"
                        />
                        <label
                          htmlFor="action-follow-up-required"
                          className="form-check-label small fw-semibold text-dark"
                        >
                          Follow-Up Required
                        </label>
                      </div>
                    </div>

                    {/* Follow-Up Note (Conditionally mandatory when checked, BR-05, FR-41, AC-06) */}
                    <div className="col-12">
                      <label
                        htmlFor="action-follow-up-note"
                        className="form-label small fw-semibold text-muted"
                      >
                        Follow-Up Note {isFollowUpRequired && <span className="text-danger">*</span>}
                      </label>
                      <input
                        type="text"
                        id="action-follow-up-note"
                        className={`form-control form-control-sm ${formErrors.followUpNote ? "is-invalid" : ""}`}
                        placeholder={
                          isFollowUpRequired
                            ? "Describe necessary follow-up actions (min 3 characters)..."
                            : "Check 'Follow-Up Required' above to enable"
                        }
                        value={followUpNote}
                        onChange={(e) => setFollowUpNote(e.target.value)}
                        disabled={!isFollowUpRequired}
                        aria-describedby={formErrors.followUpNote ? "followup-note-error" : undefined}
                        data-testid="action-followup-note-input"
                      />
                      {formErrors.followUpNote ? (
                        <div
                          id="followup-note-error"
                          className="invalid-feedback small"
                          data-testid="followup-note-error"
                        >
                          {formErrors.followUpNote}
                        </div>
                      ) : (
                        isFollowUpRequired && (
                          <div className="form-text small text-muted">
                            Mandatory when follow-up is required (min 3 characters).
                          </div>
                        )
                      )}
                    </div>

                    {/* Attachment Notes (Optional text reference) */}
                    <div className="col-12">
                      <label
                        htmlFor="action-attachment-notes"
                        className="form-label small fw-semibold text-muted"
                      >
                        Attachment Notes (Physical Reference / File Pointer)
                      </label>
                      <input
                        type="text"
                        id="action-attachment-notes"
                        className={`form-control form-control-sm ${formErrors.attachmentNotes ? "is-invalid" : ""}`}
                        placeholder="e.g. memtest-log.txt, invoice-receipt-882.pdf"
                        value={attachmentNotes}
                        onChange={(e) => setAttachmentNotes(e.target.value)}
                        maxLength={255}
                        data-testid="action-attachment-notes-input"
                      />
                      {formErrors.attachmentNotes && (
                        <div className="invalid-feedback small">{formErrors.attachmentNotes}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-zen-secondary btn-sm"
                    onClick={handleCloseModal}
                    disabled={isSubmitting}
                    data-testid="action-cancel-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-zen-primary btn-sm d-flex align-items-center gap-2"
                    disabled={isSubmitting}
                    data-testid="action-submit-btn"
                  >
                    {isSubmitting ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm"
                          role="status"
                          aria-hidden="true"
                        />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Action</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
