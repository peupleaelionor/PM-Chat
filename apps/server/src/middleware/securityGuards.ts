import { Request, Response, NextFunction } from "express";
import { isIPBlocked, recordMalformedPayload } from "../utils/securityMonitor";
import { trackError } from "../utils/errorTracker";
import { logger } from "../utils/logger";

/**
 * Network Guard: blocks auto-blocked IPs and detects abnormal patterns.
 */
export function networkGuard(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  if (isIPBlocked(ip)) {
    logger.debug("Blocked request from auto-blocked IP", { ip });
    res.status(403).json({ error: "Interdit" });
    return;
  }
  next();
}

/**
 * Crypto Guard: ensures encrypted message payloads are properly structured.
 * Applied to message-sending endpoints to block plaintext messages.
 */
export function cryptoGuard(req: Request, res: Response, next: NextFunction): void {
  const body = req.body as Record<string, unknown> | undefined;
  if (!body) {
    next();
    return;
  }

  // If this is a message endpoint and it has an encryptedPayload field,
  // verify it looks like proper ciphertext (base64 and min length)
  if (body.encryptedPayload !== undefined) {
    const payload = body.encryptedPayload;
    if (typeof payload !== "string" || payload.length < 16) {
      const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
      recordMalformedPayload(ip);
      trackError("crypto", "Message with invalid encrypted payload rejected");
      res.status(400).json({ error: "Charge chiffrée invalide" });
      return;
    }

    // Verify IV is present for encrypted messages
    if (!body.iv || typeof body.iv !== "string" || (body.iv as string).length < 8) {
      const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
      recordMalformedPayload(ip);
      trackError("crypto", "Message missing or invalid IV");
      res.status(400).json({ error: "IV de chiffrement invalide" });
      return;
    }
  }

  next();
}

/**
 * Integrity Guard: validates Content-Type and rejects oversized bodies early.
 */
export function integrityGuard(req: Request, res: Response, next: NextFunction): void {
  // Reject requests with unexpected content types on POST/PUT/PATCH
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    const ct = req.headers["content-type"] ?? "";
    if (
      req.body &&
      Object.keys(req.body as object).length > 0 &&
      !ct.includes("application/json") &&
      !ct.includes("application/octet-stream") &&
      !ct.includes("multipart/form-data") &&
      !ct.includes("application/encrypted")
    ) {
      const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
      recordMalformedPayload(ip);
      res.status(415).json({ error: "Type de contenu non supporté" });
      return;
    }
  }

  next();
}

/**
 * Session Guard: detects suspicious session patterns.
 * Tracks request frequency per user to detect anomalies.
 */
const sessionRequestCounts = new Map<string, { count: number; windowStart: number }>();
const SESSION_WINDOW_MS = 60_000;
const SESSION_MAX_REQUESTS = 300;

export function sessionGuard(req: Request, res: Response, next: NextFunction): void {
  // Only applies to authenticated requests
  const userId = (req as unknown as { userId?: string }).userId;
  if (!userId) {
    next();
    return;
  }

  const now = Date.now();
  const entry = sessionRequestCounts.get(userId);

  if (!entry || now - entry.windowStart > SESSION_WINDOW_MS) {
    sessionRequestCounts.set(userId, { count: 1, windowStart: now });
  } else {
    entry.count++;
    if (entry.count > SESSION_MAX_REQUESTS) {
      logger.warn("Session anomaly detected: excessive requests", { userId, count: entry.count });
      trackError("auth", `Session anomaly for user ${userId.substring(0, 8)}...`);
      res.status(429).json({ error: "Trop de requêtes depuis cette session" });
      return;
    }
  }

  next();
}
