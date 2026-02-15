"use client";

import { useHotkeys } from "react-hotkeys-hook";

type UseDetailKeyboardOptions = {
  enabled: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onDeselectAgent: () => void;
  onPauseResume: () => void;
  onCancel: () => void;
  onPrevMission: () => void;
  onNextMission: () => void;
};

export function useDetailKeyboard({
  enabled,
  onToggleLeft,
  onToggleRight,
  onDeselectAgent,
  onPauseResume,
  onCancel,
  onPrevMission,
  onNextMission,
}: UseDetailKeyboardOptions) {
  useHotkeys(
    "mod+shift+b",
    (e) => {
      e.preventDefault();
      onToggleLeft();
    },
    { enabled }
  );

  useHotkeys(
    "mod+b",
    (e) => {
      e.preventDefault();
      onToggleRight();
    },
    { enabled }
  );

  useHotkeys("escape", onDeselectAgent, { enabled });

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
