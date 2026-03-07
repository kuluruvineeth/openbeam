import { beforeEach, describe, expect, it, vi } from "vitest";

const mockReapOrphanedRuns = vi.fn();
const mockContinueAsNew = vi.fn();
let mockHistoryLength = 100;

class ContinueAsNewError extends Error {
  constructor() {
    super("continueAsNew");
    this.name = "ContinueAsNewError";
  }
}

vi.mock("@temporalio/workflow", () => {
  let reaperStatusHandler: (() => unknown) | null = null;

  return {
    proxyActivities: () =>
      new Proxy(
        {},
        {
          get(_target, prop: string) {
            const map: Record<string, (...args: unknown[]) => unknown> = {
              reapOrphanedRuns: mockReapOrphanedRuns,
            };
            return map[prop];
          },
        }
      ),
    defineQuery: (name: string) => name,
    setHandler: (
      signalOrQuery: string,
      handler: (...args: unknown[]) => void
    ) => {
      if (signalOrQuery === "reaperStatus") {
        reaperStatusHandler = handler as () => unknown;
      }
    },
    continueAsNew: (...args: unknown[]) => {
      mockContinueAsNew(...args);
      throw new ContinueAsNewError();
    },
    sleep: () => Promise.resolve(),
    workflowInfo: () => ({ historyLength: mockHistoryLength }),
    _getReaperStatusHandler: () => reaperStatusHandler,
  };
});

vi.mock("../workflows/temporal-utils", () => ({
  currentTimestamp: () => 1_000_000,
}));

describe("controlReaperWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHistoryLength = 100;
    mockReapOrphanedRuns.mockResolvedValue({ checked: 0, reaped: 0 });
  });

  it("calls reapOrphanedRuns with correct parameters", async () => {
    mockHistoryLength = 2000;
    mockReapOrphanedRuns.mockResolvedValue({ checked: 10, reaped: 2 });

    const { controlReaperWorkflow } = await import(
      "../workflows/agents/control-reaper"
    );

    await expect(controlReaperWorkflow({ teamId: "team-1" })).rejects.toThrow(
      "continueAsNew"
    );

    expect(mockReapOrphanedRuns).toHaveBeenCalledWith({
      teamId: "team-1",
      staleThresholdMs: 600_000,
    });
  });

  it("accumulates totalReaped across sweeps", async () => {
    mockHistoryLength = 2000;
    mockReapOrphanedRuns.mockResolvedValue({ checked: 5, reaped: 3 });

    const mod = await import("@temporalio/workflow");
    const { controlReaperWorkflow } = await import(
      "../workflows/agents/control-reaper"
    );

    await expect(controlReaperWorkflow({ teamId: "team-1" })).rejects.toThrow(
      "continueAsNew"
    );

    const getHandler = (mod as any)._getReaperStatusHandler;
    const handler = getHandler?.();
    const status = handler?.();
    expect(status).toBeDefined();
    if (status) {
      expect(status.totalReaped).toBe(3);
      expect(status.sweepCount).toBe(1);
    }
  });

  it("calls continueAsNew on history overflow", async () => {
    mockHistoryLength = 2000;

    const { controlReaperWorkflow } = await import(
      "../workflows/agents/control-reaper"
    );

    await expect(controlReaperWorkflow({ teamId: "team-1" })).rejects.toThrow(
      "continueAsNew"
    );

    expect(mockContinueAsNew).toHaveBeenCalledWith({
      teamId: "team-1",
    });
  });
});
