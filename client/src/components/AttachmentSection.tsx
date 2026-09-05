import React, { useState, useRef } from "react";
import { useRequester } from "../context/RequesterContext.js";
import SoftRemovalModal from "./SoftRemovalModal.js";

export interface AttachmentDto {
  id: number;
  ticketId: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: number;
  uploadedByName?: string | null;
  isDeleted: boolean;
  isRemoved?: boolean;
  deletedAt?: string | null;
  removedAt?: string | null;
  removalReason?: string | null;
  createdAt: string;
}

export interface AttachmentSectionProps {
  ticketId: number;
  attachments: AttachmentDto[];
  onAttachmentChanged: () => void;
  isClosed?: boolean;
}

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

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export default function AttachmentSection({
  ticketId,
  attachments,
  onAttachmentChanged,
  isClosed = false,
}: AttachmentSectionProps) {
  const { selectedRequester } = useRequester();

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Soft Removal Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<AttachmentDto | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Download error state
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Split active and soft-removed attachments
  const activeAttachments = attachments.filter(
    (a) => !a.isDeleted && !a.isRemoved && !a.deletedAt
  );
  const tombstoneAttachments = attachments.filter(
    (a) => a.isDeleted || a.isRemoved || Boolean(a.deletedAt)
  );

  const activeCount = activeAttachments.length;
  const isLimitReached = activeCount >= MAX_ACTIVE_ATTACHMENTS;

  // Handle File Selection & Upload
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Client-side validation: Size check
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("File exceeds the maximum allowed size of 5 MB (5,242,880 bytes).");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Client-side validation: Type/extension check
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    const isValidExt = ALLOWED_EXTENSIONS.includes(ext);
    const isValidMime = ALLOWED_MIME_TYPES.includes(file.type);

    if (!isValidExt || (!isValidMime && file.type !== "")) {
      setUploadError("Invalid file type. Allowed formats: JPG, PNG, WEBP, PDF.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Check active limit
    if (activeCount >= MAX_ACTIVE_ATTACHMENTS) {
      setUploadError("Maximum limit of 5 active attachments reached for this ticket.");
      if (fileInputRef.current) fileInputRef.current.value = "";
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
      if (fileInputRef.current) fileInputRef.current.value = "";
      onAttachmentChanged();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload attachment.");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Download
  const handleDownload = async (att: AttachmentDto) => {
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
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed.");
    }
  };

  // Open Soft-Removal Modal
  const openRemovalModal = (att: AttachmentDto) => {
    setSelectedAttachment(att);
    setModalOpen(true);
  };

  // Confirm Soft-Removal
  const handleConfirmRemoval = async (reason: string) => {
    if (!selectedAttachment) return;

    setIsRemoving(true);
    try {
      const res = await fetch(
        `${API_URL}/api/tickets/${ticketId}/attachments/${selectedAttachment.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "X-Requester-Id": selectedRequester ? String(selectedRequester.id) : "1",
          },
          body: JSON.stringify({ removalReason: reason }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to remove attachment.");
      }

      setModalOpen(false);
      setSelectedAttachment(null);
      onAttachmentChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove attachment.");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0 fw-semibold text-dark">Attachments</h5>
          <span className="small text-muted">
            {activeCount} of {MAX_ACTIVE_ATTACHMENTS} active
          </span>
        </div>
      </div>

      <div className="card-body p-4">
        {/* Error Alerts */}
        {downloadError && (
          <div className="alert alert-danger py-2 px-3 mb-3 small" role="alert">
            {downloadError}
          </div>
        )}
        {uploadError && (
          <div className="alert alert-danger py-2 px-3 mb-3 small" role="alert">
            {uploadError}
          </div>
        )}

        {/* Empty State */}
        {attachments.length === 0 && (
          <div className="text-center py-4 mb-3 border border-dashed rounded bg-light">
            <p className="text-muted mb-1">No attachments uploaded for this ticket yet.</p>
            <span className="small text-muted">
              You can upload up to {MAX_ACTIVE_ATTACHMENTS} active files (JPG, PNG, WEBP, PDF &le; 5 MB).
            </span>
          </div>
        )}

        {/* Active Attachments List */}
        {activeAttachments.length > 0 && (
          <div className="mb-4">
            <h6 className="fw-semibold text-muted text-uppercase small mb-2">Active Files</h6>
            <div className="list-group">
              {activeAttachments.map((att) => (
                <div
                  key={att.id}
                  className="list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-sm-center py-3 px-3 gap-2"
                >
                  <div className="d-flex align-items-center gap-3 overflow-hidden">
                    <span className="fs-4 text-primary">📄</span>
                    <div className="overflow-hidden">
                      <div className="fw-semibold text-dark text-truncate" title={att.originalFilename}>
                        {att.originalFilename}
                      </div>
                      <div className="small text-muted">
                        {formatBytes(att.sizeBytes)} &bull; Uploaded {formatDate(att.createdAt)}
                        {att.uploadedByName ? ` by ${att.uploadedByName}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="d-flex gap-2 align-items-center justify-content-end flex-shrink-0">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => handleDownload(att)}
                    >
                      Download
                    </button>
                    {!isClosed && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => openRemovalModal(att)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Soft-Removed Attachments (Tombstones) */}
        {tombstoneAttachments.length > 0 && (
          <div className="mb-4">
            <h6 className="fw-semibold text-muted text-uppercase small mb-2">
              Removed Attachments ({tombstoneAttachments.length})
            </h6>
            <div className="list-group">
              {tombstoneAttachments.map((att) => (
                <div
                  key={att.id}
                  className="list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-sm-center py-3 px-3 gap-2 border-start border-secondary border-3"
                  style={{ backgroundColor: "#f8f9fa" }}
                >
                  <div className="d-flex align-items-center gap-3 overflow-hidden">
                    <span className="fs-4 text-muted">🗑</span>
                    <div className="overflow-hidden">
                      <div className="d-flex align-items-center gap-2">
                        <span className="text-muted text-decoration-line-through text-truncate fw-medium">
                          {att.originalFilename}
                        </span>
                        <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle small">
                          Removed
                        </span>
                      </div>
                      <div className="small text-muted mt-1">
                        {att.deletedAt || att.removedAt ? `Removed on ${formatDate(att.deletedAt ?? att.removedAt!)}` : "Removed"}
                        {att.uploadedByName ? ` by ${att.uploadedByName}` : ""}
                      </div>
                      {att.removalReason && (
                        <div className="small text-muted mt-1 fst-italic">
                          Reason: &ldquo;{att.removalReason}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <span
                      className="badge bg-light text-muted border py-2 px-3 fw-normal"
                      aria-disabled="true"
                    >
                      Download Unavailable
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Attachment Upload Control */}
        {!isClosed && (
          <div className="mt-3">
            {isLimitReached ? (
              <div className="alert alert-warning py-2 px-3 small d-flex align-items-center gap-2" role="alert">
                <span>⚠️</span>
                <div>
                  <strong>Maximum limit of 5 active attachments reached.</strong> To upload another file,
                  remove an existing active attachment to recover a slot.
                </div>
              </div>
            ) : (
              <div className="border border-dashed rounded p-3 text-center bg-light">
                <label
                  htmlFor="attachment-upload-input"
                  className="form-label small fw-semibold text-dark mb-1 d-block"
                >
                  Upload Attachment
                </label>
                <input
                  id="attachment-upload-input"
                  data-testid="attachment-file-input"
                  ref={fileInputRef}
                  type="file"
                  className="form-control form-control-sm mx-auto mb-2"
                  style={{ maxWidth: 400 }}
                  accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileSelected}
                  disabled={isUploading}
                />
                <div className="small text-muted">
                  Allowed formats: JPG, PNG, WEBP, PDF &bull; Maximum size: 5 MB &bull; Active cap: 5 files
                </div>
                {isUploading && (
                  <div className="mt-2 small text-primary d-flex align-items-center justify-content-center gap-2">
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    Uploading attachment...
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {selectedAttachment && (
        <SoftRemovalModal
          isOpen={modalOpen}
          filename={selectedAttachment.originalFilename}
          attachmentId={selectedAttachment.id}
          isSubmitting={isRemoving}
          onConfirm={handleConfirmRemoval}
          onCancel={() => {
            setModalOpen(false);
            setSelectedAttachment(null);
          }}
        />
      )}
    </div>
  );
}
