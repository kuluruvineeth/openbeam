"use client";

import type { CanvasSession } from "@openplane/types/canvas/session";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useAgenticRuntimeStore } from "../stores/agentic-runtime-store";

function toCanvasSession(result: {
  id: string;
  agentCanvasId: string;
  teamId: string;
  userId: string;
  title: string | null;
  status: string;
  lastEventSequence: number;
  lastActivityAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): CanvasSession {
  return {
    id: result.id,
    agentCanvasId: result.agentCanvasId,
    teamId: result.teamId,
    userId: result.userId,
    title: result.title ?? undefined,
    status: result.status as CanvasSession["status"],
    lastEventSequence: result.lastEventSequence,
    lastActivityAt: result.lastActivityAt?.toISOString(),
    createdAt: result.createdAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
  };
}

export type UseAgenticSessionReturn = {
  session: CanvasSession | null;
  isCreating: boolean;
  error: Error | null;
  createOrResume: (
    canvasId: string,
    sessionId?: string
  ) => Promise<CanvasSession>;
  createNew: (canvasId: string) => Promise<CanvasSession>;
  switchTo: (canvasId: string, sessionId: string) => Promise<CanvasSession>;
  endSession: () => void;
};

export function useAgenticSession(): UseAgenticSessionReturn {
  const [session, setSession] = useState<CanvasSession | null>(null);

  const trpc = useTRPC();

  const resumeMutation = useMutation(
    trpc.agentCanvas.getOrCreateSession.mutationOptions()
  );

  const createMutation = useMutation(
    trpc.agentCanvas.createSession.mutationOptions()
  );

  const resumeRef = useRef(resumeMutation.mutateAsync);
  resumeRef.current = resumeMutation.mutateAsync;

  const createRef = useRef(createMutation.mutateAsync);
  createRef.current = createMutation.mutateAsync;

  const createOrResume = useCallback(
    async (canvasId: string, sessionId?: string): Promise<CanvasSession> => {
      useAgenticRuntimeStore.getState().resetSessionState();
      setSession(null);
      const result = await resumeRef.current({ canvasId, sessionId });
      const created = toCanvasSession(result);
      setSession(created);
      useAgenticRuntimeStore.getState().setSessionId(created.id);
      return created;
    },
    []
  );

  const createNew = useCallback(
    async (canvasId: string): Promise<CanvasSession> => {
      useAgenticRuntimeStore.getState().resetSessionState();
      setSession(null);
      const result = await createRef.current({ canvasId });
      const created = toCanvasSession(result);
      setSession(created);
      useAgenticRuntimeStore.getState().setSessionId(created.id);
      return created;
    },
    []
  );

  const switchTo = useCallback(
    async (canvasId: string, sessionId: string): Promise<CanvasSession> => {
      useAgenticRuntimeStore.getState().resetSessionState();
      setSession(null);
      const result = await resumeRef.current({ canvasId, sessionId });
      const created = toCanvasSession(result);
      setSession(created);
      useAgenticRuntimeStore.getState().setSessionId(created.id);
      return created;
    },
    []
  );

  const endSession = useCallback(() => {
    setSession(null);
    useAgenticRuntimeStore.getState().resetSessionState();
  }, []);

  const isPending = resumeMutation.isPending || createMutation.isPending;
  const error = resumeMutation.error ?? createMutation.error;

  return {
    session,
    isCreating: isPending,
    error: error ? new Error(error.message) : null,
    createOrResume,
    createNew,
    switchTo,
    endSession,
  };
}
