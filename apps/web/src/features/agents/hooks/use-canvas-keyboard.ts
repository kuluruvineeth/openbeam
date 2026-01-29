"use client";

import { useHotkeys } from "react-hotkeys-hook";

interface UseCanvasKeyboardOptions {
  onSave?: () => void;
  enabled?: boolean;
}

export function useCanvasKeyboard({
  onSave,
  enabled = true,
}: UseCanvasKeyboardOptions) {
  useHotkeys(
    "mod+s",
    (e) => {
      e.preventDefault();
      onSave?.();
    },
    { enabled: enabled && !!onSave, enableOnFormTags: true }
  );
}
