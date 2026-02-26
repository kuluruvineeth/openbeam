"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface SectionOrderState {
  projectOrder: string[];
  setProjectOrder: (order: string[]) => void;
  moveProject: (fromIndex: number, toIndex: number) => void;
}

export const useSectionOrderStore = create<SectionOrderState>()(
  persist(
    (set) => ({
      projectOrder: [],

      setProjectOrder: (order) => set({ projectOrder: order }),

      moveProject: (fromIndex, toIndex) =>
        set((state) => {
          const newOrder = [...state.projectOrder];
          const [removed] = newOrder.splice(fromIndex, 1);
          if (removed !== undefined) {
            newOrder.splice(toIndex, 0, removed);
          }
          return { projectOrder: newOrder };
        }),
    }),
    {
      name: "openplane-daemon-section-order",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        projectOrder: state.projectOrder,
      }),
    }
  )
);

export function sortProjectsByStoredOrder<T extends { projectKey: string }>(
  groups: T[],
  storedOrder: string[]
): T[] {
  if (storedOrder.length === 0) {
    return groups;
  }

  const orderMap = new Map(storedOrder.map((key, index) => [key, index]));

  return [...groups].sort((a, b) => {
    const aIndex = orderMap.get(a.projectKey);
    const bIndex = orderMap.get(b.projectKey);

    if (aIndex !== undefined && bIndex !== undefined) {
      return aIndex - bIndex;
    }
    if (aIndex !== undefined) {
      return -1;
    }
    if (bIndex !== undefined) {
      return 1;
    }
    return 0;
  });
}
