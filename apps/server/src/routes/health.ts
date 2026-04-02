import { Router, Request, Response } from "express";
import { config } from "../config";

const router = Router();

/**
 * GET /health
 * Simple liveness probe used by load balancers and container orchestrators.
 */
router.get("/", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: config.VERSION,
  });
});

export default router;
