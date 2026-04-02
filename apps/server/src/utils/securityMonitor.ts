import { logger } from "./logger";

interface SecurityMetrics {
  replayAttemptsBlocked: number;
  malformedPayloadsRejected: number;
  rateLimitHits: number;
  authFailures: number;
  cryptoFailures: number;
  suspiciousIPs: Map<string, number>;
  startedAt: string;
}

const metrics: SecurityMetrics = {
  replayAttemptsBlocked: 0,
  malformedPayloadsRejected: 0,
  rateLimitHits: 0,
  authFailures: 0,
  cryptoFailures: 0,
  suspiciousIPs: new Map(),
  startedAt: new Date().toISOString(),
};

const AUTO_BLOCK_THRESHOLD = 50;
const blockedIPs = new Set<string>();

export function recordReplayAttempt(ip?: string): void {
  metrics.replayAttemptsBlocked++;
  if (ip) trackSuspiciousIP(ip);
  logger.warn("Replay attempt blocked", { ip, total: metrics.replayAttemptsBlocked });
}

export function recordMalformedPayload(ip?: string): void {
  metrics.malformedPayloadsRejected++;
  if (ip) trackSuspiciousIP(ip);
}

export function recordRateLimitHit(ip?: string): void {
  metrics.rateLimitHits++;
  if (ip) trackSuspiciousIP(ip);
}

export function recordAuthFailure(ip?: string): void {
  metrics.authFailures++;
  if (ip) trackSuspiciousIP(ip);
  if (metrics.authFailures % 10 === 0) {
    logger.warn("⚠️ ALERT: High auth failure rate", { total: metrics.authFailures });
  }
}

export function recordCryptoFailure(context?: string): void {
  metrics.cryptoFailures++;
  logger.warn("⚠️ ALERT: Crypto failure", { context, total: metrics.cryptoFailures });
}

function trackSuspiciousIP(ip: string): void {
  const count = (metrics.suspiciousIPs.get(ip) ?? 0) + 1;
  metrics.suspiciousIPs.set(ip, count);
  if (count >= AUTO_BLOCK_THRESHOLD && !blockedIPs.has(ip)) {
    blockedIPs.add(ip);
    logger.warn("🚨 ALERT: Auto-blocked IP due to repeated violations", { ip, violations: count });
  }
}

export function isIPBlocked(ip: string): boolean {
  return blockedIPs.has(ip);
}

export function getSecurityMetrics(): SecurityMetrics & { blockedIPCount: number } {
  return {
    ...metrics,
    suspiciousIPs: new Map(metrics.suspiciousIPs),
    blockedIPCount: blockedIPs.size,
  };
}

export function getSecurityMetricsJSON(): Record<string, unknown> {
  return {
    replayAttemptsBlocked: metrics.replayAttemptsBlocked,
    malformedPayloadsRejected: metrics.malformedPayloadsRejected,
    rateLimitHits: metrics.rateLimitHits,
    authFailures: metrics.authFailures,
    cryptoFailures: metrics.cryptoFailures,
    blockedIPCount: blockedIPs.size,
    suspiciousIPCount: metrics.suspiciousIPs.size,
    startedAt: metrics.startedAt,
    uptimeSeconds: Math.floor((Date.now() - new Date(metrics.startedAt).getTime()) / 1000),
  };
}
