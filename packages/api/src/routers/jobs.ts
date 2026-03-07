import { createJobProgressSubscriber, type JobProgress } from "@openbeam/redis";
import { createTRPCRouter } from "../index";
import { withActiveTeam } from "./apps/middleware";

export const jobsRouter = createTRPCRouter({
  onProgress: withActiveTeam.subscription(async function* (opts) {
    const { teamId } = opts.ctx;

    const queue: JobProgress[] = [];
    let resolve: (() => void) | null = null;

    const unsubscribe = await createJobProgressSubscriber(
      teamId,
      (progress) => {
        queue.push(progress);
        resolve?.();
      }
    );

    try {
      while (!opts.signal?.aborted) {
        if (queue.length === 0) {
          await new Promise<void>((r) => {
            resolve = r;
            opts.signal?.addEventListener("abort", () => r(), { once: true });
          });
        }

        if (opts.signal?.aborted) {
          break;
        }

        while (queue.length > 0) {
          const progress = queue.shift();
          if (progress) {
            yield progress;
          }
        }
      }
    } finally {
      await unsubscribe();
    }
  }),
});
