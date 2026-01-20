"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { useTRPC } from "@/trpc/client";

interface SearchTiming {
  embeddingMs: number;
  retrievalMs: number;
  fusionMs: number;
  rerankMs?: number;
  ltrMs?: number;
  totalMs: number;
}

interface RRFConfig {
  k: number;
  weights: {
    bm25: number;
    dense: number;
    sparse: number;
  };
}

interface TrackImpressionInput {
  query: string;
  resultDocIds: string[];
  mode: string;
  experimentId?: string;
  variant?: "control" | "treatment";
  timing: SearchTiming;
  rrfConfig?: RRFConfig;
}

interface TrackClickInput {
  docId: string;
  position: number;
}

interface UseSearchTrackingOptions {
  enabled?: boolean;
}

export function useSearchTracking(options: UseSearchTrackingOptions = {}) {
  const { enabled = true } = options;
  const trpc = useTRPC();
  const impressionIdRef = useRef<string | null>(null);
  const clickStartTimeRef = useRef<Map<string, number>>(new Map());

  const recordImpressionMutation = useMutation(
    trpc.analytics.recordImpression.mutationOptions()
  );

  const recordClickMutation = useMutation(
    trpc.analytics.recordClick.mutationOptions()
  );

  const updateDwellTimeMutation = useMutation(
    trpc.analytics.updateDwellTime.mutationOptions()
  );

  const submitFeedbackMutation = useMutation(
    trpc.analytics.submitFeedback.mutationOptions()
  );

  const trackImpression = useCallback(
    async (input: TrackImpressionInput): Promise<string | null> => {
      if (!enabled) {
        return null;
      }

      const result = await recordImpressionMutation.mutateAsync({
        query: input.query,
        resultDocIds: input.resultDocIds,
        mode: input.mode,
        experimentId: input.experimentId,
        variant: input.variant,
        timing: input.timing,
        rrfConfig: input.rrfConfig,
      });

      impressionIdRef.current = result.impressionId;
      return result.impressionId;
    },
    [enabled, recordImpressionMutation]
  );

  const trackClick = useCallback(
    async (input: TrackClickInput): Promise<void> => {
      if (!(enabled && impressionIdRef.current)) {
        return;
      }

      clickStartTimeRef.current.set(input.docId, Date.now());

      await recordClickMutation.mutateAsync({
        impressionId: impressionIdRef.current,
        docId: input.docId,
        position: input.position,
      });
    },
    [enabled, recordClickMutation]
  );

  const trackDwellEnd = useCallback(
    async (docId: string): Promise<void> => {
      if (!(enabled && impressionIdRef.current)) {
        return;
      }

      const startTime = clickStartTimeRef.current.get(docId);
      if (!startTime) {
        return;
      }

      const dwellTimeMs = Date.now() - startTime;
      clickStartTimeRef.current.delete(docId);

      if (dwellTimeMs < 500) {
        return;
      }

      await updateDwellTimeMutation.mutateAsync({
        impressionId: impressionIdRef.current,
        docId,
        dwellTimeMs,
      });
    },
    [enabled, updateDwellTimeMutation]
  );

  const trackFeedback = useCallback(
    async (
      docId: string,
      feedbackType: "helpful" | "not_helpful"
    ): Promise<void> => {
      if (!(enabled && impressionIdRef.current)) {
        return;
      }

      await submitFeedbackMutation.mutateAsync({
        impressionId: impressionIdRef.current,
        docId,
        feedbackType,
      });
    },
    [enabled, submitFeedbackMutation]
  );

  const resetTracking = useCallback(() => {
    impressionIdRef.current = null;
    clickStartTimeRef.current.clear();
  }, []);

  return {
    trackImpression,
    trackClick,
    trackDwellEnd,
    trackFeedback,
    resetTracking,
    impressionId: impressionIdRef.current,
    isTrackingImpression: recordImpressionMutation.isPending,
    isTrackingClick: recordClickMutation.isPending,
  };
}
