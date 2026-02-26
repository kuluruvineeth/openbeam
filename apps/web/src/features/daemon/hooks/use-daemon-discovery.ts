"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DAEMON_DEFAULT_PORT } from "../constants";
import { buildDefaultEndpoint } from "../lib/daemon-client";

export interface DiscoveredDaemon {
  endpoint: string;
  serverId: string | null;
  version: string | null;
  latencyMs: number;
}

interface DiscoveryState {
  daemons: DiscoveredDaemon[];
  isProbing: boolean;
  lastProbeAt: number | null;
  error: string | null;
}

const PROBE_TIMEOUT_MS = 3000;
const PROBE_INTERVAL_MS = 30_000;
const DEFAULT_PROBE_PORTS = [DAEMON_DEFAULT_PORT];

interface UseDaemonDiscoveryOptions {
  enabled?: boolean;
  probePorts?: number[];
  probeIntervalMs?: number;
  hosts?: string[];
}

export function useDaemonDiscovery(
  options: UseDaemonDiscoveryOptions = {}
): DiscoveryState & { probe: () => void } {
  const {
    enabled = true,
    probePorts = DEFAULT_PROBE_PORTS,
    probeIntervalMs = PROBE_INTERVAL_MS,
    hosts = ["127.0.0.1"],
  } = options;

  const [state, setState] = useState<DiscoveryState>({
    daemons: [],
    isProbing: false,
    lastProbeAt: null,
    error: null,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const probe = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) => ({ ...prev, isProbing: true, error: null }));

    const candidates: Array<{ host: string; port: number }> = [];
    for (const host of hosts) {
      for (const port of probePorts) {
        candidates.push({ host, port });
      }
    }

    const results: DiscoveredDaemon[] = [];

    const probes = candidates.map(async ({ host, port }) => {
      const endpoint = buildDefaultEndpoint(host, port);
      const start = performance.now();

      try {
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(
          () => timeoutController.abort(),
          PROBE_TIMEOUT_MS
        );
        const onAbort = () => timeoutController.abort();
        controller.signal.addEventListener("abort", onAbort, { once: true });

        const response = await fetch(`${endpoint}/health`, {
          signal: timeoutController.signal,
          cache: "no-store",
        }).finally(() => {
          clearTimeout(timeoutId);
          controller.signal.removeEventListener("abort", onAbort);
        });

        if (!response.ok) {
          return;
        }

        const latencyMs = performance.now() - start;
        let serverId: string | null = null;
        let version: string | null = null;

        try {
          const body = await response.json();
          serverId = typeof body.serverId === "string" ? body.serverId : null;
          version = typeof body.version === "string" ? body.version : null;
        } catch {
          /* health endpoint may return non-JSON */
        }

        results.push({ endpoint, serverId, version, latencyMs });
      } catch {
        /* probe failed, skip */
      }
    });

    await Promise.allSettled(probes);

    if (controller.signal.aborted) {
      return;
    }

    results.sort((a, b) => a.latencyMs - b.latencyMs);

    setState({
      daemons: results,
      isProbing: false,
      lastProbeAt: Date.now(),
      error: results.length === 0 ? "No daemons found" : null,
    });
  }, [hosts, probePorts]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    probe();

    intervalRef.current = setInterval(probe, probeIntervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      abortRef.current?.abort();
    };
  }, [enabled, probe, probeIntervalMs]);

  return { ...state, probe };
}
