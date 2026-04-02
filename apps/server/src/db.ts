import mongoose from "mongoose";
import { config } from "./config";
import { logger } from "./utils/logger";

export async function connectDB(): Promise<void> {
  mongoose.set("strictQuery", true);

  mongoose.connection.on("connected", () =>
    logger.info("MongoDB connected", { uri: config.MONGODB_URI.replace(/\/\/.*@/, "//***@") })
  );
  mongoose.connection.on("error", (err) => logger.error("MongoDB error", { err }));
  mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));

  await mongoose.connect(config.MONGODB_URI);
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  logger.info("MongoDB disconnected gracefully");
}
