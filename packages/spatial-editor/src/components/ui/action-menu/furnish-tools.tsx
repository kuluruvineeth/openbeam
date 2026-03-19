"use client";

import { Icons } from "@openbeam/ui";
import type { ReactNode } from "react";
import { cn } from "./../../../lib/utils";
import useEditor, { type CatalogCategory } from "./../../../store/use-editor";
import { ActionButton } from "./action-button";

export type FurnishToolConfig = {
  id: "item";
  icon: ReactNode;
  label: string;
  catalogCategory: CatalogCategory;
};

export const furnishTools: FurnishToolConfig[] = [
  {
    id: "item",
    icon: <Icons.Package size={24} />,
    label: "Furniture",
    catalogCategory: "furniture",
  },
  {
    id: "item",
    icon: <Icons.Zap size={24} />,
    label: "Appliance",
    catalogCategory: "appliance",
  },
  {
    id: "item",
    icon: <Icons.Wrench size={24} />,
    label: "Kitchen",
    catalogCategory: "kitchen",
  },
  {
    id: "item",
    icon: <Icons.Layers size={24} />,
    label: "Bathroom",
    catalogCategory: "bathroom",
  },
  {
    id: "item",
    icon: <Icons.MapPin size={24} />,
    label: "Outdoor",
    catalogCategory: "outdoor",
  },
];

export function FurnishTools() {
  const mode = useEditor((state) => state.mode);
  const activeTool = useEditor((state) => state.tool);
  const setActiveTool = useEditor((state) => state.setTool);
  const setMode = useEditor((state) => state.setMode);
  const catalogCategory = useEditor((state) => state.catalogCategory);
  const setCatalogCategory = useEditor((state) => state.setCatalogCategory);

  return (
    <div className="flex items-center gap-1.5 px-1">
      {furnishTools.map((tool, index) => {
        const isActive =
          mode === "build" &&
          activeTool === "item" &&
          catalogCategory === tool.catalogCategory;

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
                setCatalogCategory(tool.catalogCategory);
                setActiveTool("item");
                if (mode !== "build") {
                  setMode("build");
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
