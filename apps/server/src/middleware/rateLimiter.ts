import rateLimit from "express-rate-limit";
import { Request, Response } from "express";
import { config } from "../config";

/**
 * General API rate limiter applied globally.
 * Keyed by IP address.
 */
export const globalRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de requêtes, veuillez ralentir." },
  skip: (req: Request) => req.path === "/health",
});

/**
 * Stricter limiter for auth endpoints to prevent brute-force attacks.
 * 10 attempts per 15 minutes per IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de tentatives d'authentification, veuillez réessayer plus tard." },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({ error: "Trop de tentatives d'authentification, veuillez réessayer plus tard." });
  },
});
