import { z } from "zod";
import crypto from "crypto";

// ── Dev-safe fallback generation ──────────────────────────────────────────────
function generateDevSecret(name: string): string {
  const secret = crypto.randomBytes(32).toString("hex");
  console.warn(
    `⚠️  WARNING: ${name} not set. Generated temporary dev secret. DO NOT use in production.`
  );
  return secret;
}

const isProduction = process.env.NODE_ENV === "production";

// In dev mode, provide safe fallback values for required secrets.
// In production, require explicit configuration.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),

  MONGODB_URI: z.string().min(1).default(
    isProduction ? undefined as unknown as string : "mongodb://localhost:27017/pmchat"
  ),
  REDIS_URL: z.string().min(1).default(
    isProduction ? undefined as unknown as string : "redis://localhost:6379"
  ),

  JWT_SECRET: z.string().min(32).default(
    isProduction ? undefined as unknown as string : generateDevSecret("JWT_SECRET")
  ),
  JWT_REFRESH_SECRET: z.string().min(16).optional(),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  CORS_ORIGINS: z.string().default("http://localhost:3000"),

  UPLOAD_DIR: z.string().default("./uploads"),
  MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(10),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),

  MESSAGE_EXPIRY_JOB_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  if (isProduction) {
    console.error("❌ Invalid environment configuration (production mode requires all secrets):");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  } else {
    console.warn("⚠️  Some environment variables are missing. Using safe dev defaults.");
    console.warn(parsed.error.flatten().fieldErrors);
  }
}

// Use parsed data or construct fallback for dev mode
const env = parsed.success
  ? parsed.data
  : {
      NODE_ENV: "development" as const,
      PORT: 4000,
      HOST: "0.0.0.0",
      MONGODB_URI: process.env.MONGODB_URI ?? "mongodb://localhost:27017/pmchat",
      REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
      JWT_SECRET: process.env.JWT_SECRET ?? generateDevSecret("JWT_SECRET"),
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
      JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
      JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
      CORS_ORIGINS: process.env.CORS_ORIGINS ?? "http://localhost:3000",
      UPLOAD_DIR: process.env.UPLOAD_DIR ?? "./uploads",
      MAX_FILE_SIZE_MB: Number(process.env.MAX_FILE_SIZE_MB) || 10,
      RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
      RATE_LIMIT_MAX_REQUESTS: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      MESSAGE_EXPIRY_JOB_INTERVAL_MS: Number(process.env.MESSAGE_EXPIRY_JOB_INTERVAL_MS) || 60_000,
      SHUTDOWN_TIMEOUT_MS: Number(process.env.SHUTDOWN_TIMEOUT_MS) || 10_000,
    };

export const config = {
  ...env,
  isProduction: env.NODE_ENV === "production",
  isDevelopment: env.NODE_ENV === "development",
  securityMode: isProduction ? "PRODUCTION" : "DEV",
  corsOrigins: env.CORS_ORIGINS.split(",").map((o) => o.trim()),
  maxFileSizeBytes: env.MAX_FILE_SIZE_MB * 1024 * 1024,
  VERSION: process.env.npm_package_version ?? "1.0.0",
} as const;
