import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { config } from "../config";

export interface AppError extends Error {
  statusCode?: number;
  expose?: boolean;
}

/**
 * Global error-handling middleware. Must be registered last.
 * In production, internal error details are hidden from the client.
 */
export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;

  logger.error("Unhandled error", {
    message: err.message,
    stack: err.stack,
    statusCode,
  });

  const message =
    statusCode < 500 || !config.isProduction
      ? err.message
      : "Internal server error";

  res.status(statusCode).json({ error: message });
}

/** Helper to create typed application errors. */
export function createError(message: string, statusCode: number): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.expose = statusCode < 500;
  return err;
}
