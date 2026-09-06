import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useRequester } from "../context/RequesterContext.js";
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_ATTACHMENTS = 5;
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export default function CreateTicket({ onCancel, onTicketCreated }) {
    const { selectedRequester } = useRequester();
    const [categories, setCategories] = useState([]);
    const [systems, setSystems] = useState([]);
    const [loadingRefData, setLoadingRefData] = useState(true);
    const [refDataError, setRefDataError] = useState(null);
    // Form Fields
    const [categoryId, setCategoryId] = useState("");
    const [relatedSystemId, setRelatedSystemId] = useState("");
    const [requestedPriority, setRequestedPriority] = useState("MEDIUM");
    const [summary, setSummary] = useState("");
    const [description, setDescription] = useState("");
    const [attachments, setAttachments] = useState([]);
    // State Feedback
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [globalError, setGlobalError] = useState(null);
    const [createdTicket, setCreatedTicket] = useState(null);
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
            }
            catch (err) {
                if (mounted) {
                    setRefDataError(err instanceof Error ? err.message : "Failed to load reference data.");
                }
            }
            finally {
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
    const formatFileSize = (bytes) => {
        if (bytes < 1024)
            return `${bytes} B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };
    // Handle File Selection
    const handleFileChange = (e) => {
        setErrors((prev) => ({ ...prev, attachments: undefined }));
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length === 0)
            return;
        if (attachments.length + selectedFiles.length > MAX_ATTACHMENTS) {
            setErrors((prev) => ({
                ...prev,
                attachments: `Maximum of ${MAX_ATTACHMENTS} files allowed per ticket.`,
            }));
            e.target.value = "";
            return;
        }
        const validNewFiles = [];
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
    const removeAttachment = (indexToRemove) => {
        setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
        setErrors((prev) => ({ ...prev, attachments: undefined }));
    };
    // Client validation
    const validateForm = () => {
        const newErrors = {};
        if (!summary.trim()) {
            newErrors.summary = "Summary is required and cannot be empty.";
        }
        else if (summary.trim().length < 5) {
            newErrors.summary = "Summary must be between 5 and 120 characters.";
        }
        else if (summary.trim().length > 120) {
            newErrors.summary = "Summary must be between 5 and 120 characters.";
        }
        if (!description.trim()) {
            newErrors.description = "Description is required and cannot be empty.";
        }
        else if (description.trim().length < 10) {
            newErrors.description = "Description must be at least 10 characters.";
        }
        else if (description.trim().length > 2000) {
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
    const handleSubmit = async (e) => {
        e.preventDefault();
        setGlobalError(null);
        if (!validateForm()) {
            return;
        }
        setSubmitting(true);
        try {
            let response;
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
            }
            else {
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
                    const apiFieldErrors = {};
                    for (const fe of data.error.fieldErrors) {
                        if (fe.field === "summary")
                            apiFieldErrors.summary = fe.message;
                        if (fe.field === "description")
                            apiFieldErrors.description = fe.message;
                        if (fe.field === "categoryId")
                            apiFieldErrors.categoryId = fe.message;
                        if (fe.field === "relatedSystemId")
                            apiFieldErrors.relatedSystemId = fe.message;
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
        }
        catch (err) {
            setGlobalError(err instanceof Error ? err.message : "An unexpected error occurred. Your inputs have been preserved.");
        }
        finally {
            setSubmitting(false);
        }
    };
    // If successfully created, render Success State
    if (createdTicket) {
        return (_jsx("div", { className: "container py-4", style: { maxWidth: "1140px" }, children: _jsxs("div", { className: "zen-success-banner shadow-sm", role: "status", children: [_jsxs("div", { className: "d-flex align-items-center mb-3", children: [_jsx("span", { className: "fs-3 me-2 text-success", children: "\u2714" }), _jsx("h3", { className: "mb-0 text-success fw-semibold", children: "Ticket created successfully!" })] }), _jsxs("p", { className: "fs-5 mb-3", children: ["Your ticket number is ", _jsx("strong", { className: "text-decoration-underline", children: createdTicket.ticketNo }), "."] }), _jsx("p", { className: "text-muted mb-4", children: "Our IT Support team has received your incident report and will begin reviewing it shortly." }), _jsxs("div", { className: "d-flex gap-3", children: [_jsx("button", { type: "button", className: "btn btn-zen-primary", onClick: () => alert(`View details for ticket ${createdTicket.ticketNo} (Available in Feature 8)`), children: "View Ticket Details" }), _jsx("button", { type: "button", className: "btn btn-zen-secondary", onClick: onCancel || (() => setCreatedTicket(null)), children: "Back to My Tickets" })] })] }) }));
    }
    return (_jsxs("div", { className: "container py-4", style: { maxWidth: "1140px" }, children: [_jsx("nav", { "aria-label": "breadcrumb", className: "mb-3", children: _jsxs("ol", { className: "breadcrumb", children: [_jsx("li", { className: "breadcrumb-item", children: _jsx("a", { href: "#my-tickets", onClick: (e) => { e.preventDefault(); onCancel?.(); }, className: "text-decoration-none", style: { color: "var(--color-primary-green)" }, children: "My Tickets" }) }), _jsx("li", { className: "breadcrumb-item active", "aria-current": "page", children: "Create Ticket" })] }) }), _jsx("h1", { className: "h3 fw-bold mb-4", style: { color: "var(--color-text-primary)" }, children: "Create IT Support Ticket" }), globalError && (_jsxs("div", { className: "alert alert-danger mb-4 shadow-sm", role: "alert", children: [_jsx("strong", { children: "Submission Error:" }), " ", globalError] })), refDataError && (_jsx("div", { className: "alert alert-warning mb-4", role: "alert", children: refDataError })), _jsxs("form", { onSubmit: handleSubmit, noValidate: true, children: [_jsx("div", { className: "zen-card p-3 mb-4 bg-light", children: _jsxs("div", { className: "row g-3", children: [_jsxs("div", { className: "col-md-4", children: [_jsx("label", { htmlFor: "ticketNo", className: "form-label small fw-semibold text-muted mb-1", children: "Ticket Number" }), _jsx("input", { id: "ticketNo", type: "text", readOnly: true, className: "form-control bg-readonly", value: `TKT-${currentYear}-##### (Auto)`, tabIndex: -1 })] }), _jsxs("div", { className: "col-md-4", children: [_jsx("label", { htmlFor: "ticketDate", className: "form-label small fw-semibold text-muted mb-1", children: "Ticket Date" }), _jsx("input", { id: "ticketDate", type: "text", readOnly: true, className: "form-control bg-readonly", value: formattedDate, tabIndex: -1 })] }), _jsxs("div", { className: "col-md-4", children: [_jsx("label", { htmlFor: "requester", className: "form-label small fw-semibold text-muted mb-1", children: "Requester" }), _jsx("input", { id: "requester", type: "text", readOnly: true, className: "form-control bg-readonly", value: selectedRequester
                                                ? `${selectedRequester.displayName} (${selectedRequester.email})`
                                                : "Simulated Development Requester", tabIndex: -1 })] })] }) }), _jsxs("div", { className: "zen-card p-4 mb-4", children: [_jsxs("div", { className: "row g-3 mb-4", children: [_jsxs("div", { className: "col-md-4", children: [_jsxs("label", { htmlFor: "categoryId", className: "form-label fw-semibold", children: ["Category ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("select", { id: "categoryId", className: `form-select ${errors.categoryId ? "is-invalid" : ""}`, value: categoryId, onChange: (e) => {
                                                    setCategoryId(e.target.value);
                                                    if (errors.categoryId)
                                                        setErrors((prev) => ({ ...prev, categoryId: undefined }));
                                                }, disabled: loadingRefData, children: [_jsx("option", { value: "", children: loadingRefData ? "Loading categories..." : "Select Category..." }), categories.map((c) => (_jsx("option", { value: c.id, children: c.name }, c.id)))] }), errors.categoryId && (_jsx("div", { className: "zen-field-error", role: "alert", children: errors.categoryId }))] }), _jsxs("div", { className: "col-md-4", children: [_jsxs("label", { htmlFor: "relatedSystemId", className: "form-label fw-semibold", children: ["Related System ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("select", { id: "relatedSystemId", className: `form-select ${errors.relatedSystemId ? "is-invalid" : ""}`, value: relatedSystemId, onChange: (e) => {
                                                    setRelatedSystemId(e.target.value);
                                                    if (errors.relatedSystemId)
                                                        setErrors((prev) => ({ ...prev, relatedSystemId: undefined }));
                                                }, disabled: loadingRefData, children: [_jsx("option", { value: "", children: loadingRefData ? "Loading systems..." : "Select Related System..." }), systems.map((s) => (_jsx("option", { value: s.id, children: s.name }, s.id)))] }), errors.relatedSystemId && (_jsx("div", { className: "zen-field-error", role: "alert", children: errors.relatedSystemId }))] }), _jsxs("div", { className: "col-md-4", children: [_jsxs("label", { htmlFor: "requestedPriority", className: "form-label fw-semibold", children: ["Requested Priority ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("select", { id: "requestedPriority", className: "form-select", value: requestedPriority, onChange: (e) => setRequestedPriority(e.target.value), children: [_jsx("option", { value: "LOW", children: "Low" }), _jsx("option", { value: "MEDIUM", children: "Medium" }), _jsx("option", { value: "HIGH", children: "High" }), _jsx("option", { value: "URGENT", children: "Urgent" })] })] })] }), _jsxs("div", { className: "mb-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-1", children: [_jsxs("label", { htmlFor: "summary", className: "form-label fw-semibold mb-0", children: ["Summary ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("span", { className: "small text-muted", children: [summary.length, " / 120"] })] }), _jsx("input", { id: "summary", type: "text", className: `form-control ${errors.summary ? "is-invalid" : ""}`, placeholder: "Brief summary of the issue", value: summary, maxLength: 120, onChange: (e) => {
                                            setSummary(e.target.value);
                                            if (errors.summary)
                                                setErrors((prev) => ({ ...prev, summary: undefined }));
                                        } }), errors.summary && (_jsx("div", { className: "zen-field-error", role: "alert", children: errors.summary }))] }), _jsxs("div", { className: "mb-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-1", children: [_jsxs("label", { htmlFor: "description", className: "form-label fw-semibold mb-0", children: ["Description ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("span", { className: "small text-muted", children: [description.length, " / 2000"] })] }), _jsx("textarea", { id: "description", className: `form-control ${errors.description ? "is-invalid" : ""}`, style: { minHeight: "120px", resize: "vertical" }, placeholder: "Detailed steps to reproduce or description of the problem", value: description, maxLength: 2000, onChange: (e) => {
                                            setDescription(e.target.value);
                                            if (errors.description)
                                                setErrors((prev) => ({ ...prev, description: undefined }));
                                        } }), errors.description && (_jsx("div", { className: "zen-field-error", role: "alert", children: errors.description }))] }), _jsxs("div", { className: "mb-3", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-2", children: [_jsxs("label", { htmlFor: "attachments", className: "form-label fw-semibold mb-0", children: ["Supporting Attachments ", _jsx("span", { className: "text-muted fw-normal", children: "(Optional)" })] }), _jsxs("span", { className: "small text-muted", children: [attachments.length, " of 5 files attached"] })] }), _jsxs("div", { className: "border border-dashed rounded p-3 text-center bg-light", children: [_jsx("input", { id: "attachments", type: "file", multiple: true, accept: ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf", className: "form-control mb-2", onChange: handleFileChange, disabled: attachments.length >= MAX_ATTACHMENTS }), _jsx("div", { className: "small text-muted", children: "Accepted types: JPG, PNG, WEBP, PDF (Up to 5 MB per file, max 5 files)." })] }), errors.attachments && (_jsx("div", { className: "zen-field-error mt-2", role: "alert", children: errors.attachments })), attachments.length > 0 && (_jsx("ul", { className: "list-group list-group-flush mt-3 border rounded", children: attachments.map((file, idx) => (_jsxs("li", { className: "list-group-item d-flex justify-content-between align-items-center py-2", children: [_jsxs("div", { children: [_jsx("span", { className: "fw-medium me-2", children: file.name }), _jsxs("span", { className: "text-muted small", children: ["(", formatFileSize(file.size), ")"] })] }), _jsx("button", { type: "button", className: "btn btn-sm btn-outline-danger", "aria-label": `Remove ${file.name}`, onClick: () => removeAttachment(idx), children: "Remove" })] }, idx))) }))] })] }), _jsxs("div", { className: "d-flex justify-content-end gap-2", children: [_jsx("button", { type: "button", className: "btn btn-zen-secondary px-4", onClick: onCancel, disabled: submitting, children: "Cancel" }), _jsx("button", { type: "submit", className: "btn btn-zen-primary px-4 d-inline-flex align-items-center", disabled: submitting, children: submitting ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "spinner-border spinner-border-sm me-2", role: "status", "aria-hidden": "true" }), "Submitting\u2026"] })) : ("Submit Ticket") })] })] })] }));
}
