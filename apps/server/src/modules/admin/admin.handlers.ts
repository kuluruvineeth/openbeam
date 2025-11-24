import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { HonoAdapter } from "@bull-board/hono";
import {
  cleanupQueue,
  indexQueue,
  syncQueue,
  webhookQueue,
} from "@openplane/redis";
import { serveStatic } from "hono/bun";

/**
 * Setup BullBoard for queue visibility
 * Provides a web UI for monitoring and managing BullMQ queues
 */
export const setupBullBoard = () => {
  const serverAdapter = new HonoAdapter(serveStatic);
  serverAdapter.setBasePath("/admin/queues");

  createBullBoard({
    queues: [
      new BullMQAdapter(syncQueue),
      new BullMQAdapter(indexQueue),
      new BullMQAdapter(webhookQueue),
      new BullMQAdapter(cleanupQueue),
    ],
    serverAdapter,
  });

  return serverAdapter;
};
