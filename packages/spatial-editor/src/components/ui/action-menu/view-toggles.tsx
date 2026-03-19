"use client";

import { useViewer } from "@openbeam/spatial-viewer";
import { Icons } from "@openbeam/ui";
import { cn } from "../../../lib/utils";
import { ActionButton } from "./action-button";

const levelModeLabels: Record<"stacked" | "exploded" | "solo", string> = {
  stacked: "Stacked",
  exploded: "Exploded",
  solo: "Solo",
};

const levelModeOrder: ("stacked" | "exploded" | "solo")[] = [
  "stacked",
  "exploded",
  "solo",
];

type WallMode = "up" | "cutaway" | "down";

const wallModeIcons: Record<
  WallMode,
  { icon: React.ReactNode; label: string }
> = {
  up: {
    icon: <Icons.Home size={20} />,
    label: "Full Height",
  },
  cutaway: {
    icon: <Icons.Scissors size={20} />,
    label: "Cutaway",
  },
  down: {
    icon: <Icons.Minus size={20} />,
    label: "Low",
  },
};

const wallModeOrder: WallMode[] = ["cutaway", "up", "down"];

export function ViewToggles() {
  const cameraMode = useViewer((state) => state.cameraMode);
  const setCameraMode = useViewer((state) => state.setCameraMode);
  const levelMode = useViewer((state) => state.levelMode);
  const setLevelMode = useViewer((state) => state.setLevelMode);
  const wallMode = useViewer((state) => state.wallMode);
  const setWallMode = useViewer((state) => state.setWallMode);
  const showScans = useViewer((state) => state.showScans);
  const setShowScans = useViewer((state) => state.setShowScans);
  const showGuides = useViewer((state) => state.showGuides);
  const setShowGuides = useViewer((state) => state.setShowGuides);

  const toggleCameraMode = () => {
    setCameraMode(
      cameraMode === "perspective" ? "orthographic" : "perspective"
    );
  };

  const cycleLevelMode = () => {
    if (levelMode === "manual") {
      setLevelMode("stacked");
      return;
    }
    const currentIndex = levelModeOrder.indexOf(
      levelMode as "stacked" | "exploded" | "solo"
    );
    const nextIndex = (currentIndex + 1) % levelModeOrder.length;
    const nextMode = levelModeOrder[nextIndex];
    if (nextMode) {
      setLevelMode(nextMode);
    }
  };

  const cycleWallMode = () => {
    const currentIndex = wallModeOrder.indexOf(wallMode);
    const nextIndex = (currentIndex + 1) % wallModeOrder.length;
    const nextMode = wallModeOrder[nextIndex];
    if (nextMode) {
      setWallMode(nextMode);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <ActionButton
        className={cn(
          cameraMode === "orthographic"
            ? "bg-violet-500/20 text-violet-400"
            : "text-[#76766e] opacity-60 hover:text-violet-400 hover:opacity-100"
        )}
        label={`Camera: ${cameraMode === "perspective" ? "Perspective" : "Orthographic"}`}
        onClick={toggleCameraMode}
        size="icon"
        variant="ghost"
      >
        <Icons.Eye size={20} />
      </ActionButton>

      <ActionButton
        className={cn(
          levelMode !== "stacked"
            ? "bg-amber-500/20 text-amber-400"
            : "text-[#76766e] opacity-60 hover:text-amber-400 hover:opacity-100"
        )}
        label={`Levels: ${levelMode === "manual" ? "Manual" : levelModeLabels[levelMode as keyof typeof levelModeLabels]}`}
        onClick={cycleLevelMode}
        size="icon"
        variant="ghost"
      >
        {levelMode === "solo" && <Icons.CircleDot size={20} />}
        {levelMode === "exploded" && <Icons.Layers size={20} />}
        {(levelMode === "stacked" || levelMode === "manual") && (
          <Icons.Layers size={20} />
        )}
      </ActionButton>

      <ActionButton
        className={cn(
          wallMode !== "cutaway"
            ? "bg-[#353530] text-[#e0e0d8]"
            : "text-[#76766e] opacity-60 hover:bg-[rgba(255,255,255,0.05)] hover:opacity-100"
        )}
        label={`Walls: ${wallModeIcons[wallMode].label}`}
        onClick={cycleWallMode}
        size="icon"
        variant="ghost"
      >
        {wallModeIcons[wallMode].icon}
      </ActionButton>

      <ActionButton
        className={cn(
          showScans
            ? "bg-[#353530] text-[#e0e0d8]"
            : "text-[#76766e] opacity-60 hover:bg-[rgba(255,255,255,0.05)] hover:opacity-100"
        )}
        label={`Scans: ${showScans ? "Visible" : "Hidden"}`}
        onClick={() => setShowScans(!showScans)}
        size="icon"
        variant="ghost"
      >
        <Icons.Grid3x3 size={20} />
      </ActionButton>

      <ActionButton
        className={cn(
          showGuides
            ? "bg-[#353530] text-[#e0e0d8]"
            : "text-[#76766e] opacity-60 hover:bg-[rgba(255,255,255,0.05)] hover:opacity-100"
        )}
        label={`Guides: ${showGuides ? "Visible" : "Hidden"}`}
        onClick={() => setShowGuides(!showGuides)}
        size="icon"
        variant="ghost"
      >
        <Icons.LayoutGrid size={20} />
      </ActionButton>
    </div>
  );
}
