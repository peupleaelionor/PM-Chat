import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config";
import { authMiddleware } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";
import { logger } from "../utils/logger";

const router = Router();
router.use(authMiddleware);

// Store encrypted blobs with UUID filenames – the original filename is discarded
// so no metadata leaks. The client is responsible for encrypting the file before upload.
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.UPLOAD_DIR),
  filename: (_req, _file, cb) => {
    // Use a UUID so the filename reveals nothing about content or sender
    cb(null, `${uuidv4()}.enc`);
  },
});

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  // Accept only the opaque encrypted content type
  if (
    file.mimetype === "application/octet-stream" ||
    file.mimetype === "application/encrypted"
  ) {
    cb(null, true);
  } else {
    cb(createError("Seuls les blobs binaires chiffrés sont acceptés (application/octet-stream)", 415));
  }
}

const upload = multer({
  storage,
  limits: { fileSize: config.maxFileSizeBytes },
  fileFilter,
});

/**
 * POST /api/attachments
 * Accepts a single encrypted binary blob and returns a URL the client
 * can embed in the encryptedAttachmentUrl field of a message.
 *
 * The client MUST encrypt the file before uploading. The server never
 * sees the plaintext.
 */
router.post(
  "/",
  upload.single("file"),
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.file) {
        next(createError("Aucun fichier fourni", 400));
        return;
      }

      const filename = req.file.filename;
      // Return a URL relative to the server origin that can be fetched later
      const url = `/api/attachments/${filename}`;

      logger.info("Attachment uploaded", {
        userId: req.userId,
        filename,
        size: req.file.size,
      });

      res.status(201).json({ url, filename });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/attachments/:filename
 * Streams the encrypted blob back to the requesting client.
 * Auth required – only authenticated users can download attachments.
 */
router.get("/:filename", (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Sanitise the filename to prevent path traversal
    const filename = path.basename(req.params["filename"] ?? "");

    if (!filename.endsWith(".enc") || filename.includes("..")) {
      next(createError("Nom de fichier invalide", 400));
      return;
    }

    const filePath = path.resolve(config.UPLOAD_DIR, filename);

    res.setHeader("Content-Type", "application/octet-stream");
    res.sendFile(filePath, (err) => {
      if (err) next(createError("Pièce jointe introuvable", 404));
    });
  } catch (err) {
    next(err);
  }
});

export default router;
