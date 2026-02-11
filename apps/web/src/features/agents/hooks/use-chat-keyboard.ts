"use client";

import { useHotkeys } from "react-hotkeys-hook";

export type UseChatKeyboardOptions = {
  enabled?: boolean;
  onSubmit?: () => void;
  onCancel?: () => void;
  onClearChat?: () => void;
  onFocusInput?: () => void;
  onToggleHistory?: () => void;
};

export function useChatKeyboard(options: UseChatKeyboardOptions): void {
  useHotkeys("mod+enter", () => options.onSubmit?.(), {
    enabled: !!options.enabled && !!options.onSubmit,
    enableOnFormTags: true,
  });

  useHotkeys("escape", () => options.onCancel?.(), {
    enabled: !!options.enabled && !!options.onCancel,
  });

  useHotkeys("mod+shift+backspace", () => options.onClearChat?.(), {
    enabled: !!options.enabled && !!options.onClearChat,
  });

  useHotkeys(
    "mod+l",
    (e) => {
      e.preventDefault();
      options.onFocusInput?.();
    },
    {
      enabled: !!options.enabled && !!options.onFocusInput,
      enableOnFormTags: true,
    }
  );

  useHotkeys(
    "mod+h",
    (e) => {
      e.preventDefault();
      options.onToggleHistory?.();
    },
    {
      enabled: !!options.enabled && !!options.onToggleHistory,
    }
  );
}
