import { useEffect, useRef } from "react";

const TICK_INTERVAL_MS = 100;

export function useElapsedTick(
  isActive: boolean,
  onTick: (deltaMs: number) => void
) {
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const interval = setInterval(() => {
      onTickRef.current(TICK_INTERVAL_MS);
    }, TICK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isActive]);
}
