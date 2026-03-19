"use client";

import { Icons } from "@openbeam/ui";
import type React from "react";
import { cn } from "./../../../lib/utils";
import useEditor, { type Mode, type Phase } from "./../../../store/use-editor";
import { ActionButton } from "./action-button";

type ModeConfig = {
  id: Mode;
  icon: React.ReactNode;
  label: string;
  shortcut: string;
  color: string;
  activeColor: string;
};

const allModes: ModeConfig[] = [
  {
    id: "select",
    icon: <Icons.Pointer size={20} />,
    label: "Select",
    shortcut: "V",
    color: "hover:bg-blue-500/20 hover:text-blue-400",
    activeColor: "bg-blue-500/20 text-blue-400",
  },
  {
    id: "edit",
    icon: <Icons.Pencil size={20} />,
    label: "Edit",
    shortcut: "E",
    color: "hover:bg-orange-500/20 hover:text-orange-400",
    activeColor: "bg-orange-500/20 text-orange-400",
  },
  {
    id: "build",
    icon: <Icons.Wrench size={20} />,
    label: "Build",
    shortcut: "B",
    color: "hover:bg-green-500/20 hover:text-green-400",
    activeColor: "bg-green-500/20 text-green-400",
  },
  {
    id: "delete",
    icon: <Icons.Trash size={20} />,
    label: "Delete",
    shortcut: "D",
    color: "hover:bg-red-500/20 hover:text-red-400",
    activeColor: "bg-red-500/20 text-red-400",
  },
];

const modesByPhase: Record<Phase, Mode[]> = {
  site: ["select", "edit"],
  structure: ["select", "delete", "build"],
  furnish: ["select", "delete", "build"],
};

export function ControlModes() {
  const mode = useEditor((state) => state.mode);
  const phase = useEditor((state) => state.phase);
  const setMode = useEditor((state) => state.setMode);

  const availableModeIds = modesByPhase[phase];
  const availableModes = allModes.filter((m) =>
    availableModeIds.includes(m.id)
  );

  // biome-ignore lint/nursery/noShadow: acceptable
  const handleModeClick = (mode: Mode) => {
    setMode(mode);
  };

  return (
    <div className="flex items-center gap-1">
      {availableModes.map((m) => {
        const isActive = mode === m.id;

        return (
          <ActionButton
            className={cn(
              "text-[#76766e]",
              !isActive && m.color,
              !isActive && "opacity-60",
              isActive && m.activeColor
            )}
            key={m.id}
            label={m.label}
            onClick={() => handleModeClick(m.id)}
            shortcut={m.shortcut}
            size="icon"
            variant="ghost"
          >
            {m.icon}
          </ActionButton>
        );
      })}
    </div>
  );
}
