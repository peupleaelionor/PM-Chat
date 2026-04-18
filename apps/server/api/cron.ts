/**
 * Vercel Cron endpoint — runs every minute to purge expired messages and conversations.
 *
 * In Vercel, add the following to vercel.json:
 *   "crons": [{ "path": "/api/cron", "schedule": "* * * * *" }]
 *
 * Vercel automatically sends a `Authorization: Bearer <CRON_SECRET>` header on Pro plans.
 * On Hobby plans, the request arrives unauthenticated but from Vercel's IP range.
 */
import type { IncomingMessage, ServerResponse } from "http";
import { Message } from "../src/models/Message";
import { Conversation } from "../src/models/Conversation";
import { ensureConnected } from "../src/startup";
import { logger } from "../src/utils/logger";

export default async function handler(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    await ensureConnected();

    const now = new Date();

    const [msgResult, convResult] = await Promise.all([
      Message.deleteMany({ expiresAt: { $lte: now } }),
      Conversation.deleteMany({ selfDestruct: true, expiresAt: { $lte: now } }),
    ]);

    logger.info("Cron: expiry job completed", {
      messagesDeleted: msgResult.deletedCount,
      conversationsDeleted: convResult.deletedCount,
    });

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        messagesDeleted: msgResult.deletedCount,
        conversationsDeleted: convResult.deletedCount,
        timestamp: now.toISOString(),
      })
    );
  } catch (err) {
    logger.error("Cron: expiry job failed", { err });
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "Cron job failed" }));
  }
}
