import {
  type ControlEvent,
  createControlEventSubscriber,
} from "@openbeam/redis";
import { createTRPCRouter } from "../../index";
import { withActiveTeam } from "../apps/middleware";

export const controlRealtimeRouter = createTRPCRouter({
  onEvent: withActiveTeam.subscription(async function* (opts) {
    const { teamId } = opts.ctx;

    const queue: ControlEvent[] = [];
    let resolve: (() => void) | null = null;

    const unsubscribe = await createControlEventSubscriber(teamId, (event) => {
      queue.push(event);
      resolve?.();
    });

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
          const event = queue.shift();
          if (event) {
            yield event;
          }
        }
      }
    } finally {
      await unsubscribe();
    }
  }),
});
