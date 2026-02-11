"use client";

import { useCallback } from "react";
import { useMissionRuntimeStore } from "../stores/mission-runtime-store";

export function useApprovalActions(_missionId: string) {
  const store = useMissionRuntimeStore;

  const approve = useCallback(
    (approvalId: string) => {
      store.setState((state) => ({
        approvalQueue: state.approvalQueue.map((item) =>
          item.approvalId === approvalId
            ? {
                ...item,
                status: "approved" as const,
                resolvedAt: Date.now(),
              }
            : item
        ),
        selectedApprovalIds: (() => {
          const next = new Set(state.selectedApprovalIds);
          next.delete(approvalId);
          return next;
        })(),
      }));
    },
    [store]
  );

  const reject = useCallback(
    (approvalId: string, reason?: string) => {
      store.setState((state) => ({
        approvalQueue: state.approvalQueue.map((item) =>
          item.approvalId === approvalId
            ? {
                ...item,
                status: "rejected" as const,
                resolvedAt: Date.now(),
                reason,
              }
            : item
        ),
        selectedApprovalIds: (() => {
          const next = new Set(state.selectedApprovalIds);
          next.delete(approvalId);
          return next;
        })(),
      }));
    },
    [store]
  );

  const bulkApprove = useCallback(() => {
    const selectedIds = store.getState().selectedApprovalIds;
    store.setState((state) => ({
      approvalQueue: state.approvalQueue.map((item) =>
        selectedIds.has(item.approvalId) && item.status === "pending"
          ? {
              ...item,
              status: "approved" as const,
              resolvedAt: Date.now(),
            }
          : item
      ),
      selectedApprovalIds: new Set<string>(),
    }));
  }, [store]);

  const bulkReject = useCallback(() => {
    const selectedIds = store.getState().selectedApprovalIds;
    store.setState((state) => ({
      approvalQueue: state.approvalQueue.map((item) =>
        selectedIds.has(item.approvalId) && item.status === "pending"
          ? {
              ...item,
              status: "rejected" as const,
              resolvedAt: Date.now(),
            }
          : item
      ),
      selectedApprovalIds: new Set<string>(),
    }));
  }, [store]);

  return { approve, reject, bulkApprove, bulkReject };
}
