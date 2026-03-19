"use client";

import { emitter } from "@openbeam/spatial-core";
import { Icons } from "@openbeam/ui";
import { ActionButton } from "./action-button";

export function CameraActions() {
  const goToTopView = () => {
    emitter.emit("camera-controls:top-view");
  };

  const orbitCW = () => {
    emitter.emit("camera-controls:orbit-cw");
  };

  const orbitCCW = () => {
    emitter.emit("camera-controls:orbit-ccw");
  };

  return (
    <div className="flex items-center gap-1">
      <ActionButton
        className="group text-[#76766e] opacity-70 hover:bg-[rgba(255,255,255,0.05)] hover:opacity-100"
        label="Orbit Left"
        onClick={orbitCCW}
        size="icon"
        variant="ghost"
      >
        <Icons.Undo size={20} />
      </ActionButton>

      <ActionButton
        className="group text-[#76766e] opacity-70 hover:bg-[rgba(255,255,255,0.05)] hover:opacity-100"
        label="Orbit Right"
        onClick={orbitCW}
        size="icon"
        variant="ghost"
      >
        <Icons.Redo size={20} />
      </ActionButton>

      <ActionButton
        className="group text-[#76766e] opacity-70 hover:bg-[rgba(255,255,255,0.05)] hover:opacity-100"
        label="Top View"
        onClick={goToTopView}
        size="icon"
        variant="ghost"
      >
        <Icons.Crosshair size={20} />
      </ActionButton>
    </div>
  );
}
