"use client";

import { emitter, type GridEvent, sceneRegistry } from "@openbeam/spatial-core";
import { useViewer } from "@openbeam/spatial-viewer";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { MathUtils, type Mesh, Vector2 } from "three";
import {
  color,
  float,
  fract,
  fwidth,
  mix,
  positionLocal,
  uniform,
} from "three/tsl";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { useGridEvents } from "../../hooks/use-grid-events";
import { EDITOR_LAYER } from "../../lib/constants";

export const Grid = ({
  cellSize = 0.5,
  cellThickness = 0.5,
  cellColor = "#888888",
  sectionSize = 1,
  sectionThickness = 1,
  sectionColor = "#000000",
  fadeDistance = 100,
  fadeStrength = 1,
  revealRadius = 10,
}: {
  cellSize?: number;
  cellThickness?: number;
  cellColor?: string;
  sectionSize?: number;
  sectionThickness?: number;
  sectionColor?: string;
  fadeDistance?: number;
  fadeStrength?: number;
  revealRadius?: number;
}) => {
  const theme = useViewer((state) => state.theme);

  const effectiveCellColor = theme === "dark" ? "#555566" : cellColor;
  const effectiveSectionColor = theme === "dark" ? "#666677" : sectionColor;

  const cursorPositionRef = useRef(new Vector2(0, 0));

  const material = useMemo(() => {
    const pos = positionLocal.xy;

    const cursorPos = uniform(cursorPositionRef.current);

    const getGrid = (size: number, thickness: number) => {
      const r = pos.div(size);
      const fw = fwidth(r);
      const grid = fract(r.sub(0.5)).sub(0.5).abs();
      const lineX = float(1).sub(
        grid.x
          .div(fw.x)
          .add(1 - thickness)
          .min(1)
      );
      const lineY = float(1).sub(
        grid.y
          .div(fw.y)
          .add(1 - thickness)
          .min(1)
      );
      return lineX.max(lineY);
    };

    const g1 = getGrid(cellSize, cellThickness);
    const g2 = getGrid(sectionSize, sectionThickness);

    const dist = pos.length();
    const fade = float(1).sub(dist.div(fadeDistance).min(1)).pow(fadeStrength);

    const cursorDist = pos.sub(cursorPos).length();
    const cursorFade = float(1)
      .sub(cursorDist.div(revealRadius).clamp(0, 1))
      .smoothstep(0, 1);

    const gridColor = mix(
      color(effectiveCellColor),
      color(effectiveSectionColor),
      float(sectionThickness).mul(g2).min(1)
    );

    const baseAlpha = float(0.4); // Subtle global visibility

    const alpha = g1.add(g2).mul(fade).mul(cursorFade.max(baseAlpha));
    const finalAlpha = mix(alpha.mul(0.75), alpha, g2);

    return new MeshBasicNodeMaterial({
      transparent: true,
      colorNode: gridColor,
      opacityNode: finalAlpha,
      depthWrite: false,
    });
  }, [
    cellSize,
    cellThickness,
    effectiveCellColor,
    sectionSize,
    sectionThickness,
    effectiveSectionColor,
    fadeDistance,
    fadeStrength,
    revealRadius,
  ]);

  // biome-ignore lint/style/noNonNullAssertion: geometry access
  const gridRef = useRef<Mesh>(null!);
  const [gridY, setGridY] = useState(0);

  useGridEvents(gridY);

  useEffect(() => {
    const onGridMove = (event: GridEvent) => {
      cursorPositionRef.current.set(event.position[0], -event.position[2]);
    };

    emitter.on("grid:move", onGridMove);
    return () => {
      emitter.off("grid:move", onGridMove);
    };
  }, []);

  useFrame((_, delta) => {
    const currentLevelId = useViewer.getState().selection.levelId;
    let targetY = 0;
    if (currentLevelId) {
      const levelMesh = sceneRegistry.nodes.get(currentLevelId);
      if (levelMesh) {
        targetY = levelMesh.position.y;
      }
    }
    const newY = MathUtils.lerp(
      gridRef.current.position.y,
      targetY,
      12 * delta
    );
    gridRef.current.position.y = newY;
    setGridY(newY);
  });

  const showGrid = useViewer((state) => state.showGrid);

  return (
    <mesh
      layers={EDITOR_LAYER}
      material={material}
      ref={gridRef}
      rotation-x={-Math.PI / 2}
      visible={showGrid}
    >
      <planeGeometry args={[fadeDistance * 2, fadeDistance * 2]} />
    </mesh>
  );
};
