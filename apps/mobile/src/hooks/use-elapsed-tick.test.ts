import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react", () => ({
  useEffect: (fn: () => (() => void) | undefined, _deps: unknown[]) => {
    const cleanup = fn();
    return cleanup;
  },
  useRef: (initial: unknown) => ({ current: initial }),
}));

import { useElapsedTick } from "./use-elapsed-tick";

describe("useElapsedTick", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls onTick at 100ms intervals when active", () => {
    const onTick = vi.fn();
    useElapsedTick(true, onTick);

    vi.advanceTimersByTime(500);
    expect(onTick).toHaveBeenCalledTimes(5);
    expect(onTick).toHaveBeenCalledWith(100);
  });

  it("does not call onTick when inactive", () => {
    const onTick = vi.fn();
    useElapsedTick(false, onTick);

    vi.advanceTimersByTime(500);
    expect(onTick).not.toHaveBeenCalled();
  });
});
