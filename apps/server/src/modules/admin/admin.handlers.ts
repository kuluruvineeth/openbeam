import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { HonoAdapter } from "@bull-board/hono";
import {
  cleanupQueue,
  digestQueue,
  fileProcessingQueue,
  indexQueue,
  mediaProcessingQueue,
  syncQueue,
  webhookQueue,
} from "@openplane/redis";
import { serveStatic } from "hono/bun";

export const setupBullBoard = () => {
  const serverAdapter = new HonoAdapter(serveStatic);
  serverAdapter.setBasePath("/admin/queues");

  createBullBoard({
    queues: [
      new BullMQAdapter(syncQueue),
      new BullMQAdapter(indexQueue),
      new BullMQAdapter(webhookQueue),
      new BullMQAdapter(cleanupQueue),
      new BullMQAdapter(fileProcessingQueue),
      new BullMQAdapter(mediaProcessingQueue),
      new BullMQAdapter(digestQueue),
    ],
    serverAdapter,
  });

  return serverAdapter;
};
