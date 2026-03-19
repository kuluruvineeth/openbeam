"use client";

import NextImage from "next/image";

import { cn } from "../../../lib/utils";
import useEditor, {
  type CatalogCategory,
  type StructureTool,
} from "../../../store/use-editor";
import { ActionButton } from "./action-button";

export type ToolConfig = {
  id: StructureTool;
  iconSrc: string;
  label: string;
  catalogCategory?: CatalogCategory;
};

export const tools: ToolConfig[] = [
  { id: "wall", iconSrc: "/icons/wall.png", label: "Wall" },
  { id: "slab", iconSrc: "/icons/floor.png", label: "Slab" },
  { id: "ceiling", iconSrc: "/icons/ceiling.png", label: "Ceiling" },
  { id: "roof", iconSrc: "/icons/roof.png", label: "Gable Roof" },
  { id: "door", iconSrc: "/icons/door.png", label: "Door" },
  { id: "window", iconSrc: "/icons/window.png", label: "Window" },
  { id: "zone", iconSrc: "/icons/zone.png", label: "Zone" },
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
                ? "z-10 scale-110 bg-black/40 hover:bg-black/40"
                : "scale-95 bg-transparent opacity-60 grayscale hover:bg-black/20 hover:opacity-100 hover:grayscale-0"
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
            <NextImage
              alt={tool.label}
              className="size-full object-contain"
              height={28}
              src={tool.iconSrc}
              width={28}
            />
          </ActionButton>
        );
      })}
    </div>
  );
}
