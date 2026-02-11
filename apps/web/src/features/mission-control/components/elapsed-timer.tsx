"use client";

import { useEffect, useState } from "react";

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const _HOUR_MS = 60 * MINUTE_MS;

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / SECOND_MS));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

type ElapsedTimerProps = {
  startedAt: number;
  status: string;
};

export function ElapsedTimer({ startedAt, status }: ElapsedTimerProps) {
  const [elapsed, setElapsed] = useState(() =>
    startedAt > 0 ? Date.now() - startedAt : 0
  );
  const isTicking = status === "ACTIVE";

  useEffect(() => {
    if (!isTicking || startedAt <= 0) {
      return;
    }

    let raf: number;
    const tick = () => {
      setElapsed(Date.now() - startedAt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [startedAt, isTicking]);

  if (startedAt <= 0) {
    return (
      <span className="font-mono text-muted-foreground text-sm tabular-nums">
        --:--:--
      </span>
    );
  }

  return (
    <span className="font-mono text-muted-foreground text-sm tabular-nums">
      {formatElapsed(elapsed)}
    </span>
  );
}
