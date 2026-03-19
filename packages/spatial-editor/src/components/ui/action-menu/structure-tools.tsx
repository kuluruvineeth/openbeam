"use client";

import { Icons } from "@openbeam/ui";
import type { ReactNode } from "react";

import { cn } from "../../../lib/utils";
import useEditor, {
  type CatalogCategory,
  type StructureTool,
} from "../../../store/use-editor";
import { ActionButton } from "./action-button";

export type ToolConfig = {
  id: StructureTool;
  icon: ReactNode;
  label: string;
  catalogCategory?: CatalogCategory;
};

export const tools: ToolConfig[] = [
  { id: "wall", icon: <Icons.SidebarRight size={24} />, label: "Wall" },
  { id: "slab", icon: <Icons.Square size={24} />, label: "Slab" },
  { id: "ceiling", icon: <Icons.ArrowUp size={24} />, label: "Ceiling" },
  { id: "roof", icon: <Icons.Home size={24} />, label: "Gable Roof" },
  { id: "door", icon: <Icons.Expand size={24} />, label: "Door" },
  { id: "window", icon: <Icons.Grid3x3 size={24} />, label: "Window" },
  { id: "zone", icon: <Icons.RectangleSelect size={24} />, label: "Zone" },
];

export function StructureTools() {
  const activeTool = useEditor((state) => state.tool);
  const catalogCategory = useEditor((state) => state.catalogCategory);
  const structureLayer = useEditor((state) => state.structureLayer);
  const setTool = useEditor((state) => state.setTool);
  const setCatalogCategory = useEditor((state) => state.setCatalogCategory);

  const visibleTools =
    structureLayer === "zones"
      ? tools.filter((t) => t.id === "zone")
      : tools.filter((t) => t.id !== "zone");

  return (
    <div className="flex items-center gap-1.5 px-1">
      {visibleTools.map((tool, index) => {
        const isActive =
          activeTool === tool.id &&
          (tool.catalogCategory
            ? catalogCategory === tool.catalogCategory
            : true);

        return (
          <ActionButton
            className={cn(
              "rounded-lg duration-300",
              isActive
                ? "z-10 scale-110 bg-[#353530] text-[#ccc9c0] hover:bg-[#353530]"
                : "scale-95 bg-transparent text-[#76766e] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#ccc9c0]"
            )}
            key={`${tool.id}-${tool.catalogCategory ?? index}`}
            label={tool.label}
            onClick={() => {
              if (!isActive) {
                setTool(tool.id);
                setCatalogCategory(tool.catalogCategory ?? null);

                if (useEditor.getState().mode !== "build") {
                  useEditor.getState().setMode("build");
                }
              }
            }}
            size="icon"
            variant="ghost"
          >
            {tool.icon}
          </ActionButton>
        );
      })}
    </div>
  );
}
