/**
 * Vercel serverless entry point.
 *
 * Architecture:
 * - Express handles all REST API requests (/health, /api/*)
 * - Socket.IO is attached to Vercel's underlying HTTP server via req.socket.server
 *   so WebSocket and polling transports both work within the same deployment
 * - Redis adapter enables cross-container pub/sub (required for multi-instance Socket.IO)
 * - DB + Redis connections are lazily initialized and cached per container
 */
import type { IncomingMessage, ServerResponse } from "http";
import { Server as IOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";

import { createExpressApp } from "../src/createApp";
import { ensureConnected } from "../src/startup";
import { config } from "../src/config";
import { getRedis } from "../src/redis";
import { socketAuthGuard } from "../src/socket/guards";
import { registerPresenceHandlers } from "../src/socket/handlers/presence";
import { registerConversationHandlers } from "../src/socket/handlers/conversation";
import { registerMessageHandlers } from "../src/socket/handlers/message";
import { isSocketRateLimited, cleanupSocketBuckets } from "../src/middleware/socketRateLimiter";
import { logger } from "../src/utils/logger";

// ── Module-level singletons (cached across warm container invocations) ─────────

/** Express application — created once and reused. */
const expressApp = createExpressApp();

/** Tracks whether Socket.IO has been wired up on this container's HTTP server. */
type ServerWithIO = { io?: IOServer };

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(
  req: IncomingMessage & { socket: { server: ServerWithIO } },
  res: ServerResponse
): Promise<void> {
  // Lazy-connect MongoDB and Redis (no-op on subsequent warm invocations)
  await ensureConnected();

  // Attach Socket.IO to Vercel's underlying HTTP server exactly once per container.
  // req.socket.server is the Node.js http.Server that Vercel manages internally.
  const srv = req.socket?.server;
  if (srv && !srv.io) {
    const pubClient = getRedis();
    // Duplicate creates a fresh ioredis client for SUBSCRIBE (required by Redis adapter)
    const subClient = pubClient.duplicate();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = new IOServer(srv as any, {
      path: "/socket.io",
      cors: {
        origin: config.corsOrigins,
        methods: ["GET", "POST"],
        credentials: true,
      },
      // Polling first: reliable on serverless. WebSocket upgrade attempted after.
      transports: ["polling", "websocket"],
      pingInterval: 20_000,
      pingTimeout: 10_000,
    });

    // Redis pub/sub adapter — routes events between containers transparently
    io.adapter(createAdapter(pubClient, subClient));

    // JWT authentication for every socket connection
    io.use(socketAuthGuard);

    io.on("connection", (socket) => {
      logger.info("Socket connected", { socketId: socket.id, userId: socket.userId });

      // Each user joins their personal room for direct delivery
      void socket.join(`user:${socket.userId}`);

      // Per-socket event rate limiter
      socket.use((_event, next) => {
        if (isSocketRateLimited(socket)) {
          logger.debug("Socket rate limited", { socketId: socket.id });
          return;
        }
        next();
      });

      registerPresenceHandlers(io, socket);
      registerConversationHandlers(io, socket);
      registerMessageHandlers(io, socket);

      socket.on("error", (err) => logger.error("Socket error", { socketId: socket.id, err }));
      socket.on("disconnect", (reason) =>
        logger.info("Socket disconnected", { socketId: socket.id, reason })
      );
    });

    // Periodic in-memory rate-bucket cleanup (unref so it doesn't keep the process alive)
    setInterval(cleanupSocketBuckets, 30_000).unref();

    srv.io = io;
    logger.info("Socket.IO initialized on serverless container");
  }

  // Delegate all HTTP requests to Express (REST routes + Socket.IO HTTP polling)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expressApp(req as any, res);
}
