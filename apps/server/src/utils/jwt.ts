import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config";
import { getRedis, REDIS_KEYS, REDIS_TTL } from "../redis";

export interface TokenPayload {
  sub: string;    // userId
  jti: string;    // unique token id (for blacklisting)
  type: "access" | "refresh";
  iat?: number;
  exp?: number;
}

/** Issue a short-lived access token. */
export function signAccessToken(userId: string): string {
  const payload: Omit<TokenPayload, "iat" | "exp"> = {
    sub: userId,
    jti: uuidv4(),
    type: "access",
  };
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
}

/** Issue a long-lived refresh token, storing its JTI in Redis so it can be revoked. */
export async function signRefreshToken(userId: string): Promise<string> {
  const jti = uuidv4();
  const payload: Omit<TokenPayload, "iat" | "exp"> = {
    sub: userId,
    jti,
    type: "refresh",
  };
  const token = jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);

  // Store in Redis so we can revoke it on logout
  await getRedis().setex(
    REDIS_KEYS.refreshToken(userId, jti),
    REDIS_TTL.refreshToken,
    "1"
  );

  return token;
}

/** Verify a token and return its payload. Throws on invalid/expired tokens. */
export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, config.JWT_SECRET) as TokenPayload;
}

/** Add an access token's JTI to the Redis blacklist (on logout). */
export async function blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
  await getRedis().setex(REDIS_KEYS.tokenBlacklist(jti), ttlSeconds, "1");
}

/** Check if a JTI is blacklisted. */
export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  const val = await getRedis().get(REDIS_KEYS.tokenBlacklist(jti));
  return val !== null;
}

/** Revoke a specific refresh token from Redis. */
export async function revokeRefreshToken(userId: string, jti: string): Promise<void> {
  await getRedis().del(REDIS_KEYS.refreshToken(userId, jti));
}

/** Check if a refresh token is still valid in Redis. */
export async function isRefreshTokenValid(userId: string, jti: string): Promise<boolean> {
  const val = await getRedis().get(REDIS_KEYS.refreshToken(userId, jti));
  return val !== null;
}
