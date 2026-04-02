import { logger } from "./logger";

type ErrorCategory = "network" | "crypto" | "auth" | "server" | "validation" | "database";

interface TrackedError {
  category: ErrorCategory;
  message: string;
  timestamp: string;
  count: number;
}

const recentErrors: TrackedError[] = [];
const MAX_TRACKED_ERRORS = 200;
const errorCounts: Record<ErrorCategory, number> = {
  network: 0,
  crypto: 0,
  auth: 0,
  server: 0,
  validation: 0,
  database: 0,
};

export function trackError(category: ErrorCategory, message: string): void {
  errorCounts[category]++;

  // Deduplicate: increment count if same message in last 5 entries
  const recent = recentErrors.slice(-5).find(
    (e) => e.category === category && e.message === message
  );
  if (recent) {
    recent.count++;
    recent.timestamp = new Date().toISOString();
    return;
  }

  recentErrors.push({
    category,
    message: message.substring(0, 200), // Truncate to prevent log injection
    timestamp: new Date().toISOString(),
    count: 1,
  });

  if (recentErrors.length > MAX_TRACKED_ERRORS) {
    recentErrors.splice(0, recentErrors.length - MAX_TRACKED_ERRORS);
  }

  // Alert on critical patterns
  if (category === "crypto") {
    logger.warn("⚠️ ALERT: Crypto error tracked", { message: message.substring(0, 100) });
  }
  if (category === "database" && errorCounts.database % 5 === 0) {
    logger.warn("⚠️ ALERT: Repeated database errors", { total: errorCounts.database });
  }
}

export function getErrorSummary(): { counts: Record<ErrorCategory, number>; recent: TrackedError[] } {
  return {
    counts: { ...errorCounts },
    recent: recentErrors.slice(-20),
  };
}
