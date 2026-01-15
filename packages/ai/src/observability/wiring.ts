import type { ToolExecutionResult } from "@openplane/types/ai";
import { toolRegistry } from "../tools/registry";
import {
  type CompositionTracker,
  createCompositionTracker,
} from "./composition";
import { aiMetrics, recordToolCall } from "./metrics";

interface CompositionWiringOptions {
  teamId: string;
  userId: string;
  sessionId: string;
}

interface WiredCompositionTracker extends CompositionTracker {
  unwire: () => void;
}

let activeUnwireFn: (() => void) | null = null;
let activeTracker: WiredCompositionTracker | null = null;

export function wireCompositionTracking(
  options: CompositionWiringOptions
): WiredCompositionTracker {
  if (activeUnwireFn) {
    activeUnwireFn();
  }

  const tracker = createCompositionTracker();
  tracker.startTracking(options.sessionId, options.teamId, options.userId);

  const unsubscribe = toolRegistry.onExecute(
    (tool, _params, result, durationMs) => {
      const typedResult = result as ToolExecutionResult;
      const status = typedResult.success ? "success" : "error";

      tracker.recordToolCall(tool.metadata.name);

      recordToolCall({
        tool: tool.metadata.name,
        category: tool.metadata.category,
        status,
        latencyMs: durationMs,
      });

      aiMetrics.toolCallsTotal.inc({
        tool: tool.metadata.name,
        category: tool.metadata.category,
        status,
      });
    }
  );

  let wiredTracker: WiredCompositionTracker | null = null;

  const unwire = () => {
    unsubscribe();
    if (activeUnwireFn === unwire) {
      activeUnwireFn = null;
    }
    if (wiredTracker && activeTracker === wiredTracker) {
      activeTracker = null;
    }
  };

  activeUnwireFn = unwire;

  wiredTracker = {
    ...tracker,
    unwire,
  };

  activeTracker = wiredTracker;

  return wiredTracker;
}

export function getGlobalCompositionTracker(): CompositionTracker | null {
  return activeTracker;
}

export function createSessionScopedTracker(options: CompositionWiringOptions): {
  tracker: WiredCompositionTracker;
  finalize: (success: boolean, promptCategory?: string) => Promise<void>;
} {
  const tracker = wireCompositionTracking(options);

  return {
    tracker,
    finalize: async (success: boolean, promptCategory?: string) => {
      await tracker.finalize(success, promptCategory);
      tracker.unwire();
    },
  };
}
