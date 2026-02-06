import { vi } from "vitest";

export function createMockDb(teamId = "team-1") {
  return {
    connector: {
      findUnique: vi.fn(),
      findMany: vi.fn(() => []),
      create: vi.fn(),
      update: vi.fn(),
    },
    agentCanvas: {
      findUnique: vi.fn(),
      findMany: vi.fn(() => []),
    },
    agentCanvasExecution: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(() =>
        Promise.resolve({
          agentCanvas: { teamId },
        })
      ),
    },
    agentCanvasExecutionStep: {
      findFirst: vi.fn(() =>
        Promise.resolve({
          execution: {
            agentCanvas: { teamId },
          },
        })
      ),
    },
  };
}
