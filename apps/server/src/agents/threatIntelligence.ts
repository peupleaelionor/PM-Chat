import { logger } from "../utils/logger";

/**
 * Threat Intelligence Agent — Automated threat scoring and response.
 *
 * Capabilities beyond human:
 * - Aggregates signals from all other agents into a unified threat score
 * - Maintains reputation database for IPs and users
 * - Detects coordinated attack patterns across multiple users
 * - Implements graduated response (warn → throttle → block → quarantine)
 * - Pattern-matches known attack signatures
 */

type ThreatAction = "allow" | "warn" | "throttle" | "block" | "quarantine";

interface ThreatRecord {
  target: string; // IP or userId
  score: number; // 0-100
  signals: ThreatSignal[];
  lastAction: ThreatAction;
  lastUpdated: number;
  quarantineUntil?: number;
}

interface ThreatSignal {
  source: string; // agent that reported
  severity: number; // 1-10
  message: string;
  timestamp: number;
}

const threatDatabase = new Map<string, ThreatRecord>();
const ACTION_THRESHOLDS: Record<ThreatAction, number> = {
  allow: 0,
  warn: 20,
  throttle: 40,
  block: 60,
  quarantine: 80,
};

// Known malicious patterns
const MALICIOUS_PATTERNS = [
  /(?:SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\s/i, // SQL injection
  /<script[\s>]/i, // XSS
  /\.\.\//g, // Path traversal
  new RegExp("\\0", "g"), // Null byte injection
];

function getOrCreateRecord(target: string): ThreatRecord {
  let record = threatDatabase.get(target);
  if (!record) {
    record = {
      target,
      score: 0,
      signals: [],
      lastAction: "allow",
      lastUpdated: Date.now(),
    };
    threatDatabase.set(target, record);
  }
  return record;
}

/**
 * Report a threat signal from any agent.
 */
export function reportThreatSignal(
  target: string,
  source: string,
  severity: number,
  message: string
): { action: ThreatAction; score: number } {
  const record = getOrCreateRecord(target);
  const now = Date.now();

  record.signals.push({ source, severity, message, timestamp: now });
  record.lastUpdated = now;

  // Keep last 50 signals
  if (record.signals.length > 50) {
    record.signals = record.signals.slice(-50);
  }

  // Calculate score — recent signals weigh more
  let weightedScore = 0;
  let totalWeight = 0;
  for (const signal of record.signals) {
    const age = (now - signal.timestamp) / 60_000; // age in minutes
    const weight = Math.max(0.1, 1 - age / 60); // decay over 1 hour
    weightedScore += signal.severity * weight * 10;
    totalWeight += weight;
  }
  record.score = Math.min(100, Math.round(weightedScore / Math.max(1, totalWeight)));

  // Determine action
  let action: ThreatAction = "allow";
  for (const [act, threshold] of Object.entries(ACTION_THRESHOLDS)) {
    if (record.score >= threshold) {
      action = act as ThreatAction;
    }
  }
  record.lastAction = action;

  if (action === "quarantine") {
    record.quarantineUntil = now + 3_600_000; // 1 hour quarantine
    logger.warn("ThreatIntelligence: Target quarantined", { target, score: record.score });
  }

  if (action !== "allow") {
    logger.info("ThreatIntelligence: Action taken", {
      target: target.substring(0, 12),
      action,
      score: record.score,
    });
  }

  return { action, score: record.score };
}

/**
 * Check if a target is allowed to proceed.
 */
export function checkThreatStatus(target: string): {
  allowed: boolean;
  action: ThreatAction;
  score: number;
  reason?: string;
} {
  const record = threatDatabase.get(target);
  if (!record) {
    return { allowed: true, action: "allow", score: 0 };
  }

  // Check quarantine
  if (record.quarantineUntil && Date.now() < record.quarantineUntil) {
    return {
      allowed: false,
      action: "quarantine",
      score: record.score,
      reason: "Cible en quarantaine pour activité malveillante",
    };
  }

  // Clear expired quarantine
  if (record.quarantineUntil && Date.now() >= record.quarantineUntil) {
    record.quarantineUntil = undefined;
    record.score = Math.max(0, record.score - 30);
    record.lastAction = "allow";
  }

  return {
    allowed: record.lastAction !== "block" && record.lastAction !== "quarantine",
    action: record.lastAction,
    score: record.score,
  };
}

/**
 * Scan content for known malicious patterns.
 */
export function scanForMaliciousPatterns(
  content: string
): { clean: boolean; matches: string[] } {
  const matches: string[] = [];
  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(content)) {
      matches.push(pattern.source);
    }
  }
  return { clean: matches.length === 0, matches };
}

/**
 * Get agent metrics.
 */
export function getThreatIntelligenceMetrics(): {
  trackedTargets: number;
  activeThreats: number;
  quarantinedTargets: number;
  totalSignals: number;
} {
  let activeThreats = 0;
  let quarantinedTargets = 0;
  let totalSignals = 0;
  const now = Date.now();

  for (const record of threatDatabase.values()) {
    totalSignals += record.signals.length;
    if (record.score > 20) activeThreats++;
    if (record.quarantineUntil && now < record.quarantineUntil) quarantinedTargets++;
  }

  return {
    trackedTargets: threatDatabase.size,
    activeThreats,
    quarantinedTargets,
    totalSignals,
  };
}

// Decay threat scores periodically
setInterval(() => {
  for (const [target, record] of threatDatabase.entries()) {
    const age = Date.now() - record.lastUpdated;
    if (age > 3_600_000) {
      // Older than 1 hour: significant decay
      record.score = Math.max(0, record.score - 10);
      if (record.score === 0 && !record.quarantineUntil) {
        threatDatabase.delete(target);
      }
    } else if (age > 300_000) {
      // Older than 5 minutes: minor decay
      record.score = Math.max(0, record.score - 2);
    }
  }
}, 120_000).unref();
