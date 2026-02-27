"use client";

import { create } from "zustand";

const SUCCESS_DISPLAY_MS = 1000;

export type CheckoutGitActionStatus = "idle" | "pending" | "success";

export type CheckoutGitAsyncActionId =
  | "commit"
  | "push"
  | "create-pr"
  | "merge-branch"
  | "merge-from-base"
  | "archive-worktree";

type CheckoutKey = string;
type StatusMap = Partial<
  Record<CheckoutGitAsyncActionId, CheckoutGitActionStatus>
>;

function checkoutKey(serverId: string, cwd: string): CheckoutKey {
  return `${serverId}::${cwd}`;
}

function setStatus(
  key: CheckoutKey,
  actionId: CheckoutGitAsyncActionId,
  status: CheckoutGitActionStatus
) {
  useCheckoutGitActionsStore.setState((state) => {
    const current = state.statusByCheckout[key]?.[actionId] ?? "idle";
    if (current === status) {
      return state;
    }
    return {
      ...state,
      statusByCheckout: {
        ...state.statusByCheckout,
        [key]: {
          ...(state.statusByCheckout[key] ?? {}),
          [actionId]: status,
        },
      },
    };
  });
}

const successTimers = new Map<string, ReturnType<typeof setTimeout>>();
const inFlight = new Map<string, Promise<unknown>>();

function inFlightKey(
  key: CheckoutKey,
  actionId: CheckoutGitAsyncActionId
): string {
  return `${key}::${actionId}`;
}

export interface CheckoutGitActionRunner {
  serverId: string;
  cwd: string;
  actionId: CheckoutGitAsyncActionId;
  run: () => Promise<void>;
  onComplete?: () => void;
}

export async function runCheckoutAction({
  serverId,
  cwd,
  actionId,
  run,
  onComplete,
}: CheckoutGitActionRunner): Promise<void> {
  const key = checkoutKey(serverId, cwd);
  const inflightId = inFlightKey(key, actionId);

  const existing = inFlight.get(inflightId);
  if (existing) {
    await existing;
    return;
  }

  const prevTimer = successTimers.get(inflightId);
  if (prevTimer) {
    clearTimeout(prevTimer);
    successTimers.delete(inflightId);
  }

  setStatus(key, actionId, "pending");

  const promise = (async () => {
    try {
      await run();
      onComplete?.();
      setStatus(key, actionId, "success");
      const timer = setTimeout(() => {
        setStatus(key, actionId, "idle");
        successTimers.delete(inflightId);
      }, SUCCESS_DISPLAY_MS);
      successTimers.set(inflightId, timer);
    } catch {
      setStatus(key, actionId, "idle");
    } finally {
      inFlight.delete(inflightId);
    }
  })();

  inFlight.set(inflightId, promise);
  await promise;
}

interface CheckoutGitActionsStoreState {
  statusByCheckout: Record<CheckoutKey, StatusMap>;
  getStatus: (params: {
    serverId: string;
    cwd: string;
    actionId: CheckoutGitAsyncActionId;
  }) => CheckoutGitActionStatus;
}

export const useCheckoutGitActionsStore =
  create<CheckoutGitActionsStoreState>()((_, get) => ({
    statusByCheckout: {},

    getStatus: ({ serverId, cwd, actionId }) => {
      const key = checkoutKey(serverId, cwd);
      return get().statusByCheckout[key]?.[actionId] ?? "idle";
    },
  }));

export function resetCheckoutGitActionsStoreForTests() {
  for (const timer of successTimers.values()) {
    clearTimeout(timer);
  }
  successTimers.clear();
  inFlight.clear();
  useCheckoutGitActionsStore.setState({ statusByCheckout: {} });
}
