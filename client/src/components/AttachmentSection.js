import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef } from "react";
import { useRequester } from "../context/RequesterContext.js";
import SoftRemovalModal from "./SoftRemovalModal.js";
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const MAX_ACTIVE_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
];
export function formatBytes(bytes, decimals = 1) {
    if (bytes === 0)
        return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
export function formatDate(isoString) {
    try {
        const d = new Date(isoString);
        return d.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }
    catch {
        return isoString;
    }
}
export default function AttachmentSection({ ticketId, attachments, onAttachmentChanged, isClosed = false, }) {
    const { selectedRequester } = useRequester();
    const [uploadError, setUploadError] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    // Soft Removal Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedAttachment, setSelectedAttachment] = useState(null);
    const [isRemoving, setIsRemoving] = useState(false);
    // Download error state
    const [downloadError, setDownloadError] = useState(null);
    const fileInputRef = useRef(null);
    // Split active and soft-removed attachments
    const activeAttachments = attachments.filter((a) => !a.isDeleted && !a.isRemoved && !a.deletedAt);
    const tombstoneAttachments = attachments.filter((a) => a.isDeleted || a.isRemoved || Boolean(a.deletedAt));
    const activeCount = activeAttachments.length;
    const isLimitReached = activeCount >= MAX_ACTIVE_ATTACHMENTS;
    // Handle File Selection & Upload
    const handleFileSelected = async (e) => {
        setUploadError(null);
        const files = e.target.files;
        if (!files || files.length === 0)
            return;
        const file = files[0];
        // Client-side validation: Size check
        if (file.size > MAX_FILE_SIZE) {
            setUploadError("File exceeds the maximum allowed size of 5 MB (5,242,880 bytes).");
            if (fileInputRef.current)
                fileInputRef.current.value = "";
            return;
        }
        // Client-side validation: Type/extension check
        const ext = "." + file.name.split(".").pop()?.toLowerCase();
        const isValidExt = ALLOWED_EXTENSIONS.includes(ext);
        const isValidMime = ALLOWED_MIME_TYPES.includes(file.type);
        if (!isValidExt || (!isValidMime && file.type !== "")) {
            setUploadError("Invalid file type. Allowed formats: JPG, PNG, WEBP, PDF.");
            if (fileInputRef.current)
                fileInputRef.current.value = "";
            return;
        }
        // Check active limit
        if (activeCount >= MAX_ACTIVE_ATTACHMENTS) {
            setUploadError("Maximum limit of 5 active attachments reached for this ticket.");
            if (fileInputRef.current)
                fileInputRef.current.value = "";
            return;
        }
        // Perform Upload
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
                method: "POST",
                headers: {
                    "X-Requester-Id": selectedRequester ? String(selectedRequester.id) : "1",
                },
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error?.message || "Failed to upload attachment.");
            }
            // Reset input & trigger refresh
            if (fileInputRef.current)
                fileInputRef.current.value = "";
            onAttachmentChanged();
        }
        catch (err) {
            setUploadError(err instanceof Error ? err.message : "Failed to upload attachment.");
        }
        finally {
            setIsUploading(false);
        }
    };
    // Handle Download
    const handleDownload = async (att) => {
        setDownloadError(null);
        try {
            const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments/${att.id}`, {
                headers: {
                    "X-Requester-Id": selectedRequester ? String(selectedRequester.id) : "1",
                },
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                if (res.status === 410) {
                    throw new Error("This attachment has been removed and cannot be downloaded.");
                }
                if (res.status === 403) {
                    throw new Error("You do not have permission to download this attachment.");
                }
                throw new Error(errorData.error?.message || "Failed to download file.");
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = att.originalFilename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        }
        catch (err) {
            setDownloadError(err instanceof Error ? err.message : "Download failed.");
        }
    };
    // Open Soft-Removal Modal
    const openRemovalModal = (att) => {
        setSelectedAttachment(att);
        setModalOpen(true);
    };
    // Confirm Soft-Removal
    const handleConfirmRemoval = async (reason) => {
        if (!selectedAttachment)
            return;
        setIsRemoving(true);
        try {
            const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments/${selectedAttachment.id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "X-Requester-Id": selectedRequester ? String(selectedRequester.id) : "1",
                },
                body: JSON.stringify({ removalReason: reason }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error?.message || "Failed to remove attachment.");
            }
            setModalOpen(false);
            setSelectedAttachment(null);
            onAttachmentChanged();
        }
        catch (err) {
            alert(err instanceof Error ? err.message : "Failed to remove attachment.");
        }
        finally {
            setIsRemoving(false);
        }
    };
    return (_jsxs("div", { className: "card border-0 shadow-sm mb-4", children: [_jsx("div", { className: "card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center", children: _jsxs("div", { children: [_jsx("h5", { className: "mb-0 fw-semibold text-dark", children: "Attachments" }), _jsxs("span", { className: "small text-muted", children: [activeCount, " of ", MAX_ACTIVE_ATTACHMENTS, " active"] })] }) }), _jsxs("div", { className: "card-body p-4", children: [downloadError && (_jsx("div", { className: "alert alert-danger py-2 px-3 mb-3 small", role: "alert", children: downloadError })), uploadError && (_jsx("div", { className: "alert alert-danger py-2 px-3 mb-3 small", role: "alert", children: uploadError })), attachments.length === 0 && (_jsxs("div", { className: "text-center py-4 mb-3 border border-dashed rounded bg-light", children: [_jsx("p", { className: "text-muted mb-1", children: "No attachments uploaded for this ticket yet." }), _jsxs("span", { className: "small text-muted", children: ["You can upload up to ", MAX_ACTIVE_ATTACHMENTS, " active files (JPG, PNG, WEBP, PDF \u2264 5 MB)."] })] })), activeAttachments.length > 0 && (_jsxs("div", { className: "mb-4", children: [_jsx("h6", { className: "fw-semibold text-muted text-uppercase small mb-2", children: "Active Files" }), _jsx("div", { className: "list-group", children: activeAttachments.map((att) => (_jsxs("div", { className: "list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-sm-center py-3 px-3 gap-2", children: [_jsxs("div", { className: "d-flex align-items-center gap-3 overflow-hidden", children: [_jsx("span", { className: "fs-4 text-primary", children: "\uD83D\uDCC4" }), _jsxs("div", { className: "overflow-hidden", children: [_jsx("div", { className: "fw-semibold text-dark text-truncate", title: att.originalFilename, children: att.originalFilename }), _jsxs("div", { className: "small text-muted", children: [formatBytes(att.sizeBytes), " \u2022 Uploaded ", formatDate(att.createdAt), att.uploadedByName ? ` by ${att.uploadedByName}` : ""] })] })] }), _jsxs("div", { className: "d-flex gap-2 align-items-center justify-content-end flex-shrink-0", children: [_jsx("button", { type: "button", className: "btn btn-sm btn-outline-primary", onClick: () => handleDownload(att), children: "Download" }), !isClosed && (_jsx("button", { type: "button", className: "btn btn-sm btn-outline-danger", onClick: () => openRemovalModal(att), children: "Remove" }))] })] }, att.id))) })] })), tombstoneAttachments.length > 0 && (_jsxs("div", { className: "mb-4", children: [_jsxs("h6", { className: "fw-semibold text-muted text-uppercase small mb-2", children: ["Removed Attachments (", tombstoneAttachments.length, ")"] }), _jsx("div", { className: "list-group", children: tombstoneAttachments.map((att) => (_jsxs("div", { className: "list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-sm-center py-3 px-3 gap-2 border-start border-secondary border-3", style: { backgroundColor: "#f8f9fa" }, children: [_jsxs("div", { className: "d-flex align-items-center gap-3 overflow-hidden", children: [_jsx("span", { className: "fs-4 text-muted", children: "\uD83D\uDDD1" }), _jsxs("div", { className: "overflow-hidden", children: [_jsxs("div", { className: "d-flex align-items-center gap-2", children: [_jsx("span", { className: "text-muted text-decoration-line-through text-truncate fw-medium", children: att.originalFilename }), _jsx("span", { className: "badge bg-secondary-subtle text-secondary border border-secondary-subtle small", children: "Removed" })] }), _jsxs("div", { className: "small text-muted mt-1", children: [att.deletedAt || att.removedAt ? `Removed on ${formatDate(att.deletedAt ?? att.removedAt)}` : "Removed", att.uploadedByName ? ` by ${att.uploadedByName}` : ""] }), att.removalReason && (_jsxs("div", { className: "small text-muted mt-1 fst-italic", children: ["Reason: \u201C", att.removalReason, "\u201D"] }))] })] }), _jsx("div", { className: "flex-shrink-0", children: _jsx("span", { className: "badge bg-light text-muted border py-2 px-3 fw-normal", "aria-disabled": "true", children: "Download Unavailable" }) })] }, att.id))) })] })), !isClosed && (_jsx("div", { className: "mt-3", children: isLimitReached ? (_jsxs("div", { className: "alert alert-warning py-2 px-3 small d-flex align-items-center gap-2", role: "alert", children: [_jsx("span", { children: "\u26A0\uFE0F" }), _jsxs("div", { children: [_jsx("strong", { children: "Maximum limit of 5 active attachments reached." }), " To upload another file, remove an existing active attachment to recover a slot."] })] })) : (_jsxs("div", { className: "border border-dashed rounded p-3 text-center bg-light", children: [_jsx("label", { htmlFor: "attachment-upload-input", className: "form-label small fw-semibold text-dark mb-1 d-block", children: "Upload Attachment" }), _jsx("input", { id: "attachment-upload-input", "data-testid": "attachment-file-input", ref: fileInputRef, type: "file", className: "form-control form-control-sm mx-auto mb-2", style: { maxWidth: 400 }, accept: ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf", onChange: handleFileSelected, disabled: isUploading }), _jsx("div", { className: "small text-muted", children: "Allowed formats: JPG, PNG, WEBP, PDF \u2022 Maximum size: 5 MB \u2022 Active cap: 5 files" }), isUploading && (_jsxs("div", { className: "mt-2 small text-primary d-flex align-items-center justify-content-center gap-2", children: [_jsx("span", { className: "spinner-border spinner-border-sm", role: "status", "aria-hidden": "true" }), "Uploading attachment..."] }))] })) }))] }), selectedAttachment && (_jsx(SoftRemovalModal, { isOpen: modalOpen, filename: selectedAttachment.originalFilename, attachmentId: selectedAttachment.id, isSubmitting: isRemoving, onConfirm: handleConfirmRemoval, onCancel: () => {
                    setModalOpen(false);
                    setSelectedAttachment(null);
                } }))] }));
}
