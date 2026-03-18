import { useCallback } from "react";
import type { CeilingNode, LevelNode, WallNode } from "../../schema";
import { spatialGridManager } from "./spatial-grid-manager";

export function useSpatialQuery() {
  const canPlaceOnFloor = useCallback(
    (options: {
      levelId: LevelNode["id"];
      position: [number, number, number];
      dimensions: [number, number, number];
      rotation: [number, number, number];
      ignoreIds?: string[];
    }) => spatialGridManager.canPlaceOnFloor(options),
    []
  );

  const canPlaceOnWall = useCallback(
    (options: {
      levelId: LevelNode["id"];
      wallId: WallNode["id"];
      localX: number;
      localY: number;
      dimensions: [number, number, number];
      attachType?: "wall" | "wall-side";
      side?: "front" | "back";
      ignoreIds?: string[];
    }) => spatialGridManager.canPlaceOnWall(options),
    []
  );

  const canPlaceOnCeiling = useCallback(
    (options: {
      ceilingId: CeilingNode["id"];
      position: [number, number, number];
      dimensions: [number, number, number];
      rotation: [number, number, number];
      ignoreIds?: string[];
    }) => spatialGridManager.canPlaceOnCeiling(options),
    []
  );

  return { canPlaceOnFloor, canPlaceOnWall, canPlaceOnCeiling };
}
