import React, { useState, useEffect } from "react";
import { useRequester } from "../context/RequesterContext.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_ATTACHMENTS = 5;
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export interface Category {
  id: number;
  name: string;
  code: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
}

export interface CreateTicketProps {
  onCancel?: () => void;
  onTicketCreated?: (ticket: any) => void;
  onViewDetail?: (id: number) => void;
}

interface FormErrors {
  summary?: string;
  description?: string;
  categoryId?: string;
  relatedSystemId?: string;
  attachments?: string;
}

export default function CreateTicket({ onCancel, onTicketCreated, onViewDetail }: CreateTicketProps) {
  const { selectedRequester } = useRequester();

  const [categories, setCategories] = useState<Category[]>([]);
  const [systems, setSystems] = useState<RelatedSystem[]>([]);
  const [loadingRefData, setLoadingRefData] = useState<boolean>(true);
  const [refDataError, setRefDataError] = useState<string | null>(null);

  // Form Fields
  const [categoryId, setCategoryId] = useState<string>("");
  const [relatedSystemId, setRelatedSystemId] = useState<string>("");
  const [requestedPriority, setRequestedPriority] = useState<string>("MEDIUM");
  const [summary, setSummary] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [attachments, setAttachments] = useState<File[]>([]);

  // State Feedback
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] = useState<{ ticketNo: string; id: number } | null>(null);

  const currentYear = new Date().getUTCFullYear();
  const formattedDate = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Fetch reference data
  useEffect(() => {
    let mounted = true;

    const fetchReferenceData = async () => {
      setLoadingRefData(true);
      setRefDataError(null);
      try {
        const [catRes, sysRes] = await Promise.all([
          fetch(`${API_URL}/api/categories`),
          fetch(`${API_URL}/api/related-systems`),
        ]);

        if (!catRes.ok || !sysRes.ok) {
          throw new Error("Failed to load reference data from server.");
        }

        const [catData, sysData] = await Promise.all([catRes.json(), sysRes.json()]);

        if (mounted) {
          setCategories(Array.isArray(catData) ? catData : []);
          setSystems(Array.isArray(sysData) ? sysData : []);
        }
      } catch (err) {
        if (mounted) {
          setRefDataError(err instanceof Error ? err.message : "Failed to load reference data.");
        }
      } finally {
        if (mounted) {
          setLoadingRefData(false);
        }
      }
    };

    fetchReferenceData();

    return () => {
      mounted = false;
    };
  }, []);

  // Format file size helper
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrors((prev) => ({ ...prev, attachments: undefined }));
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    if (attachments.length + selectedFiles.length > MAX_ATTACHMENTS) {
      setErrors((prev) => ({
        ...prev,
        attachments: `Maximum of ${MAX_ATTACHMENTS} files allowed per ticket.`,
      }));
      e.target.value = "";
      return;
    }

    const validNewFiles: File[] = [];

    for (const file of selectedFiles) {
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
      const isMimeValid = ALLOWED_MIME_TYPES.includes(file.type);
      const isExtValid = ALLOWED_EXTENSIONS.includes(ext);

      if (!isMimeValid && !isExtValid) {
        setErrors((prev) => ({
          ...prev,
          attachments: `File '${file.name}' has an unsupported type. Allowed: JPG, PNG, WEBP, PDF.`,
        }));
        e.target.value = "";
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setErrors((prev) => ({
          ...prev,
          attachments: `File exceeds the 5 MB limit.`,
        }));
        e.target.value = "";
        return;
      }

      validNewFiles.push(file);
    }

    setAttachments((prev) => [...prev, ...validNewFiles]);
    e.target.value = "";
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setErrors((prev) => ({ ...prev, attachments: undefined }));
  };

  // Client validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!summary.trim()) {
      newErrors.summary = "Summary is required and cannot be empty.";
    } else if (summary.trim().length < 5) {
      newErrors.summary = "Summary must be between 5 and 120 characters.";
    } else if (summary.trim().length > 120) {
      newErrors.summary = "Summary must be between 5 and 120 characters.";
    }

    if (!description.trim()) {
      newErrors.description = "Description is required and cannot be empty.";
    } else if (description.trim().length < 10) {
      newErrors.description = "Description must be at least 10 characters.";
    } else if (description.trim().length > 2000) {
      newErrors.description = "Description cannot exceed 2000 characters.";
    }

    if (!categoryId) {
      newErrors.categoryId = "Please select a category.";
    }

    if (!relatedSystemId) {
      newErrors.relatedSystemId = "Please select a related system.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      let response: Response;

      if (attachments.length > 0) {
        const formData = new FormData();
        formData.append("requesterId", String(selectedRequester?.id || "1"));
        formData.append("categoryId", categoryId);
        formData.append("relatedSystemId", relatedSystemId);
        formData.append("requestedPriority", requestedPriority);
        formData.append("summary", summary.trim());
        formData.append("description", description.trim());

        for (const file of attachments) {
          formData.append("attachments", file);
        }

        response = await fetch(`${API_URL}/api/tickets`, {
          method: "POST",
          headers: {
            "X-Requester-Id": String(selectedRequester?.id || "1"),
          },
          body: formData,
        });
      } else {
        response = await fetch(`${API_URL}/api/tickets`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Requester-Id": String(selectedRequester?.id || "1"),
          },
          body: JSON.stringify({
            requesterId: selectedRequester?.id || 1,
            categoryId: Number(categoryId),
            relatedSystemId: Number(relatedSystemId),
            requestedPriority,
            summary: summary.trim(),
            description: description.trim(),
          }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 422 && data.error?.fieldErrors) {
          const apiFieldErrors: FormErrors = {};
          for (const fe of data.error.fieldErrors) {
            if (fe.field === "summary") apiFieldErrors.summary = fe.message;
            if (fe.field === "description") apiFieldErrors.description = fe.message;
            if (fe.field === "categoryId") apiFieldErrors.categoryId = fe.message;
            if (fe.field === "relatedSystemId") apiFieldErrors.relatedSystemId = fe.message;
          }
          setErrors(apiFieldErrors);
        }
        throw new Error(data.error?.message || "Failed to submit ticket.");
      }

      setCreatedTicket({
        ticketNo: data.ticketNo,
        id: data.id,
      });

      if (onTicketCreated) {
        onTicketCreated(data);
      }
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "An unexpected error occurred. Your inputs have been preserved.");
    } finally {
      setSubmitting(false);
    }
  };

  // If successfully created, render Success State
  if (createdTicket) {
    return (
      <div className="container py-4" style={{ maxWidth: "1140px" }}>
        <div className="zen-success-banner shadow-sm" role="status">
          <div className="d-flex align-items-center mb-3">
            <span className="fs-3 me-2 text-success">✔</span>
            <h3 className="mb-0 text-success fw-semibold">Ticket created successfully!</h3>
          </div>
          <p className="fs-5 mb-3">
            Your ticket number is <strong className="text-decoration-underline">{createdTicket.ticketNo}</strong>.
          </p>
          <p className="text-muted mb-4">
            Our IT Support team has received your incident report and will begin reviewing it shortly.
          </p>
          <div className="d-flex gap-3">
            <button
              type="button"
              className="btn btn-zen-primary"
              onClick={() => {
                if (onViewDetail) {
                  onViewDetail(createdTicket.id);
                }
              }}
            >
              View Ticket Details
            </button>
            <button
              type="button"
              className="btn btn-zen-secondary"
              onClick={onCancel || (() => setCreatedTicket(null))}
            >
              Back to My Tickets
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4" style={{ maxWidth: "1140px" }}>
      {/* Breadcrumb navigation */}
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <a
              href="#my-tickets"
              onClick={(e) => { e.preventDefault(); onCancel?.(); }}
              className="text-decoration-none"
              style={{ color: "var(--color-primary-green)" }}
            >
              My Tickets
            </a>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Create Ticket
          </li>
        </ol>
      </nav>

      <h1 className="h3 fw-bold mb-4" style={{ color: "var(--color-text-primary)" }}>
        Create IT Support Ticket
      </h1>

      {/* Global error banner (preserves form values) */}
      {globalError && (
        <div className="alert alert-danger mb-4 shadow-sm" role="alert">
          <strong>Submission Error:</strong> {globalError}
        </div>
      )}

      {/* Reference Data Fetch Error */}
      {refDataError && (
        <div className="alert alert-warning mb-4" role="alert">
          {refDataError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* System & Requester Metadata Card */}
        <div className="zen-card p-3 mb-4 bg-light">
          <div className="row g-3">
            <div className="col-md-4">
              <label htmlFor="ticketNo" className="form-label small fw-semibold text-muted mb-1">
                Ticket Number
              </label>
              <input
                id="ticketNo"
                type="text"
                readOnly
                className="form-control bg-readonly"
                value={`TKT-${currentYear}-##### (Auto)`}
                tabIndex={-1}
              />
            </div>

            <div className="col-md-4">
              <label htmlFor="ticketDate" className="form-label small fw-semibold text-muted mb-1">
                Ticket Date
              </label>
              <input
                id="ticketDate"
                type="text"
                readOnly
                className="form-control bg-readonly"
                value={formattedDate}
                tabIndex={-1}
              />
            </div>

            <div className="col-md-4">
              <label htmlFor="requester" className="form-label small fw-semibold text-muted mb-1">
                Requester
              </label>
              <input
                id="requester"
                type="text"
                readOnly
                className="form-control bg-readonly"
                value={
                  selectedRequester
                    ? `${selectedRequester.displayName} (${selectedRequester.email})`
                    : "Simulated Development Requester"
                }
                tabIndex={-1}
              />
            </div>
          </div>
        </div>

        {/* Ticket Form Card */}
        <div className="zen-card p-4 mb-4">
          {/* Classification Row */}
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <label htmlFor="categoryId" className="form-label fw-semibold">
                Category <span className="text-danger">*</span>
              </label>
              <select
                id="categoryId"
                className={`form-select ${errors.categoryId ? "is-invalid" : ""}`}
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  if (errors.categoryId) setErrors((prev) => ({ ...prev, categoryId: undefined }));
                }}
                disabled={loadingRefData}
              >
                <option value="">{loadingRefData ? "Loading categories..." : "Select Category..."}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <div className="zen-field-error" role="alert">
                  {errors.categoryId}
                </div>
              )}
            </div>

            <div className="col-md-4">
              <label htmlFor="relatedSystemId" className="form-label fw-semibold">
                Related System <span className="text-danger">*</span>
              </label>
              <select
                id="relatedSystemId"
                className={`form-select ${errors.relatedSystemId ? "is-invalid" : ""}`}
                value={relatedSystemId}
                onChange={(e) => {
                  setRelatedSystemId(e.target.value);
                  if (errors.relatedSystemId) setErrors((prev) => ({ ...prev, relatedSystemId: undefined }));
                }}
                disabled={loadingRefData}
              >
                <option value="">{loadingRefData ? "Loading systems..." : "Select Related System..."}</option>
                {systems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.relatedSystemId && (
                <div className="zen-field-error" role="alert">
                  {errors.relatedSystemId}
                </div>
              )}
            </div>

            <div className="col-md-4">
              <label htmlFor="requestedPriority" className="form-label fw-semibold">
                Requested Priority <span className="text-danger">*</span>
              </label>
              <select
                id="requestedPriority"
                className="form-select"
                value={requestedPriority}
                onChange={(e) => setRequestedPriority(e.target.value)}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          {/* Summary Input */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label htmlFor="summary" className="form-label fw-semibold mb-0">
                Summary <span className="text-danger">*</span>
              </label>
              <span className="small text-muted">{summary.length} / 120</span>
            </div>
            <input
              id="summary"
              type="text"
              className={`form-control ${errors.summary ? "is-invalid" : ""}`}
              placeholder="Brief summary of the issue"
              value={summary}
              maxLength={120}
              onChange={(e) => {
                setSummary(e.target.value);
                if (errors.summary) setErrors((prev) => ({ ...prev, summary: undefined }));
              }}
            />
            {errors.summary && (
              <div className="zen-field-error" role="alert">
                {errors.summary}
              </div>
            )}
          </div>

          {/* Description Textarea */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label htmlFor="description" className="form-label fw-semibold mb-0">
                Description <span className="text-danger">*</span>
              </label>
              <span className="small text-muted">{description.length} / 2000</span>
            </div>
            <textarea
              id="description"
              className={`form-control ${errors.description ? "is-invalid" : ""}`}
              style={{ minHeight: "120px", resize: "vertical" }}
              placeholder="Detailed steps to reproduce or description of the problem"
              value={description}
              maxLength={2000}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
              }}
            />
            {errors.description && (
              <div className="zen-field-error" role="alert">
                {errors.description}
              </div>
            )}
          </div>

          {/* Attachments Section */}
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <label htmlFor="attachments" className="form-label fw-semibold mb-0">
                Supporting Attachments <span className="text-muted fw-normal">(Optional)</span>
              </label>
              <span className="small text-muted">{attachments.length} of 5 files attached</span>
            </div>

            <div className="border border-dashed rounded p-3 text-center bg-light">
              <input
                id="attachments"
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                className="form-control mb-2"
                onChange={handleFileChange}
                disabled={attachments.length >= MAX_ATTACHMENTS}
              />
              <div className="small text-muted">
                Accepted types: JPG, PNG, WEBP, PDF (Up to 5 MB per file, max 5 files).
              </div>
            </div>

            {errors.attachments && (
              <div className="zen-field-error mt-2" role="alert">
                {errors.attachments}
              </div>
            )}

            {attachments.length > 0 && (
              <ul className="list-group list-group-flush mt-3 border rounded">
                {attachments.map((file, idx) => (
                  <li key={idx} className="list-group-item d-flex justify-content-between align-items-center py-2">
                    <div>
                      <span className="fw-medium me-2">{file.name}</span>
                      <span className="text-muted small">({formatFileSize(file.size)})</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => removeAttachment(idx)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="d-flex justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-zen-secondary px-4"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-zen-primary px-4 d-inline-flex align-items-center"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Submitting…
              </>
            ) : (
              "Submit Ticket"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
