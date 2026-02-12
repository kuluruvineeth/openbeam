"use client";

import { useEffect, useState } from "react";

const SECOND_MS = 1000;

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
  endedAt?: number;
  status: string;
};

export function ElapsedTimer({
  startedAt,
  endedAt,
  status,
}: ElapsedTimerProps) {
  const fixedDuration =
    endedAt && endedAt > 0 && startedAt > 0 ? endedAt - startedAt : null;

  const [elapsed, setElapsed] = useState(
    () => fixedDuration ?? (startedAt > 0 ? Date.now() - startedAt : 0)
  );
  const isTicking = status === "ACTIVE" && !fixedDuration;

  useEffect(() => {
    if (fixedDuration !== null) {
      setElapsed(fixedDuration);
      return;
    }

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
  }, [startedAt, isTicking, fixedDuration]);

  if (startedAt <= 0) {
    return null;
  }

  return (
    <span className="font-mono text-muted-foreground text-sm tabular-nums">
      {formatElapsed(elapsed)}
    </span>
  );
}
