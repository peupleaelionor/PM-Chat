import { Server as IOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { config } from "../config";
import { socketAuthGuard } from "./guards";
import { registerPresenceHandlers } from "./handlers/presence";
import { registerConversationHandlers } from "./handlers/conversation";
import { registerMessageHandlers } from "./handlers/message";
import { logger } from "../utils/logger";
import { isSocketRateLimited } from "../middleware/socketRateLimiter";

export function initSocket(httpServer: HTTPServer): IOServer {
  const io = new IOServer(httpServer, {
    cors: {
      origin: config.corsOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    // Prefer WebSocket; fall back to polling for restricted networks
    transports: ["websocket", "polling"],
    pingInterval: 20_000,
    pingTimeout: 10_000,
  });

  // Apply JWT auth middleware to every socket connection
  io.use(socketAuthGuard);

  io.on("connection", (socket) => {
    logger.info("Socket connected", {
      socketId: socket.id,
      userId: socket.userId,
    });

    // Each user joins a personal room so they can receive direct events
    // (e.g. key:received, user:presence notifications)
    void socket.join(`user:${socket.userId}`);

    // Socket-level rate limiting middleware
    socket.use((event, next) => {
      if (isSocketRateLimited(socket)) {
        logger.debug("Socket event rate limited", { socketId: socket.id, event: event[0] });
        return;
      }
      next();
    });

    // Register domain handlers
    registerPresenceHandlers(io, socket);
    registerConversationHandlers(io, socket);
    registerMessageHandlers(io, socket);

    socket.on("error", (err) => {
      logger.error("Socket error", { socketId: socket.id, err });
    });

    socket.on("disconnect", (reason) => {
      logger.info("Socket disconnected", { socketId: socket.id, reason });
    });
  });

  return io;
}
