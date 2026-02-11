"use client";

import { useHotkeys } from "react-hotkeys-hook";

const TAB_BY_INDEX: Record<number, string> = {
  1: "timeline",
  2: "agents",
  3: "approvals",
  4: "tasks",
  5: "artifacts",
  6: "memory",
  7: "budget",
  8: "ledger",
};

type UseDetailKeyboardOptions = {
  enabled: boolean;
  onTabChange: (tab: string) => void;
  onPauseResume: () => void;
  onCancel: () => void;
  onPrevMission: () => void;
  onNextMission: () => void;
};

export function useDetailKeyboard({
  enabled,
  onTabChange,
  onPauseResume,
  onCancel,
  onPrevMission,
  onNextMission,
}: UseDetailKeyboardOptions) {
  useHotkeys("1", () => onTabChange(TAB_BY_INDEX[1]), { enabled });
  useHotkeys("2", () => onTabChange(TAB_BY_INDEX[2]), { enabled });
  useHotkeys("3", () => onTabChange(TAB_BY_INDEX[3]), { enabled });
  useHotkeys("4", () => onTabChange(TAB_BY_INDEX[4]), { enabled });
  useHotkeys("5", () => onTabChange(TAB_BY_INDEX[5]), { enabled });
  useHotkeys("6", () => onTabChange(TAB_BY_INDEX[6]), { enabled });
  useHotkeys("7", () => onTabChange(TAB_BY_INDEX[7]), { enabled });
  useHotkeys("8", () => onTabChange(TAB_BY_INDEX[8]), { enabled });

  useHotkeys(
    "mod+p",
    (e) => {
      e.preventDefault();
      onPauseResume();
    },
    { enabled }
  );

  useHotkeys(
    "mod+shift+c",
    (e) => {
      e.preventDefault();
      onCancel();
    },
    { enabled }
  );

  useHotkeys("[", onPrevMission, { enabled });
  useHotkeys("]", onNextMission, { enabled });
}
