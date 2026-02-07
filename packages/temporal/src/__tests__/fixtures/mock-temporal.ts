import { vi } from "vitest";

export function createMockTemporalActivity() {
  return {
    heartbeat: vi.fn().mockReturnValue(undefined),
    Context: {
      current: () => ({
        heartbeat: vi.fn().mockReturnValue(undefined),
      }),
    },
  };
}

export function setupTemporalActivityMock() {
  return vi.mock("@temporalio/activity", () => ({
    heartbeat: vi.fn().mockReturnValue(undefined),
    Context: {
      current: () => ({
        heartbeat: vi.fn().mockReturnValue(undefined),
      }),
    },
  }));
}
