import crypto from "crypto";
import { logger } from "../utils/logger";

/**
 * Link Guard Agent — Protects conversations shared via links.
 *
 * Capabilities beyond human:
 * - Generates cryptographically secure share tokens
 * - Enforces time-limited, view-limited, PIN-protected, IP-restricted access
 * - Automatically invalidates compromised links
 * - Tracks access patterns and revokes on anomalies
 */

export interface StoredLink {
  token: string;
  conversationId: string;
  createdBy: string;
  expiresAt: Date;
  maxViews: number;
  currentViews: number;
  pinHash: string | null;
  ipWhitelist: string[];
  oneTimeView: boolean;
  active: boolean;
  accessLog: Array<{ ip: string; timestamp: Date; userAgent: string }>;
  createdAt: Date;
}

// In-memory store (production would use Redis/DB)
const linkStore = new Map<string, StoredLink>();
const CLEANUP_INTERVAL_MS = 60_000;

/**
 * Generate a secure share token (URL-safe, 32 bytes).
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Hash a PIN for storage (never store plaintext).
 */
function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

/**
 * Create a protected share link for a conversation.
 */
export function createShareLink(params: {
  conversationId: string;
  createdBy: string;
  expiresInMinutes: number;
  maxViews: number;
  pin?: string;
  oneTimeView: boolean;
  ipWhitelist: string[];
}): StoredLink {
  const token = generateToken();
  const link: StoredLink = {
    token,
    conversationId: params.conversationId,
    createdBy: params.createdBy,
    expiresAt: new Date(Date.now() + params.expiresInMinutes * 60_000),
    maxViews: params.maxViews,
    currentViews: 0,
    pinHash: params.pin ? hashPin(params.pin) : null,
    ipWhitelist: params.ipWhitelist,
    oneTimeView: params.oneTimeView,
    active: true,
    accessLog: [],
    createdAt: new Date(),
  };
  linkStore.set(token, link);
  logger.info("LinkGuard: Share link created", {
    token: token.substring(0, 8) + "...",
    conversationId: params.conversationId,
    expiresInMinutes: params.expiresInMinutes,
  });
  return link;
}

/**
 * Validate access to a shared link — checks all constraints.
 */
export function validateLinkAccess(
  token: string,
  ip: string,
  userAgent: string,
  pin?: string
): { allowed: boolean; reason?: string; conversationId?: string } {
  const link = linkStore.get(token);
  if (!link) {
    return { allowed: false, reason: "Lien invalide ou expiré" };
  }

  if (!link.active) {
    return { allowed: false, reason: "Ce lien a été révoqué" };
  }

  if (new Date() > link.expiresAt) {
    link.active = false;
    return { allowed: false, reason: "Ce lien a expiré" };
  }

  if (link.currentViews >= link.maxViews) {
    link.active = false;
    return { allowed: false, reason: "Nombre maximum de consultations atteint" };
  }

  if (link.ipWhitelist.length > 0 && !link.ipWhitelist.includes(ip)) {
    logger.warn("LinkGuard: IP not whitelisted", { token: token.substring(0, 8), ip });
    return { allowed: false, reason: "Accès non autorisé depuis cette adresse" };
  }

  if (link.pinHash && (!pin || hashPin(pin) !== link.pinHash)) {
    return { allowed: false, reason: "PIN incorrect" };
  }

  // Anomaly detection: same link accessed from too many different IPs
  const uniqueIPs = new Set(link.accessLog.map((a) => a.ip));
  if (uniqueIPs.size > 5 && !uniqueIPs.has(ip)) {
    logger.warn("LinkGuard: Anomalous access pattern detected", {
      token: token.substring(0, 8),
      uniqueIPs: uniqueIPs.size,
    });
    link.active = false;
    return { allowed: false, reason: "Lien révoqué pour activité suspecte" };
  }

  // Record access
  link.currentViews++;
  link.accessLog.push({ ip, timestamp: new Date(), userAgent });

  if (link.oneTimeView) {
    link.active = false;
  }

  return { allowed: true, conversationId: link.conversationId };
}

/**
 * Revoke a share link immediately.
 */
export function revokeLink(token: string, userId: string): boolean {
  const link = linkStore.get(token);
  if (!link || link.createdBy !== userId) return false;
  link.active = false;
  logger.info("LinkGuard: Link revoked", { token: token.substring(0, 8) });
  return true;
}

/**
 * Get all active links for a user.
 */
export function getUserLinks(userId: string): StoredLink[] {
  return Array.from(linkStore.values()).filter(
    (l) => l.createdBy === userId && l.active && new Date() < l.expiresAt
  );
}

/**
 * Get agent metrics.
 */
export function getLinkGuardMetrics(): {
  activeLinks: number;
  totalCreated: number;
  totalAccesses: number;
  blockedAccesses: number;
} {
  let totalAccesses = 0;
  let blockedAccesses = 0;
  for (const link of linkStore.values()) {
    totalAccesses += link.accessLog.length;
    if (!link.active && link.currentViews < link.maxViews) {
      blockedAccesses++;
    }
  }
  return {
    activeLinks: Array.from(linkStore.values()).filter(
      (l) => l.active && new Date() < l.expiresAt
    ).length,
    totalCreated: linkStore.size,
    totalAccesses,
    blockedAccesses,
  };
}

// Periodic cleanup of expired links
setInterval(() => {
  const now = new Date();
  for (const [token, link] of linkStore.entries()) {
    if (now > link.expiresAt || (!link.active && now.getTime() - link.createdAt.getTime() > 86_400_000)) {
      linkStore.delete(token);
    }
  }
}, CLEANUP_INTERVAL_MS).unref();
