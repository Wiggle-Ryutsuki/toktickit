import { describe, it, expect } from "vitest";
import { validateAttachment, validateAttachmentCount } from "../../src/utils/attachment-validator.js";

describe("UT-02: Attachment Validator (BR-08, AC-06, AC-07)", () => {
  it("UT-02.1: accepts valid file extensions and MIME types", () => {
    const validFiles = [
      { originalname: "photo.jpg", mimetype: "image/jpeg", size: 1024 },
      { originalname: "screenshot.jpeg", mimetype: "image/jpeg", size: 2048 },
      { originalname: "diagram.png", mimetype: "image/png", size: 4096 },
      { originalname: "image.webp", mimetype: "image/webp", size: 8192 },
      { originalname: "log.pdf", mimetype: "application/pdf", size: 16384 },
    ];

    for (const file of validFiles) {
      const result = validateAttachment(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    }
  });

  it("UT-02.2: rejects disallowed file extensions and MIME types", () => {
    const invalidFiles = [
      { originalname: "setup.exe", mimetype: "application/x-msdownload", size: 1024 },
      { originalname: "script.sh", mimetype: "application/x-sh", size: 1024 },
      { originalname: "archive.zip", mimetype: "application/zip", size: 1024 },
      { originalname: "payload.js", mimetype: "text/javascript", size: 1024 },
      { originalname: "doc.docx", mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 1024 },
    ];

    for (const file of invalidFiles) {
      const result = validateAttachment(file);
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("UNSUPPORTED_MEDIA_TYPE");
    }
  });

  it("UT-02.3: validates 5 MB file size boundary", () => {
    const exact5MB = 5 * 1024 * 1024; // 5,242,880 bytes
    const over5MB = exact5MB + 1; // 5,242,881 bytes

    const validResult = validateAttachment({
      originalname: "report.pdf",
      mimetype: "application/pdf",
      size: exact5MB,
    });
    expect(validResult.valid).toBe(true);

    const invalidResult = validateAttachment({
      originalname: "report.pdf",
      mimetype: "application/pdf",
      size: over5MB,
    });
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.error?.code).toBe("FILE_TOO_LARGE");
  });

  it("UT-02.4: enforces maximum active attachment limit of 5", () => {
    expect(validateAttachmentCount(0)).toEqual({ valid: true });
    expect(validateAttachmentCount(1)).toEqual({ valid: true });
    expect(validateAttachmentCount(5)).toEqual({ valid: true });
    expect(validateAttachmentCount(6)).toEqual({
      valid: false,
      error: { code: "ATTACHMENT_LIMIT_EXCEEDED" },
    });
  });
});
