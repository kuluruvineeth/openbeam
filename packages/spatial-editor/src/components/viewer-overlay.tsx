"use client";

import {
  type AnyNode,
  type AnyNodeId,
  type BuildingNode,
  emitter,
  type LevelNode,
  useScene,
  type ZoneNode,
} from "@openbeam/spatial-core";
import { useViewer } from "@openbeam/spatial-viewer";
import { Icons, TooltipProvider } from "@openbeam/ui";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { ActionButton } from "./ui/action-menu/action-button";

type ProjectOwner = {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
};

const levelModeLabels: Record<"stacked" | "exploded" | "solo", string> = {
  stacked: "Stacked",
  exploded: "Exploded",
  solo: "Solo",
};

const wallModeConfig = {
  up: {
    icon: () => <Icons.Home size={20} />,
    label: "Full Height",
  },
  cutaway: {
    icon: () => <Icons.Scissors size={20} />,
    label: "Cutaway",
  },
  down: {
    icon: () => <Icons.Minus size={20} />,
    label: "Low",
  },
};

const getNodeName = (node: AnyNode): string => {
  if ("name" in node && node.name) {
    return node.name;
  }
  if (node.type === "wall") {
    return "Wall";
  }
  if (node.type === "item") {
    return (node as { asset: { name: string } }).asset?.name || "Item";
  }
  if (node.type === "slab") {
    return "Slab";
  }
  if (node.type === "ceiling") {
    return "Ceiling";
  }
  if (node.type === "roof") {
    return "Roof";
  }
  return node.type;
};

interface ViewerOverlayProps {
  projectName?: string | null;
  owner?: ProjectOwner | null;
  canShowScans?: boolean;
  canShowGuides?: boolean;
  onBack?: () => void;
}

export const ViewerOverlay = ({
  projectName,
  owner,
  canShowScans = true,
  canShowGuides = true,
  onBack,
}: ViewerOverlayProps) => {
  const selection = useViewer((s) => s.selection);
  const nodes = useScene((s) => s.nodes);
  const showScans = useViewer((s) => s.showScans);
  const showGuides = useViewer((s) => s.showGuides);
  const cameraMode = useViewer((s) => s.cameraMode);
  const levelMode = useViewer((s) => s.levelMode);
  const wallMode = useViewer((s) => s.wallMode);
  const theme = useViewer((s) => s.theme);

  const building = selection.buildingId
    ? (nodes[selection.buildingId] as BuildingNode | undefined)
    : null;
  const level = selection.levelId
    ? (nodes[selection.levelId] as LevelNode | undefined)
    : null;
  const zone = selection.zoneId
    ? (nodes[selection.zoneId] as ZoneNode | undefined)
    : null;

  const selectedNode =
    selection.selectedIds.length > 0
      ? (nodes[selection.selectedIds[0] as AnyNodeId] as AnyNode | undefined)
      : null;

  const levels =
    building?.children
      .map((id) => nodes[id as AnyNodeId] as LevelNode | undefined)
      .filter((n): n is LevelNode => n?.type === "level")
      .sort((a, b) => a.level - b.level) ?? [];

  const handleLevelClick = (levelId: LevelNode["id"]) => {
    useViewer.getState().setSelection({ levelId });
  };

  const handleBreadcrumbClick = (
    depth: "root" | "building" | "level" | "zone"
  ) => {
    // biome-ignore lint/style/useDefaultSwitchClause: acceptable
    switch (depth) {
      case "root":
        useViewer.getState().resetSelection();
        break;
      case "building":
        useViewer.getState().setSelection({ levelId: null });
        break;
      case "level":
        useViewer.getState().setSelection({ zoneId: null });
        break;
    }
  };

  return (
    <>
      {/* Unified top-left card */}
      <div className="dark absolute top-4 left-4 z-20 flex flex-col gap-3 text-[#ccc9c0]">
        <div className="pointer-events-auto flex min-w-[200px] flex-col overflow-hidden rounded-[20px] border border-[#3b3b36] bg-[#242422] shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-colors duration-200 ease-out">
          {/* Project info + back */}
          <div className="flex items-center gap-3 px-3 py-2.5">
            {onBack ? (
              <button
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-[rgba(255,255,255,0.05)]"
                onClick={onBack}
                type="button"
              >
                <Icons.ArrowLeft className="text-[#76766e]" size={16} />
              </button>
            ) : (
              <a
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-[rgba(255,255,255,0.05)]"
                href="/"
              >
                <Icons.ArrowLeft className="text-[#76766e]" size={16} />
              </a>
            )}
            <div className="min-w-0">
              <div className="truncate font-medium text-[#ccc9c0] text-sm">
                {projectName || "Untitled"}
              </div>
              {owner?.username && (
                <a
                  className="text-[#76766e] text-xs transition-colors hover:text-[#ccc9c0]"
                  href={`/u/${owner.username}`}
                >
                  @{owner.username}
                </a>
              )}
            </div>
          </div>

          {/* Breadcrumb — only shown when navigated into a building */}
          {building && (
            <div className="border-[#3b3b36] border-t px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  className="text-[#76766e] transition-colors hover:text-[#ccc9c0]"
                  onClick={() => handleBreadcrumbClick("root")}
                  type="button"
                >
                  Site
                </button>

                {building && (
                  <>
                    <Icons.ChevronRight
                      className="text-[#76766e]/50"
                      size={12}
                    />
                    <button
                      className={`truncate transition-colors ${level ? "text-[#76766e] hover:text-[#ccc9c0]" : "font-medium text-[#ccc9c0]"}`}
                      onClick={() => handleBreadcrumbClick("building")}
                      type="button"
                    >
                      {building.name || "Building"}
                    </button>
                  </>
                )}

                {level && (
                  <>
                    <Icons.ChevronRight
                      className="text-[#76766e]/50"
                      size={12}
                    />
                    <button
                      className={`truncate transition-colors ${zone ? "text-[#76766e] hover:text-[#ccc9c0]" : "font-medium text-[#ccc9c0]"}`}
                      onClick={() => handleBreadcrumbClick("level")}
                      type="button"
                    >
                      {level.name || `Level ${level.level}`}
                    </button>
                  </>
                )}

                {zone && (
                  <>
                    <Icons.ChevronRight
                      className="text-[#76766e]/50"
                      size={12}
                    />
                    <span
                      className={`truncate transition-colors ${selectedNode ? "text-[#76766e]" : "font-medium text-[#ccc9c0]"}`}
                    >
                      {zone.name}
                    </span>
                  </>
                )}

                {selectedNode && zone && (
                  <>
                    <Icons.ChevronRight
                      className="text-[#76766e]/50"
                      size={12}
                    />
                    <span className="truncate font-medium text-[#ccc9c0]">
                      {getNodeName(selectedNode)}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Level List (only when building is selected) */}
        {building && levels.length > 0 && (
          <div className="pointer-events-auto flex w-48 flex-col overflow-hidden rounded-[20px] border border-[#3b3b36] bg-[#242422] py-1 shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-colors duration-200 ease-out">
            <span className="px-3 py-2 font-medium text-[#76766e] text-[10px] uppercase tracking-wider">
              Levels
            </span>
            <div className="flex flex-col">
              {levels.map((lvl) => {
                const isSelected = lvl.id === selection.levelId;
                return (
                  <button
                    className={cn(
                      "group/row relative flex h-8 w-full cursor-pointer select-none items-center border-[#3b3b36] border-r border-r-transparent border-b px-3 text-sm transition-all duration-200",
                      isSelected
                        ? "border-r-3 border-r-[#ccc9c0] bg-[#353530] text-[#ccc9c0]"
                        : "text-[#76766e] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#ccc9c0]"
                    )}
                    key={lvl.id}
                    onClick={() => handleLevelClick(lvl.id)}
                    type="button"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center transition-all duration-200",
                          !isSelected && "opacity-60 grayscale"
                        )}
                      >
                        <Icons.Layers size={14} />
                      </span>
                      <div className="min-w-0 flex-1 truncate text-left">
                        {lvl.name || `Level ${lvl.level}`}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Controls Panel - Bottom Center */}
      <div className="dark -translate-x-1/2 absolute bottom-6 left-1/2 z-20 text-[#ccc9c0]">
        <TooltipProvider delayDuration={0}>
          <div className="pointer-events-auto flex flex-row items-center justify-center gap-1.5 rounded-[20px] border border-[#3b3b36] bg-[#242422] px-3 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-colors duration-200 ease-out">
            {/* Theme Toggle */}
            <button
              aria-label="Toggle theme"
              className="flex h-[36px] shrink-0 cursor-pointer items-center rounded-full border border-[#3b3b36] bg-[#353530] p-1"
              onClick={() =>
                useViewer
                  .getState()
                  .setTheme(theme === "dark" ? "light" : "dark")
              }
              type="button"
            >
              <div className="relative flex">
                {/* Sliding Background */}
                <motion.div
                  animate={{
                    x: theme === "light" ? "100%" : "0%",
                  }}
                  className="absolute inset-0 rounded-full bg-white shadow-sm dark:bg-white/20"
                  initial={false}
                  style={{ width: "50%" }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 35,
                  }}
                />

                {/* Dark Mode Icon */}
                <div
                  className={cn(
                    "pointer-events-none relative z-10 flex h-7 w-9 items-center justify-center rounded-full transition-colors duration-200",
                    theme === "dark" ? "text-[#ccc9c0]" : "text-[#76766e]"
                  )}
                >
                  <Icons.Moon className="h-4 w-4" />
                </div>

                {/* Light Mode Icon */}
                <div
                  className={cn(
                    "pointer-events-none relative z-10 flex h-7 w-9 items-center justify-center rounded-full transition-colors duration-200",
                    theme === "light" ? "text-[#ccc9c0]" : "text-[#76766e]"
                  )}
                >
                  <Icons.Sun className="h-4 w-4" />
                </div>
              </div>
            </button>

            <div className="mx-1 h-5 w-px bg-[#3b3b36]" />

            {/* Scans and Guides Visibility */}
            {canShowScans && (
              <ActionButton
                className={
                  showScans
                    ? "bg-white/10"
                    : "opacity-60 grayscale hover:bg-white/5 hover:opacity-100 hover:grayscale-0"
                }
                label={`Scans: ${showScans ? "Visible" : "Hidden"}`}
                onClick={() => useViewer.getState().setShowScans(!showScans)}
                size="icon"
                tooltipSide="top"
                variant="ghost"
              >
                <Icons.Grid3x3 size={20} />
              </ActionButton>
            )}

            {canShowGuides && (
              <ActionButton
                className={
                  showGuides
                    ? "bg-white/10"
                    : "opacity-60 grayscale hover:bg-white/5 hover:opacity-100 hover:grayscale-0"
                }
                label={`Guides: ${showGuides ? "Visible" : "Hidden"}`}
                onClick={() => useViewer.getState().setShowGuides(!showGuides)}
                size="icon"
                tooltipSide="top"
                variant="ghost"
              >
                <Icons.LayoutGrid size={20} />
              </ActionButton>
            )}

            {(canShowScans || canShowGuides) && (
              <div className="mx-1 h-5 w-px bg-[#3b3b36]" />
            )}

            {/* Camera Mode */}
            <ActionButton
              className={
                cameraMode === "orthographic"
                  ? "bg-violet-500/20 text-violet-400"
                  : "hover:bg-white/5 hover:text-violet-400"
              }
              label={`Camera: ${cameraMode === "perspective" ? "Perspective" : "Orthographic"}`}
              onClick={() =>
                useViewer
                  .getState()
                  .setCameraMode(
                    cameraMode === "perspective"
                      ? "orthographic"
                      : "perspective"
                  )
              }
              size="icon"
              tooltipSide="top"
              variant="ghost"
            >
              <Icons.Eye size={24} />
            </ActionButton>

            {/* Level Mode */}
            <ActionButton
              className={
                levelMode !== "stacked"
                  ? "bg-amber-500/20 text-amber-400"
                  : "hover:bg-white/5 hover:text-amber-400"
              }
              label={`Levels: ${levelMode === "manual" ? "Manual" : levelModeLabels[levelMode as keyof typeof levelModeLabels]}`}
              onClick={() => {
                if (levelMode === "manual") {
                  return useViewer.getState().setLevelMode("stacked");
                }
                const modes: ("stacked" | "exploded" | "solo")[] = [
                  "stacked",
                  "exploded",
                  "solo",
                ];
                const nextIndex =
                  // biome-ignore lint/suspicious/noExplicitAny: type cast
                  (modes.indexOf(levelMode as any) + 1) % modes.length;
                useViewer
                  .getState()
                  .setLevelMode(modes[nextIndex] ?? "stacked");
              }}
              size="icon"
              tooltipSide="top"
              variant="ghost"
            >
              {levelMode === "solo" && <Icons.Square size={24} />}
              {levelMode === "exploded" && <Icons.Layers size={24} />}
              {(levelMode === "stacked" || levelMode === "manual") && (
                <Icons.Layers size={24} />
              )}
            </ActionButton>

            {/* Wall Mode */}
            <ActionButton
              className={
                wallMode !== "cutaway"
                  ? "bg-white/10"
                  : "opacity-60 grayscale hover:bg-white/5 hover:opacity-100 hover:grayscale-0"
              }
              label={`Walls: ${wallModeConfig[wallMode as keyof typeof wallModeConfig].label}`}
              onClick={() => {
                const modes: ("cutaway" | "up" | "down")[] = [
                  "cutaway",
                  "up",
                  "down",
                ];
                const nextIndex =
                  // biome-ignore lint/suspicious/noExplicitAny: type cast
                  (modes.indexOf(wallMode as any) + 1) % modes.length;
                useViewer.getState().setWallMode(modes[nextIndex] ?? "cutaway");
              }}
              size="icon"
              tooltipSide="top"
              variant="ghost"
            >
              {wallModeConfig[wallMode as keyof typeof wallModeConfig].icon()}
            </ActionButton>

            <div className="mx-1 h-5 w-px bg-[#3b3b36]" />

            {/* Camera Actions */}
            <ActionButton
              className="group hidden hover:bg-white/5 sm:inline-flex"
              label="Orbit Left"
              onClick={() => emitter.emit("camera-controls:orbit-ccw")}
              size="icon"
              tooltipSide="top"
              variant="ghost"
            >
              <Icons.Undo
                className="opacity-70 transition-opacity group-hover:opacity-100"
                size={20}
              />
            </ActionButton>

            <ActionButton
              className="group hidden hover:bg-white/5 sm:inline-flex"
              label="Orbit Right"
              onClick={() => emitter.emit("camera-controls:orbit-cw")}
              size="icon"
              tooltipSide="top"
              variant="ghost"
            >
              <Icons.Redo
                className="opacity-70 transition-opacity group-hover:opacity-100"
                size={20}
              />
            </ActionButton>

            <ActionButton
              className="group hover:bg-white/5"
              label="Top View"
              onClick={() => emitter.emit("camera-controls:top-view")}
              size="icon"
              tooltipSide="top"
              variant="ghost"
            >
              <Icons.Eye
                className="opacity-70 transition-opacity group-hover:opacity-100"
                size={20}
              />
            </ActionButton>
          </div>
        </TooltipProvider>
      </div>
    </>
  );
};
