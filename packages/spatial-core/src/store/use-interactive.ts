"use client";

import { create } from "zustand";
import type { Interactive } from "../schema/nodes/item";
import type { AnyNodeId } from "../schema/types";

export type ControlValue = boolean | number;

export type ItemInteractiveState = {
  controlValues: ControlValue[];
};

type InteractiveStore = {
  items: Record<string, ItemInteractiveState>;
  initItem: (itemId: AnyNodeId, interactive: Interactive) => void;
  setControlValue: (
    itemId: AnyNodeId,
    index: number,
    value: ControlValue
  ) => void;
  removeItem: (itemId: AnyNodeId) => void;
};

const defaultControlValue = (
  interactive: Interactive,
  index: number
): ControlValue => {
  const control = interactive.controls[index];
  if (!control) {
    return false;
  }
  switch (control.kind) {
    case "toggle":
      return control.default ?? false;
    case "slider":
      return control.default ?? control.min;
    case "temperature":
      return control.default ?? control.min;
    default:
      return false;
  }
};

export const useInteractive = create<InteractiveStore>((set, get) => ({
  items: {},

  initItem: (itemId, interactive) => {
    const { controls } = interactive;
    if (controls.length === 0) {
      return;
    }

    if (get().items[itemId]) {
      return;
    }

    set((state) => ({
      items: {
        ...state.items,
        [itemId]: {
          controlValues: controls.map((_, i) =>
            defaultControlValue(interactive, i)
          ),
        },
      },
    }));
  },

  setControlValue: (itemId, index, value) => {
    set((state) => {
      const item = state.items[itemId];
      if (!item) {
        return state;
      }
      const next = [...item.controlValues];
      next[index] = value;
      return { items: { ...state.items, [itemId]: { controlValues: next } } };
    });
  },

  removeItem: (itemId) => {
    set((state) => {
      const { [itemId]: _, ...rest } = state.items;
      return { items: rest };
    });
  },
}));
