import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { User } from "../models/User";
import { validate } from "../middleware/inputGuard";
import { authRateLimiter } from "../middleware/rateLimiter";
import { authMiddleware } from "../middleware/auth";
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  blacklistToken,
  isRefreshTokenValid,
  revokeRefreshToken,
} from "../utils/jwt";
import { generateNickname } from "../utils/nameGenerator";
import { createError } from "../middleware/errorHandler";
import { logger } from "../utils/logger";

const router = Router();

const BCRYPT_ROUNDS = 12;

// ── Schemas ──────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  publicKey: z.string().min(10).max(2048),
  deviceFingerprint: z.string().min(8).max(256),
  /** Optional password – if omitted the account is fully anonymous */
  password: z.string().min(8).max(128).optional(),
  /** Optional custom nickname – auto-generated if omitted */
  nickname: z.string().min(2).max(64).optional(),
});

const loginSchema = z.object({
  userId: z.string().min(1),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// ── Handlers ─────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Creates an anonymous (or password-protected) account.
 * Returns access + refresh tokens and the generated userId/nickname.
 */
router.post(
  "/register",
  authRateLimiter,
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { publicKey, deviceFingerprint, password, nickname } = req.body as z.infer<
        typeof registerSchema
      >;

      const generatedNickname = nickname ?? generateNickname();
      let passwordHash: string | undefined;

      if (password) {
        passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      }

      const user = await User.create({
        nickname: generatedNickname,
        publicKey,
        deviceFingerprint,
        passwordHash,
      });

      const accessToken = signAccessToken(user.id as string);
      const refreshToken = await signRefreshToken(user.id as string);

      logger.info("User registered", { userId: user.id, nickname: generatedNickname });

      res.status(201).json({
        userId: user.id,
        nickname: generatedNickname,
        accessToken,
        refreshToken,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/auth/login
 * Authenticates a password-protected account and issues fresh tokens.
 */
router.post(
  "/login",
  authRateLimiter,
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, password } = req.body as z.infer<typeof loginSchema>;

      // Select passwordHash explicitly (it's excluded from default projection)
      const user = await User.findById(userId).select("+passwordHash");

      if (!user || !user.passwordHash) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const accessToken = signAccessToken(user.id as string);
      const refreshToken = await signRefreshToken(user.id as string);

      logger.info("User logged in", { userId: user.id });

      res.json({ accessToken, refreshToken });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/auth/refresh
 * Issues a new access token from a valid refresh token.
 */
router.post(
  "/refresh",
  validate(refreshSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body as z.infer<typeof refreshSchema>;

      let payload;
      try {
        payload = verifyToken(refreshToken);
      } catch {
        res.status(401).json({ error: "Invalid or expired refresh token" });
        return;
      }

      if (payload.type !== "refresh") {
        res.status(401).json({ error: "Invalid token type" });
        return;
      }

      const valid = await isRefreshTokenValid(payload.sub, payload.jti);
      if (!valid) {
        res.status(401).json({ error: "Refresh token has been revoked" });
        return;
      }

      // Rotate: revoke old refresh token, issue new pair
      await revokeRefreshToken(payload.sub, payload.jti);
      const newAccessToken = signAccessToken(payload.sub);
      const newRefreshToken = await signRefreshToken(payload.sub);

      res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/auth/logout
 * Blacklists the current access token and revokes the refresh token.
 */
router.post(
  "/logout",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body as { refreshToken?: string };

      // Blacklist the access token (exp - now in seconds)
      // We use a fixed 15-min TTL matching access token lifetime
      await blacklistToken(req.tokenJti, 15 * 60);

      if (refreshToken) {
        try {
          const payload = verifyToken(refreshToken);
          if (payload.type === "refresh") {
            await revokeRefreshToken(payload.sub, payload.jti);
          }
        } catch {
          // Ignore invalid refresh token during logout
        }
      }

      logger.info("User logged out", { userId: req.userId });
      res.json({ message: "Logged out successfully" });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile.
 */
router.get(
  "/me",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        next(createError("User not found", 404));
        return;
      }
      res.json(user);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
