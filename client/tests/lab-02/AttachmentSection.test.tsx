import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import AttachmentSection from "../../src/components/AttachmentSection.js";

const mockActiveRequester = {
  id: 1,
  displayName: "Jennifer Anderson",
  email: "jennifer.anderson@kmutt.ac.th",
  role: "REQUESTER",
  isActive: true,
};

const mockAttachments = [
  {
    id: 1,
    ticketId: 101,
    originalFilename: "diagnostics_report.pdf",
    mimeType: "application/pdf",
    sizeBytes: 204800,
    uploadedById: 1,
    uploadedByName: "Jennifer Anderson",
    isDeleted: false,
    isRemoved: false,
    deletedAt: null,
    removedAt: null,
    removalReason: null,
    createdAt: "2026-09-03T10:15:30.000Z",
  },
  {
    id: 2,
    ticketId: 101,
    originalFilename: "system_error_screenshot.png",
    mimeType: "image/png",
    sizeBytes: 512000,
    uploadedById: 1,
    uploadedByName: "Jennifer Anderson",
    isDeleted: true,
    isRemoved: true,
    deletedAt: "2026-09-03T10:20:00.000Z",
    removedAt: "2026-09-03T10:20:00.000Z",
    removalReason: "Uploaded duplicate file by accident",
    createdAt: "2026-09-03T10:16:00.000Z",
  },
];

describe("UI-08: Attachment Section Component", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("toktickit_selected_requester", JSON.stringify(mockActiveRequester));
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("UI-08.1: renders active attachments with filename, formatted size, and action buttons", () => {
    render(
      <RequesterProvider>
        <AttachmentSection
          ticketId={101}
          attachments={mockAttachments}
          onAttachmentChanged={vi.fn()}
        />
      </RequesterProvider>
    );

    expect(screen.getByText("diagnostics_report.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Remove/i })).toBeInTheDocument();
  });

  it("UI-08.2: renders soft-removed attachments as tombstones with removal reason and disabled download", () => {
    render(
      <RequesterProvider>
        <AttachmentSection
          ticketId={101}
          attachments={mockAttachments}
          onAttachmentChanged={vi.fn()}
        />
      </RequesterProvider>
    );

    expect(screen.getByText("system_error_screenshot.png")).toBeInTheDocument();
    expect(screen.getByText(/Uploaded duplicate file by accident/i)).toBeInTheDocument();
    expect(screen.getByText(/Download Unavailable/i)).toBeInTheDocument();
  });

  it("UI-08.3: clicking Remove opens modal; submitting empty reason displays validation error", async () => {
    render(
      <RequesterProvider>
        <AttachmentSection
          ticketId={101}
          attachments={mockAttachments}
          onAttachmentChanged={vi.fn()}
        />
      </RequesterProvider>
    );

    const removeBtn = screen.getByRole("button", { name: /Remove/i });
    fireEvent.click(removeBtn);

    // Modal opens
    expect(screen.getByText(/Confirm Attachment Removal/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: /Confirm Removal/i });
    fireEvent.click(confirmBtn);

    // Validation error appears
    await waitFor(() => {
      expect(screen.getByText(/Removal reason is required/i)).toBeInTheDocument();
    });
  });

  it("UI-08.4: submitting valid removal reason calls DELETE API and closes modal", async () => {
    const onAttachmentChangedMock = vi.fn();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 1, isDeleted: true }),
    } as any);

    render(
      <RequesterProvider>
        <AttachmentSection
          ticketId={101}
          attachments={mockAttachments}
          onAttachmentChanged={onAttachmentChangedMock}
        />
      </RequesterProvider>
    );

    const removeBtn = screen.getByRole("button", { name: /Remove/i });
    fireEvent.click(removeBtn);

    const textarea = screen.getByPlaceholderText(/Enter reason for removal/i);
    fireEvent.change(textarea, { target: { value: "Replaced with updated diagnostics report" } });

    const confirmBtn = screen.getByRole("button", { name: /Confirm Removal/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/tickets/101/attachments/1"),
        expect.objectContaining({ method: "DELETE" })
      );
      expect(onAttachmentChangedMock).toHaveBeenCalled();
    });
  });

  it("UI-08.5: displays active attachment count and hides upload form when limit of 5 is reached", () => {
    const fiveActiveAttachments = Array.from({ length: 5 }, (_, i) => ({
      id: i + 10,
      ticketId: 101,
      originalFilename: `file_${i + 1}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: 100000,
      uploadedById: 1,
      uploadedByName: "Jennifer Anderson",
      isDeleted: false,
      isRemoved: false,
      deletedAt: null,
      removedAt: null,
      removalReason: null,
      createdAt: "2026-09-03T10:15:30.000Z",
    }));

    render(
      <RequesterProvider>
        <AttachmentSection
          ticketId={101}
          attachments={fiveActiveAttachments}
          onAttachmentChanged={vi.fn()}
        />
      </RequesterProvider>
    );

    expect(screen.getByText(/5 of 5 active/i)).toBeInTheDocument();
    expect(screen.getByText(/Maximum limit of 5 active attachments reached/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Upload Attachment/i)).not.toBeInTheDocument();
  });

  it("UI-08.6: uploading a valid file sends multipart request and invokes onAttachmentChanged", async () => {
    const onAttachmentChangedMock = vi.fn();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        id: 3,
        ticketId: 101,
        originalFilename: "network_log.pdf",
        mimeType: "application/pdf",
        sizeBytes: 12345,
        uploadedById: 1,
        isDeleted: false,
        isRemoved: false,
      }),
    } as any);

    render(
      <RequesterProvider>
        <AttachmentSection
          ticketId={101}
          attachments={mockAttachments}
          onAttachmentChanged={onAttachmentChangedMock}
        />
      </RequesterProvider>
    );

    const fileInput = screen.getByTestId("attachment-file-input");
    const validFile = new File([new ArrayBuffer(1024)], "network_log.pdf", { type: "application/pdf" });

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/tickets/101/attachments"),
        expect.objectContaining({ method: "POST" })
      );
      expect(onAttachmentChangedMock).toHaveBeenCalled();
    });
  });

  it("UI-08.7: rejects oversized file (> 5 MB) or invalid extension with immediate client validation error", async () => {
    render(
      <RequesterProvider>
        <AttachmentSection
          ticketId={101}
          attachments={mockAttachments}
          onAttachmentChanged={vi.fn()}
        />
      </RequesterProvider>
    );

    const fileInput = screen.getByTestId("attachment-file-input");

    // 1. Oversized file test
    const oversizedFile = new File([new ArrayBuffer(6 * 1024 * 1024)], "huge.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

    await waitFor(() => {
      expect(screen.getByText(/File exceeds the maximum allowed size of 5 MB/i)).toBeInTheDocument();
    });

    // 2. Invalid extension test
    const invalidFile = new File([new ArrayBuffer(1024)], "script.exe", { type: "application/x-msdownload" });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Invalid file type/i)).toBeInTheDocument();
    });
  });

  it("UI-08.8: renders empty attachment state when ticket has 0 attachments", () => {
    render(
      <RequesterProvider>
        <AttachmentSection
          ticketId={101}
          attachments={[]}
          onAttachmentChanged={vi.fn()}
        />
      </RequesterProvider>
    );

    expect(screen.getByText(/No attachments uploaded for this ticket yet/i)).toBeInTheDocument();
    expect(screen.getByText(/0 of 5 active/i)).toBeInTheDocument();
  });
});
