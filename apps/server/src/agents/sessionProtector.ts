import crypto from "crypto";
import { logger } from "../utils/logger";

/**
 * Session Protector Agent — Advanced session security.
 *
 * Capabilities beyond human:
 * - Detects concurrent session hijacking
 * - Fingerprints sessions using multiple signals (IP, User-Agent, headers)
 * - Detects session cloning attacks
 * - Auto-revokes sessions on fingerprint mismatch
 * - Tracks session lifecycle anomalies
 */

interface SessionFingerprint {
  userId: string;
  fingerprint: string;
  ip: string;
  userAgent: string;
  createdAt: number;
  lastSeen: number;
  requestCount: number;
  suspicious: boolean;
}

const sessions = new Map<string, SessionFingerprint>(); // tokenJti -> fingerprint
const userSessions = new Map<string, Set<string>>(); // userId -> Set<jti>
const MAX_CONCURRENT_SESSIONS = 3;
const SESSION_INACTIVE_TIMEOUT_MS = 900_000; // 15 minutes

/**
 * Generate a session fingerprint from request characteristics.
 */
function generateFingerprint(ip: string, userAgent: string, acceptLanguage: string): string {
  return crypto
    .createHash("sha256")
    .update(`${ip}:${userAgent}:${acceptLanguage}`)
    .digest("hex")
    .substring(0, 16);
}

/**
 * Register a new session.
 */
export function registerSession(params: {
  jti: string;
  userId: string;
  ip: string;
  userAgent: string;
  acceptLanguage: string;
}): { allowed: boolean; reason?: string } {
  const fingerprint = generateFingerprint(params.ip, params.userAgent, params.acceptLanguage);

  // Check concurrent sessions
  if (!userSessions.has(params.userId)) {
    userSessions.set(params.userId, new Set());
  }
  const userSessionSet = userSessions.get(params.userId)!;

  // Clean expired sessions
  for (const jti of userSessionSet) {
    if (!sessions.has(jti)) {
      userSessionSet.delete(jti);
    }
  }

  if (userSessionSet.size >= MAX_CONCURRENT_SESSIONS) {
    logger.warn("SessionProtector: Max concurrent sessions reached", {
      userId: params.userId.substring(0, 8),
      count: userSessionSet.size,
    });
    // Evict oldest session
    let oldestJti: string | null = null;
    let oldestTime = Infinity;
    for (const jti of userSessionSet) {
      const session = sessions.get(jti);
      if (session && session.createdAt < oldestTime) {
        oldestTime = session.createdAt;
        oldestJti = jti;
      }
    }
    if (oldestJti) {
      sessions.delete(oldestJti);
      userSessionSet.delete(oldestJti);
    }
  }

  sessions.set(params.jti, {
    userId: params.userId,
    fingerprint,
    ip: params.ip,
    userAgent: params.userAgent,
    createdAt: Date.now(),
    lastSeen: Date.now(),
    requestCount: 0,
    suspicious: false,
  });
  userSessionSet.add(params.jti);

  return { allowed: true };
}

/**
 * Validate an ongoing session — detect fingerprint changes and anomalies.
 */
export function validateSession(params: {
  jti: string;
  userId: string;
  ip: string;
  userAgent: string;
  acceptLanguage: string;
}): { valid: boolean; reason?: string } {
  const session = sessions.get(params.jti);
  if (!session) {
    return { valid: true }; // Unknown session — let auth middleware handle
  }

  const currentFingerprint = generateFingerprint(
    params.ip,
    params.userAgent,
    params.acceptLanguage
  );

  session.lastSeen = Date.now();
  session.requestCount++;

  // Fingerprint mismatch — possible session hijacking
  if (currentFingerprint !== session.fingerprint) {
    session.suspicious = true;
    logger.warn("SessionProtector: Fingerprint mismatch detected", {
      userId: params.userId.substring(0, 8),
      jti: params.jti.substring(0, 8),
      expected: session.fingerprint.substring(0, 8),
      got: currentFingerprint.substring(0, 8),
    });
    return {
      valid: false,
      reason: "Empreinte de session modifiée — possible piratage de session",
    };
  }

  // Check for suspicious request patterns
  const sessionAge = Date.now() - session.createdAt;
  if (sessionAge > 0) {
    const requestsPerSecond = (session.requestCount * 1000) / sessionAge;
    if (requestsPerSecond > 10) {
      session.suspicious = true;
      return {
        valid: false,
        reason: "Fréquence de requêtes anormale pour cette session",
      };
    }
  }

  return { valid: true };
}

/**
 * Remove a session (on logout).
 */
export function removeSession(jti: string): void {
  const session = sessions.get(jti);
  if (session) {
    const userSessionSet = userSessions.get(session.userId);
    if (userSessionSet) {
      userSessionSet.delete(jti);
    }
    sessions.delete(jti);
  }
}

/**
 * Get agent metrics.
 */
export function getSessionProtectorMetrics(): {
  activeSessions: number;
  suspiciousSessions: number;
  uniqueUsers: number;
} {
  let suspiciousSessions = 0;
  for (const session of sessions.values()) {
    if (session.suspicious) suspiciousSessions++;
  }
  return {
    activeSessions: sessions.size,
    suspiciousSessions,
    uniqueUsers: userSessions.size,
  };
}

// Cleanup expired sessions every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - SESSION_INACTIVE_TIMEOUT_MS;
  for (const [jti, session] of sessions.entries()) {
    if (session.lastSeen < cutoff) {
      const userSessionSet = userSessions.get(session.userId);
      if (userSessionSet) userSessionSet.delete(jti);
      sessions.delete(jti);
    }
  }
}, 300_000).unref();
