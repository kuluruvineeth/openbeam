import {
  type AnyNode,
  emitter,
  type GridEvent,
  type LevelNode,
  RoofNode,
  useScene,
} from "@openbeam/spatial-core";
import { useViewer } from "@openbeam/spatial-viewer";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BufferGeometry,
  DoubleSide,
  type Group,
  type Line,
  Vector3,
} from "three";
import { EDITOR_LAYER } from "../../../lib/constants";
import { sfxEmitter } from "../../../lib/sfx-bus";
import { CursorSphere } from "../shared/cursor-sphere";

const DEFAULT_HEIGHT = 1.5;
const GRID_OFFSET = 0.02;

const commitRoofPlacement = (
  levelId: LevelNode["id"],
  corner1: [number, number, number],
  corner2: [number, number, number]
): RoofNode["id"] => {
  const { createNode, nodes } = useScene.getState();

  const centerX = (corner1[0] + corner2[0]) / 2;
  const centerZ = (corner1[2] + corner2[2]) / 2;

  const length = Math.abs(corner2[0] - corner1[0]);
  const width = Math.abs(corner2[2] - corner1[2]);

  const slopeWidth = Math.max(width / 2, 0.5);

  const roofCount = Object.values(nodes).filter(
    (n) => n.type === "roof"
  ).length;
  const name = `Roof ${roofCount + 1}`;

  const roof = RoofNode.parse({
    name,
    position: [centerX, 0, centerZ],
    length: Math.max(length, 0.5),
    height: DEFAULT_HEIGHT,
    leftWidth: slopeWidth,
    rightWidth: slopeWidth,
  });

  createNode(roof, levelId);
  sfxEmitter.emit("sfx:structure-build");
  return roof.id;
};

type PreviewState = {
  corner1: [number, number, number] | null;
  cursorPosition: [number, number, number];
  levelY: number;
};

export const RoofTool: React.FC = () => {
  const cursorRef = useRef<Group>(null);
  // biome-ignore lint/style/noNonNullAssertion: geometry access
  const outlineRef = useRef<Line>(null!);
  const currentLevelId = useViewer((state) => state.selection.levelId);
  const setSelection = useViewer((state) => state.setSelection);

  const corner1Ref = useRef<[number, number, number] | null>(null);
  const previousGridPosRef = useRef<[number, number] | null>(null);
  const [preview, setPreview] = useState<PreviewState>({
    corner1: null,
    cursorPosition: [0, 0, 0],
    levelY: 0,
  });

  useEffect(() => {
    if (!currentLevelId) {
      return;
    }

    outlineRef.current.geometry = new BufferGeometry();

    const updateOutline = (
      // biome-ignore lint/nursery/noShadow: acceptable
      corner1: [number, number, number],
      corner2: [number, number, number]
    ) => {
      const gridY = corner1[1] + GRID_OFFSET;

      const groundPoints = [
        new Vector3(corner1[0], gridY, corner1[2]),
        new Vector3(corner2[0], gridY, corner1[2]),
        new Vector3(corner2[0], gridY, corner2[2]),
        new Vector3(corner1[0], gridY, corner2[2]),
        new Vector3(corner1[0], gridY, corner1[2]),
      ];

      outlineRef.current.geometry.dispose();
      outlineRef.current.geometry = new BufferGeometry().setFromPoints(
        groundPoints
      );
      outlineRef.current.visible = true;
    };

    const onGridMove = (event: GridEvent) => {
      if (!cursorRef.current) {
        return;
      }

      const gridX = Math.round(event.position[0] * 2) / 2;
      const gridZ = Math.round(event.position[2] * 2) / 2;
      const y = event.position[1];

      // biome-ignore lint/nursery/noShadow: acceptable
      const cursorPosition: [number, number, number] = [gridX, y, gridZ];

      const gridY = y + GRID_OFFSET;

      cursorRef.current.position.set(gridX, gridY, gridZ);

      if (
        corner1Ref.current &&
        previousGridPosRef.current &&
        (gridX !== previousGridPosRef.current[0] ||
          gridZ !== previousGridPosRef.current[1])
      ) {
        sfxEmitter.emit("sfx:grid-snap");
      }

      previousGridPosRef.current = [gridX, gridZ];

      setPreview({
        corner1: corner1Ref.current,
        cursorPosition,
        levelY: y,
      });

      if (corner1Ref.current) {
        updateOutline(corner1Ref.current, cursorPosition);
      }
    };

    const onGridClick = (event: GridEvent) => {
      if (!currentLevelId) {
        return;
      }

      const gridX = Math.round(event.position[0] * 2) / 2;
      const gridZ = Math.round(event.position[2] * 2) / 2;
      const y = event.position[1];

      if (corner1Ref.current) {
        const roofId = commitRoofPlacement(currentLevelId, corner1Ref.current, [
          gridX,
          y,
          gridZ,
        ]);

        setSelection({ selectedIds: [roofId as AnyNode["id"]] });

        corner1Ref.current = null;
        outlineRef.current.visible = false;
      } else {
        corner1Ref.current = [gridX, y, gridZ];
        setPreview((prev) => ({
          ...prev,
          corner1: corner1Ref.current,
        }));
      }
    };

    const onCancel = () => {
      if (corner1Ref.current) {
        corner1Ref.current = null;
        outlineRef.current.visible = false;
        setPreview((prev) => ({ ...prev, corner1: null }));
      }
    };

    emitter.on("grid:move", onGridMove);
    emitter.on("grid:click", onGridClick);
    emitter.on("tool:cancel", onCancel);

    return () => {
      emitter.off("grid:move", onGridMove);
      emitter.off("grid:click", onGridClick);
      emitter.off("tool:cancel", onCancel);

      corner1Ref.current = null;
    };
  }, [currentLevelId, setSelection]);

  const { corner1, cursorPosition, levelY } = preview;

  const previewDimensions = useMemo(() => {
    if (!corner1) {
      return null;
    }
    const length = Math.abs(cursorPosition[0] - corner1[0]);
    const width = Math.abs(cursorPosition[2] - corner1[2]);
    const centerX = (corner1[0] + cursorPosition[0]) / 2;
    const centerZ = (corner1[2] + cursorPosition[2]) / 2;
    return { length, width, centerX, centerZ };
  }, [corner1, cursorPosition]);

  return (
    <group>
      <CursorSphere ref={cursorRef} />

      <threeLine
        frustumCulled={false}
        layers={EDITOR_LAYER}
        ref={outlineRef}
        renderOrder={1}
        visible={false}
      >
        <bufferGeometry />
        <lineBasicNodeMaterial
          color="#818cf8"
          depthTest={false}
          depthWrite={false}
          linewidth={2}
          opacity={0.3}
          transparent
        />
      </threeLine>

      {corner1 && (
        <CursorSphere
          color="#818cf8"
          position={[corner1[0], levelY + GRID_OFFSET, corner1[2]]}
          showTooltip={false}
        />
      )}

      {previewDimensions &&
        previewDimensions.length > 0.1 &&
        previewDimensions.width > 0.1 && (
          <mesh
            layers={EDITOR_LAYER}
            position={[
              previewDimensions.centerX,
              levelY + GRID_OFFSET,
              previewDimensions.centerZ,
            ]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry
              args={[previewDimensions.length, previewDimensions.width]}
            />
            <meshBasicMaterial
              color="#818cf8"
              depthTest={false}
              depthWrite={false}
              opacity={0.1}
              side={DoubleSide}
              transparent
            />
          </mesh>
        )}
    </group>
  );
};
