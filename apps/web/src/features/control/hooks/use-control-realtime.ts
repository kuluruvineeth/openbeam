"use client";

type ControlEvent = {
  type: string;
  payload: Record<string, string>;
};

export function useControlRealtimeEvents(
  _onEvent: (event: ControlEvent) => void
) {
  // TODO: implement when tRPC subscription client is configured
}

export function useAgentStatusUpdates(
  _agentId: string | undefined,
  _onStatusChange: (status: string) => void
) {
  // TODO: implement when tRPC subscription client is configured
}

export function useRunUpdates(
  _runId: string | undefined,
  _handlers: {
    onStarted?: (agentId: string) => void;
    onCompleted?: (status: string) => void;
    onOutput?: (stream: string, chunk: string) => void;
  }
) {
  // TODO: implement when tRPC subscription client is configured
}
