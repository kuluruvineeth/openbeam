"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type ChatPanelState = {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
};

export const useChatPanelStore = create<ChatPanelState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggle: () => set((s) => ({ collapsed: !s.collapsed })),
      setCollapsed: (collapsed) => set({ collapsed }),
    }),
    {
      name: "chat-panel",
      partialize: (state) => ({ collapsed: state.collapsed }),
    }
  )
);
