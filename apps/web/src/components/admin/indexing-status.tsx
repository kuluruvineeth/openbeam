"use client";

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Icons,
} from "@openplane/ui";
import { useEffect, useState } from "react";
import { POLLING_INTERVALS } from "@/lib/constants/polling";

interface QueueMetrics {
  waiting: number;
  active: number;
  failed: number;
  delayed?: number;
}

interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: number;
  queues: {
    sync: QueueMetrics;
    index: QueueMetrics;
    webhook: QueueMetrics;
  };
  vespa: {
    status: "healthy" | "unhealthy" | "unknown";
    latency_ms?: number;
    error?: string;
  };
  worker: {
    status: "healthy" | "unhealthy" | "unknown";
    error?: string;
  };
}

export function IndexingStatus() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch("/api/health/system");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        setHealth(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch health");
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();

    const interval = setInterval(fetchHealth, POLLING_INTERVALS.SYSTEM_HEALTH);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error || !health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription className="text-destructive">
            Error: {error || "No data available"}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return (
          <Badge className="bg-green-500" variant="default">
            <Icons.CheckCircle className="mr-1" size={12} />
            Healthy
          </Badge>
        );
      case "degraded":
        return (
          <Badge className="bg-yellow-500" variant="default">
            <Icons.AlertCircle className="mr-1" size={12} />
            Degraded
          </Badge>
        );
      case "unhealthy":
        return (
          <Badge variant="destructive">
            <Icons.Close className="mr-1" size={12} />
            Unhealthy
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Icons.Clock className="mr-1" size={12} />
            Unknown
          </Badge>
        );
    }
  };

  const totalWaiting = health.queues.sync.waiting + health.queues.index.waiting;
  const totalActive = health.queues.sync.active + health.queues.index.active;
  const totalFailed = health.queues.sync.failed + health.queues.index.failed;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>System Health</CardTitle>
            <CardDescription>
              Real-time monitoring of indexing pipeline
            </CardDescription>
          </div>
          {getStatusBadge(health.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="mb-2 font-semibold text-sm">Queue Overview</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="font-bold text-2xl">{totalActive}</p>
              <p className="text-muted-foreground text-xs">Active</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-2xl">{totalWaiting}</p>
              <p className="text-muted-foreground text-xs">Waiting</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-2xl text-destructive">
                {totalFailed}
              </p>
              <p className="text-muted-foreground text-xs">Failed</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Queue Details</h4>

          <div className="flex items-center justify-between rounded bg-muted/50 p-2">
            <span className="font-medium text-sm">Sync Queue</span>
            <div className="space-x-2 text-sm">
              <span className="text-muted-foreground">
                Active:{" "}
                <span className="font-semibold">
                  {health.queues.sync.active}
                </span>
              </span>
              <span className="text-muted-foreground">
                Waiting:{" "}
                <span className="font-semibold">
                  {health.queues.sync.waiting}
                </span>
              </span>
              {health.queues.sync.failed > 0 && (
                <span className="text-destructive">
                  Failed:{" "}
                  <span className="font-semibold">
                    {health.queues.sync.failed}
                  </span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded bg-muted/50 p-2">
            <span className="font-medium text-sm">Index Queue</span>
            <div className="space-x-2 text-sm">
              <span className="text-muted-foreground">
                Active:{" "}
                <span className="font-semibold">
                  {health.queues.index.active}
                </span>
              </span>
              <span className="text-muted-foreground">
                Waiting:{" "}
                <span className="font-semibold">
                  {health.queues.index.waiting}
                </span>
              </span>
              {health.queues.index.failed > 0 && (
                <span className="text-destructive">
                  Failed:{" "}
                  <span className="font-semibold">
                    {health.queues.index.failed}
                  </span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded bg-muted/50 p-2">
            <span className="font-medium text-sm">Webhook Queue</span>
            <div className="space-x-2 text-sm">
              <span className="text-muted-foreground">
                Active:{" "}
                <span className="font-semibold">
                  {health.queues.webhook.active}
                </span>
              </span>
              <span className="text-muted-foreground">
                Waiting:{" "}
                <span className="font-semibold">
                  {health.queues.webhook.waiting}
                </span>
              </span>
              {health.queues.webhook.failed > 0 && (
                <span className="text-destructive">
                  Failed:{" "}
                  <span className="font-semibold">
                    {health.queues.webhook.failed}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Services</h4>

          <div className="flex items-center justify-between rounded bg-muted/50 p-2">
            <span className="font-medium text-sm">Vespa</span>
            <div className="flex items-center gap-2">
              {health.vespa.latency_ms && (
                <span className="text-muted-foreground text-xs">
                  {health.vespa.latency_ms}ms
                </span>
              )}
              {getStatusBadge(health.vespa.status)}
            </div>
          </div>

          <div className="flex items-center justify-between rounded bg-muted/50 p-2">
            <span className="font-medium text-sm">Worker</span>
            {getStatusBadge(health.worker.status)}
          </div>
        </div>

        <div className="text-right text-muted-foreground text-xs">
          Last updated: {new Date(health.timestamp).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
}
