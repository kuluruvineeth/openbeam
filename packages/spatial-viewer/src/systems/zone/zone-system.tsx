import { sceneRegistry, useScene } from "@openbeam/spatial-core";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { type Group, MathUtils, type Mesh } from "three";
import type { MeshBasicNodeMaterial } from "three/webgpu";
import useViewer from "../../store/use-viewer";

const TRANSITION_DURATION = 400;
const EXIT_DEBOUNCE_MS = 50;

export const ZoneSystem = () => {
  const lastHighlightedZoneRef = useRef<string | null>(null);
  const lastChangeTimeRef = useRef(0);
  const isTransitioningRef = useRef(false);
  const pendingZoneRef = useRef<string | null>(null);
  const pendingZoneSinceRef = useRef(0);

  useFrame(({ clock }, delta) => {
    const hoveredId = useViewer.getState().hoveredId;
    let rawZone: string | null = null;

    if (hoveredId) {
      const hoveredNode = useScene.getState().nodes[hoveredId];
      if (hoveredNode?.type === "zone") {
        rawZone = hoveredId;
      }
    }

    if (rawZone !== pendingZoneRef.current) {
      pendingZoneRef.current = rawZone;
      pendingZoneSinceRef.current = clock.elapsedTime * 1000;
    }

    const age = clock.elapsedTime * 1000 - pendingZoneSinceRef.current;
    let highlightedZone: string | null;
    if (rawZone !== null) {
      highlightedZone = rawZone;
    } else if (age >= EXIT_DEBOUNCE_MS) {
      highlightedZone = null;
    } else {
      highlightedZone = lastHighlightedZoneRef.current;
    }

    if (highlightedZone !== lastHighlightedZoneRef.current) {
      if (lastHighlightedZoneRef.current) {
        const prevLabel = document.getElementById(
          `${lastHighlightedZoneRef.current}-label`
        );
        const pin = prevLabel?.querySelector(
          ".label-pin"
        ) as HTMLElement | null;
        if (pin) {
          pin.style.opacity = "0";
        }
      }
      if (highlightedZone) {
        const label = document.getElementById(`${highlightedZone}-label`);
        const pin = label?.querySelector(".label-pin") as HTMLElement | null;
        if (pin) {
          pin.style.opacity = "1";
        }
      }

      lastHighlightedZoneRef.current = highlightedZone;
      lastChangeTimeRef.current = clock.elapsedTime * 1000;
      isTransitioningRef.current = true;
    }

    if (!isTransitioningRef.current) {
      return;
    }

    const elapsed = clock.elapsedTime * 1000 - lastChangeTimeRef.current;

    if (elapsed >= TRANSITION_DURATION) {
      isTransitioningRef.current = false;
    }

    const lerpSpeed = 10 * delta;

    for (const zoneId of sceneRegistry.byType.zone) {
      const zone = sceneRegistry.nodes.get(zoneId);
      if (!zone) {
        continue;
      }

      const isHighlighted = zoneId === highlightedZone;
      const targetOpacity = isHighlighted ? 1 : 0;

      const walls = (zone as Group).getObjectByName("walls") as
        | Mesh
        | undefined;
      if (walls) {
        const material = walls.material as MeshBasicNodeMaterial;
        const currentOpacity = material.userData.uOpacity.value;
        material.userData.uOpacity.value = MathUtils.lerp(
          currentOpacity,
          targetOpacity,
          lerpSpeed
        );
      }

      const floor = (zone as Group).getObjectByName("floor") as
        | Mesh
        | undefined;
      if (floor) {
        const material = floor.material as MeshBasicNodeMaterial;
        const currentOpacity = material.userData.uOpacity.value;
        material.userData.uOpacity.value = MathUtils.lerp(
          currentOpacity,
          targetOpacity,
          lerpSpeed
        );
      }
    }
  });

  return null;
};
