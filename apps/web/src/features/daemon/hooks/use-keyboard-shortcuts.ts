"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { setCommandCenterFocusRestoreElement } from "../lib/command-center-focus";
import {
  buildDaemonAgentDetailRoute,
  daemonNavigate,
  parseHostAgentRouteFromPathname,
  parseServerIdFromPathname,
} from "../lib/host-routes";
import { useKeyboardShortcutsStore } from "../stores/keyboard-shortcuts-store";
import { useSessionStore } from "../stores/session-store";

function parseSidebarAgentKey(
  key: string
): { serverId: string; agentId: string } | null {
  const separatorIndex = key.indexOf(":");
  if (separatorIndex <= 0 || separatorIndex >= key.length - 1) {
    return null;
  }
  return {
    serverId: key.slice(0, separatorIndex),
    agentId: key.slice(separatorIndex + 1),
  };
}

function isDocumentVisible(): boolean {
  return (
    typeof document !== "undefined" && document.visibilityState === "visible"
  );
}

export function useKeyboardShortcuts({
  enabled,
  toggleAgentList,
  selectedAgentId,
  toggleFileExplorer,
}: {
  enabled: boolean;
  toggleAgentList: () => void;
  selectedAgentId?: string;
  toggleFileExplorer?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const resetModifiers = useKeyboardShortcutsStore((s) => s.resetModifiers);

  useHotkeys(
    "mod+k",
    (event) => {
      if (!isDocumentVisible()) {
        return;
      }
      event.preventDefault();
      const store = useKeyboardShortcutsStore.getState();
      if (!store.commandCenterOpen) {
        const target = event.target instanceof Element ? event.target : null;
        const targetEl =
          target?.closest?.("textarea, input, [contenteditable='true']") ??
          (target instanceof HTMLElement ? target : null);
        const active = document.activeElement;
        const activeEl = active instanceof HTMLElement ? active : null;
        setCommandCenterFocusRestoreElement(
          (targetEl as HTMLElement | null) ?? activeEl ?? null
        );
      }
      store.setCommandCenterOpen(!store.commandCenterOpen);
    },
    { enabled, enableOnFormTags: true }
  );

  useHotkeys(
    "mod+alt+n",
    (event) => {
      if (!isDocumentVisible()) {
        return;
      }
      event.preventDefault();
      let targetServerId = parseServerIdFromPathname(pathname);
      if (!targetServerId) {
        const sessionServerIds = Object.keys(
          useSessionStore.getState().sessions
        );
        targetServerId = sessionServerIds[0] ?? null;
      }
      if (!targetServerId) {
        return;
      }
      daemonNavigate(
        router,
        buildDaemonAgentDetailRoute(targetServerId, "new")
      );
    },
    { enabled, enableOnFormTags: true },
    [pathname, router]
  );

  useHotkeys(
    "mod+b",
    (event) => {
      if (!isDocumentVisible()) {
        return;
      }
      event.preventDefault();
      toggleAgentList();
    },
    { enabled, enableOnFormTags: true },
    [toggleAgentList]
  );

  useHotkeys(
    "mod+e",
    (event) => {
      if (!isDocumentVisible()) {
        return;
      }
      if (!toggleFileExplorer) {
        return;
      }
      const agentRoute = parseHostAgentRouteFromPathname(pathname);
      if (!(agentRoute || selectedAgentId)) {
        return;
      }
      event.preventDefault();
      toggleFileExplorer();
    },
    { enabled, enableOnFormTags: true },
    [pathname, selectedAgentId, toggleFileExplorer]
  );

  useHotkeys(
    "mod+1, mod+2, mod+3, mod+4, mod+5, mod+6, mod+7, mod+8, mod+9",
    (event) => {
      if (!isDocumentVisible()) {
        return;
      }
      const digit = Number.parseInt(event.key, 10);
      if (digit < 1 || digit > 9) {
        return;
      }
      const state = useKeyboardShortcutsStore.getState();
      const targetKey = state.sidebarShortcutAgentKeys[digit - 1] ?? null;
      if (!targetKey) {
        return;
      }
      const parsed = parseSidebarAgentKey(targetKey);
      if (!parsed) {
        return;
      }
      event.preventDefault();
      const mode = parseHostAgentRouteFromPathname(pathname)
        ? "replace"
        : "push";
      const route = buildDaemonAgentDetailRoute(
        parsed.serverId,
        parsed.agentId
      );
      daemonNavigate(router, route, mode);
    },
    { enabled, enableOnFormTags: true },
    [pathname, router]
  );

  useHotkeys(
    "mod+shift+/",
    (event) => {
      if (!isDocumentVisible()) {
        return;
      }
      event.preventDefault();
      const store = useKeyboardShortcutsStore.getState();
      store.setShortcutsDialogOpen(!store.shortcutsDialogOpen);
    },
    { enabled, enableOnFormTags: true }
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key ?? "";
      if (key === "Alt" && !event.shiftKey) {
        useKeyboardShortcutsStore.getState().setAltDown(true);
      }
      if (key === "Shift") {
        const state = useKeyboardShortcutsStore.getState();
        if (state.altDown || state.cmdOrCtrlDown) {
          state.resetModifiers();
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key ?? "";
      if (key === "Alt") {
        useKeyboardShortcutsStore.getState().setAltDown(false);
      }
    };

    const handleBlurOrHide = () => {
      resetModifiers();
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("blur", handleBlurOrHide);
    document.addEventListener("visibilitychange", handleBlurOrHide);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
      window.removeEventListener("blur", handleBlurOrHide);
      document.removeEventListener("visibilitychange", handleBlurOrHide);
    };
  }, [enabled, resetModifiers]);
}
