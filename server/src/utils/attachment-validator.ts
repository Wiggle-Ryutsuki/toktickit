export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB = 5,242,880 bytes
export const MAX_ATTACHMENTS_PER_TICKET = 5;

export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".pdf",
]);

export interface AttachmentValidationResult {
  valid: boolean;
  error?: {
    code: "UNSUPPORTED_MEDIA_TYPE" | "FILE_TOO_LARGE";
    message: string;
  };
}

export interface AttachmentCountValidationResult {
  valid: boolean;
  error?: {
    code: "ATTACHMENT_LIMIT_EXCEEDED";
    message?: string;
  };
}

export function validateAttachment(file: {
  originalname: string;
  mimetype: string;
  size: number;
}): AttachmentValidationResult {
  const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf("."));

  if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: {
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: `File '${file.originalname}' has an unsupported file type. Allowed types: JPG, PNG, WEBP, PDF.`,
      },
    };
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return {
      valid: false,
      error: {
        code: "FILE_TOO_LARGE",
        message: `File '${file.originalname}' exceeds the maximum allowed size of 5 MB (5,242,880 bytes).`,
      },
    };
  }

  return { valid: true };
}

export function validateAttachmentCount(count: number): AttachmentCountValidationResult {
  if (count > MAX_ATTACHMENTS_PER_TICKET) {
    return {
      valid: false,
      error: {
        code: "ATTACHMENT_LIMIT_EXCEEDED",
      },
    };
  }

  return { valid: true };
}
