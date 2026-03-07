"use client";

// biome-ignore lint/correctness/noUnusedImports: context provider
import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useLocalStorage } from "usehooks-ts";

const STORAGE_KEY = "openbeam-sidebar-pinned";

type SidebarState = {
  isOpen: boolean;
  isPinned: boolean;
  open: () => void;
  close: () => void;
  togglePin: () => void;
};

const SidebarContext = createContext<SidebarState | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useLocalStorage(STORAGE_KEY, false);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    if (!isPinned) {
      setIsOpen(false);
    }
  }, [isPinned]);

  const togglePin = useCallback(() => {
    setIsPinned((prev) => {
      const next = !prev;
      if (next) {
        setIsOpen(true);
      }
      return next;
    });
  }, [setIsPinned]);

  const value = useMemo(
    () => ({
      isOpen: isOpen || isPinned,
      isPinned,
      open,
      close,
      togglePin,
    }),
    [isOpen, isPinned, open, close, togglePin]
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarState {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}
