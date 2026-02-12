"use client";

import { useCallback, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

type DrawerType = "tasks" | "artifacts" | "debug" | "agents" | null;

function useMissionDrawer() {
  const [openDrawer, setOpenDrawer] = useState<DrawerType>(null);

  const open = useCallback((type: Exclude<DrawerType, null>) => {
    setOpenDrawer(type);
  }, []);

  const toggle = useCallback((type: DrawerType) => {
    setOpenDrawer((prev) => (prev === type ? null : type));
  }, []);

  const close = useCallback(() => setOpenDrawer(null), []);

  useHotkeys("mod+shift+t", (e) => {
    e.preventDefault();
    toggle("tasks");
  });

  useHotkeys("mod+shift+a", (e) => {
    e.preventDefault();
    toggle("artifacts");
  });

  useHotkeys("mod+shift+d", (e) => {
    e.preventDefault();
    toggle("debug");
  });

  useHotkeys("mod+shift+g", (e) => {
    e.preventDefault();
    toggle("agents");
  });

  useHotkeys("escape", close, { enabled: openDrawer !== null });

  return { openDrawer, open, close } as const;
}

export type { DrawerType };
export { useMissionDrawer };
