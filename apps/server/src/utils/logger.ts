import winston from "winston";
import { config } from "../config";

const { combine, timestamp, json, colorize, simple } = winston.format;

export const logger = winston.createLogger({
  level: config.isProduction ? "info" : "debug",
  format: config.isProduction
    ? combine(timestamp(), json())
    : combine(colorize(), timestamp({ format: "HH:mm:ss" }), simple()),
  transports: [new winston.transports.Console()],
  // Prevent unhandled promise rejections from crashing the logger itself
  exitOnError: false,
});
