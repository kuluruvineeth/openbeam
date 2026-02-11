"use client";

import type { CanvasSession } from "@openplane/types/canvas/session";
import { useCallback } from "react";
import { useAgenticRuntimeStore } from "../stores/agentic-runtime-store";
import { useAgenticRuntimeStream } from "./use-agentic-runtime-stream";
import { useAgenticSession } from "./use-agentic-session";

export type UseAgenticRuntimeControllerOptions = {
  canvasId: string;
  autoConnect?: boolean;
};

export type UseAgenticRuntimeControllerReturn = {
  session: CanvasSession | null;
  isConnected: boolean;
  isCreatingSession: boolean;
  connectionStatus: "idle" | "connecting" | "connected" | "error";
  activeExecutionId: string | null;
  activeTurnId: string | null;
  createOrResume: (sessionId?: string) => Promise<CanvasSession>;
  endSession: () => void;
  disconnect: () => void;
};

export function useAgenticRuntimeController(
  options: UseAgenticRuntimeControllerOptions
): UseAgenticRuntimeControllerReturn {
  const { canvasId, autoConnect = true } = options;

  const {
    session,
    isCreating,
    createOrResume: sessionCreateOrResume,
    endSession,
  } = useAgenticSession();

  const { isConnected, disconnect } = useAgenticRuntimeStream({
    sessionId: session?.id ?? "",
    enabled: autoConnect && !!session,
  });

  const connectionStatus = useAgenticRuntimeStore((s) => s.connectionStatus);
  const activeExecutionId = useAgenticRuntimeStore((s) => s.activeExecutionId);
  const activeTurnId = useAgenticRuntimeStore((s) => s.activeTurnId);

  const createOrResume = useCallback(
    (sessionId?: string) => sessionCreateOrResume(canvasId, sessionId),
    [canvasId, sessionCreateOrResume]
  );

  return {
    session,
    isConnected,
    isCreatingSession: isCreating,
    connectionStatus,
    activeExecutionId,
    activeTurnId,
    createOrResume,
    endSession,
    disconnect,
  };
}
