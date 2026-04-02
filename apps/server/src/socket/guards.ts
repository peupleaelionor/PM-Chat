import { Socket } from "socket.io";
import { verifyToken, isTokenBlacklisted } from "../utils/jwt";
import { logger } from "../utils/logger";

declare module "socket.io" {
  interface Socket {
    userId: string;
    tokenJti: string;
  }
}

/**
 * Socket.IO middleware that authenticates the connection using the JWT
 * passed in the handshake auth object.
 */
export async function socketAuthGuard(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  const token = socket.handshake.auth?.["token"] as string | undefined;

  if (!token) {
    return next(new Error("AUTH_MISSING"));
  }

  try {
    const payload = verifyToken(token);

    if (payload.type !== "access") {
      return next(new Error("AUTH_INVALID_TYPE"));
    }

    if (await isTokenBlacklisted(payload.jti)) {
      return next(new Error("AUTH_REVOKED"));
    }

    socket.userId = payload.sub;
    socket.tokenJti = payload.jti;
    next();
  } catch {
    logger.debug("Socket auth failed", { socketId: socket.id });
    next(new Error("AUTH_INVALID"));
  }
}

/**
 * Validates that an incoming socket event payload matches the expected shape.
 * Calls the ack callback with an error object if validation fails.
 *
 * @returns The parsed value or null if validation failed.
 */
import { AnyZodObject, ZodError } from "zod";

export function parseSocketPayload<T>(
  schema: AnyZodObject,
  data: unknown,
  ack?: (err: { error: string; details?: unknown }) => void
): T | null {
  try {
    return schema.parse(data) as T;
  } catch (err) {
    if (err instanceof ZodError) {
      ack?.({ error: "Validation failed", details: err.flatten().fieldErrors });
    } else {
      ack?.({ error: "Invalid payload" });
    }
    return null;
  }
}
