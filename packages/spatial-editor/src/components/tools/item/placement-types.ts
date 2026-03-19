import type {
  AnyNode,
  AssetInput,
  CeilingNode,
  ItemNode,
  LevelNode,
  WallNode,
} from "@openbeam/spatial-core";
import type { Vector3 } from "three";

export type SurfaceType = "floor" | "wall" | "ceiling" | "item-surface";

export interface PlacementState {
  surface: SurfaceType;
  wallId: string | null;
  ceilingId: string | null;
  surfaceItemId: string | null;
}

export interface PlacementContext {
  asset: AssetInput;
  levelId: LevelNode["id"] | null;
  draftItem: ItemNode | null;
  gridPosition: Vector3;
  state: PlacementState;
}

export interface PlacementResult {
  gridPosition: [number, number, number];
  cursorPosition: [number, number, number];
  cursorRotationY: number;
  nodeUpdate: Partial<ItemNode> | null;
  stopPropagation: boolean;
  dirtyNodeId: AnyNode["id"] | null;
}

export interface TransitionResult {
  stateUpdate: Partial<PlacementState>;
  nodeUpdate: Partial<ItemNode>;
  gridPosition: [number, number, number];
  cursorPosition: [number, number, number];
  cursorRotationY: number;
  stopPropagation: boolean;
}

export interface CommitResult {
  nodeUpdate: Partial<ItemNode>;
  stopPropagation: boolean;
  dirtyNodeId: AnyNode["id"] | null;
}

export interface SpatialValidators {
  canPlaceOnFloor: (options: {
    levelId: LevelNode["id"];
    position: [number, number, number];
    dimensions: [number, number, number];
    rotation: [number, number, number];
    ignoreIds?: string[];
  }) => { valid: boolean };
  canPlaceOnWall: (options: {
    levelId: LevelNode["id"];
    wallId: WallNode["id"];
    localX: number;
    localY: number;
    dimensions: [number, number, number];
    attachType?: "wall" | "wall-side";
    side?: "front" | "back";
    ignoreIds?: string[];
  }) => { valid: boolean; adjustedY?: number; wasAdjusted?: boolean };
  canPlaceOnCeiling: (options: {
    ceilingId: CeilingNode["id"];
    position: [number, number, number];
    dimensions: [number, number, number];
    rotation: [number, number, number];
    ignoreIds?: string[];
  }) => { valid: boolean };
}

export type LevelResolver = (
  node: AnyNode,
  nodes: Record<string, AnyNode>
) => string;
