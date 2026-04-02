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

// Shared fields present in both production and development schemas.
const baseFields = {
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
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
};

// Production: all secrets are required — no defaults.
// Development: safe defaults are provided so the app starts without manual setup.
const envSchema = isProduction
  ? z.object({
      ...baseFields,
      MONGODB_URI: z.string().min(1),
      REDIS_URL: z.string().min(1),
      JWT_SECRET: z.string().min(32),
      JWT_REFRESH_SECRET: z.string().min(16),
    })
  : z.object({
      ...baseFields,
      MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/pmchat"),
      REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
      JWT_SECRET: z.string().min(32).default(generateDevSecret("JWT_SECRET")),
    });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

export const config = {
  ...env,
  isProduction: env.NODE_ENV === "production",
  isDevelopment: env.NODE_ENV === "development",
  securityMode: (env.NODE_ENV === "production" ? "PRODUCTION" : "DEV") as
    | "PRODUCTION"
    | "DEV",
  corsOrigins: env.CORS_ORIGINS.split(",").map((o) => o.trim()),
  maxFileSizeBytes: env.MAX_FILE_SIZE_MB * 1024 * 1024,
  VERSION: process.env.npm_package_version ?? "1.0.0",
} as const;
