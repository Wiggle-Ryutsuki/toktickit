import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_ATTACHMENTS_PER_TICKET,
} from "../utils/attachment-validator.js";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSlug = `${Date.now()}-${crypto.randomUUID()}${ext}`;
    cb(null, uniqueSlug);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_ATTACHMENT_SIZE_BYTES,
    files: MAX_ATTACHMENTS_PER_TICKET,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
      const error: any = new Error(
        `File '${file.originalname}' has an unsupported file type. Allowed types: JPG, PNG, WEBP, PDF.`
      );
      error.code = "UNSUPPORTED_MEDIA_TYPE";
      return cb(error);
    }
    cb(null, true);
  },
});
