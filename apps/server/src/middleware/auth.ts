import { Request, Response, NextFunction } from "express";
import { verifyToken, isTokenBlacklisted } from "../utils/jwt";
import { logger } from "../utils/logger";

declare global {
  namespace Express {
    interface Request {
      userId: string;
      tokenJti: string;
    }
  }
}

/**
 * Verifies the Bearer token in the Authorization header.
 * Rejects requests with blacklisted tokens (logged-out sessions).
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "En-tête d'autorisation manquant ou malformé" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyToken(token);

    if (payload.type !== "access") {
      res.status(401).json({ error: "Type de token invalide" });
      return;
    }

    // Check against the Redis blacklist (handles logout/revocation)
    if (await isTokenBlacklisted(payload.jti)) {
      res.status(401).json({ error: "Le token a été révoqué" });
      return;
    }

    req.userId = payload.sub;
    req.tokenJti = payload.jti;
    next();
  } catch (err) {
    logger.debug("Auth middleware rejected token", { err });
    res.status(401).json({ error: "Token invalide ou expiré" });
  }
}
