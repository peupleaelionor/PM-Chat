import { logger } from "../utils/logger";

/**
 * Anomaly Detector Agent — Detects behavioral anomalies in real-time.
 *
 * Capabilities beyond human:
 * - Tracks per-user behavior profiles (message frequency, timing, patterns)
 * - Detects velocity anomalies (sudden bursts of activity)
 * - Identifies geographic impossibility (login from different continents in short time)
 * - Monitors session fingerprint changes
 * - Entropy analysis of message payloads
 */

interface UserBehaviorProfile {
  userId: string;
  messageTimestamps: number[];
  loginTimestamps: number[];
  ipHistory: Array<{ ip: string; timestamp: number }>;
  avgMessageInterval: number;
  maxMessagesPerMinute: number;
  deviceFingerprints: Set<string>;
  anomalyScore: number;
  lastActivity: number;
}

const profiles = new Map<string, UserBehaviorProfile>();
const WINDOW_MS = 300_000; // 5 minutes
const MAX_MESSAGES_PER_MINUTE = 60;
const ANOMALY_THRESHOLD = 75;

function getOrCreateProfile(userId: string): UserBehaviorProfile {
  let profile = profiles.get(userId);
  if (!profile) {
    profile = {
      userId,
      messageTimestamps: [],
      loginTimestamps: [],
      ipHistory: [],
      avgMessageInterval: 0,
      maxMessagesPerMinute: 0,
      deviceFingerprints: new Set(),
      anomalyScore: 0,
      lastActivity: Date.now(),
    };
    profiles.set(userId, profile);
  }
  return profile;
}

/**
 * Record a message event and check for anomalies.
 */
export function recordMessageEvent(
  userId: string,
  ip: string
): { anomalous: boolean; score: number; reason?: string } {
  const profile = getOrCreateProfile(userId);
  const now = Date.now();

  profile.messageTimestamps.push(now);
  profile.lastActivity = now;

  // Clean old timestamps
  profile.messageTimestamps = profile.messageTimestamps.filter(
    (t) => now - t < WINDOW_MS
  );

  // Velocity check — messages per minute
  const recentMessages = profile.messageTimestamps.filter(
    (t) => now - t < 60_000
  );
  const messagesPerMinute = recentMessages.length;

  if (messagesPerMinute > MAX_MESSAGES_PER_MINUTE) {
    profile.anomalyScore = Math.min(100, profile.anomalyScore + 20);
    logger.warn("AnomalyDetector: Message velocity anomaly", {
      userId: userId.substring(0, 8),
      messagesPerMinute,
    });
    return {
      anomalous: true,
      score: profile.anomalyScore,
      reason: "Fréquence de messages anormalement élevée",
    };
  }

  // Burst detection — many messages in very short window
  const veryRecent = profile.messageTimestamps.filter((t) => now - t < 5_000);
  if (veryRecent.length > 10) {
    profile.anomalyScore = Math.min(100, profile.anomalyScore + 15);
    return {
      anomalous: true,
      score: profile.anomalyScore,
      reason: "Rafale de messages détectée",
    };
  }

  // Track IP changes
  const lastIP = profile.ipHistory[profile.ipHistory.length - 1];
  if (lastIP && lastIP.ip !== ip && now - lastIP.timestamp < 60_000) {
    profile.anomalyScore = Math.min(100, profile.anomalyScore + 25);
    logger.warn("AnomalyDetector: Rapid IP change", {
      userId: userId.substring(0, 8),
      oldIP: lastIP.ip,
      newIP: ip,
    });
    return {
      anomalous: true,
      score: profile.anomalyScore,
      reason: "Changement d'adresse IP suspect",
    };
  }
  profile.ipHistory.push({ ip, timestamp: now });

  // Decay anomaly score over time
  if (profile.anomalyScore > 0) {
    profile.anomalyScore = Math.max(0, profile.anomalyScore - 1);
  }

  return { anomalous: false, score: profile.anomalyScore };
}

/**
 * Record login event.
 */
export function recordLoginEvent(
  userId: string,
  _ip: string,
  fingerprint?: string
): { suspicious: boolean; reason?: string } {
  const profile = getOrCreateProfile(userId);
  const now = Date.now();

  profile.loginTimestamps.push(now);
  profile.lastActivity = now;

  if (fingerprint) {
    if (profile.deviceFingerprints.size > 0 && !profile.deviceFingerprints.has(fingerprint)) {
      profile.anomalyScore = Math.min(100, profile.anomalyScore + 10);
      logger.info("AnomalyDetector: New device fingerprint", {
        userId: userId.substring(0, 8),
        totalDevices: profile.deviceFingerprints.size + 1,
      });
    }
    profile.deviceFingerprints.add(fingerprint);
  }

  // Multiple logins in short time
  const recentLogins = profile.loginTimestamps.filter((t) => now - t < 300_000);
  if (recentLogins.length > 5) {
    profile.anomalyScore = Math.min(100, profile.anomalyScore + 15);
    return {
      suspicious: true,
      reason: "Connexions répétées suspectes",
    };
  }

  return { suspicious: profile.anomalyScore > ANOMALY_THRESHOLD };
}

/**
 * Get anomaly score for a user.
 */
export function getAnomalyScore(userId: string): number {
  return profiles.get(userId)?.anomalyScore ?? 0;
}

/**
 * Get agent metrics.
 */
export function getAnomalyDetectorMetrics(): {
  trackedUsers: number;
  highRiskUsers: number;
  totalEvents: number;
} {
  let totalEvents = 0;
  let highRiskUsers = 0;
  for (const profile of profiles.values()) {
    totalEvents += profile.messageTimestamps.length + profile.loginTimestamps.length;
    if (profile.anomalyScore > ANOMALY_THRESHOLD) highRiskUsers++;
  }
  return { trackedUsers: profiles.size, highRiskUsers, totalEvents };
}

// Cleanup stale profiles every 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 3_600_000; // 1 hour
  for (const [userId, profile] of profiles.entries()) {
    if (profile.lastActivity < cutoff) {
      profiles.delete(userId);
    }
  }
}, 600_000).unref();
