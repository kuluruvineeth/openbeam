import type { ToolContext } from "../tools/types";

export interface Position {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export type NodeType =
  | "note"
  | "text"
  | "shape"
  | "image"
  | "code"
  | "frame"
  | "group"
  | "embed"
  | "custom";

export type ConnectionType = "line" | "arrow" | "curve" | "elbow" | "custom";

export interface NodeStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  textColor?: string;
  fontSize?: number;
  fontWeight?: string;
  opacity?: number;
}

export interface ConnectionStyle {
  color?: string;
  width?: number;
  dashArray?: number[];
  startMarker?: "none" | "arrow" | "circle" | "square";
  endMarker?: "none" | "arrow" | "circle" | "square";
  curvature?: number;
}

export interface CanvasNode {
  id: string;
  type: NodeType | string;
  position: Position;
  dimensions?: Dimensions;
  content?: string | Record<string, unknown>;
  style?: NodeStyle;
  parentId?: string;
  zIndex: number;
  locked: boolean;
  visible: boolean;
}

export interface CanvasConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string;
  targetHandle?: string;
  type: ConnectionType;
  label?: string;
  style?: ConnectionStyle;
}

export interface CanvasState {
  nodes: CanvasNode[];
  connections: CanvasConnection[];
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
  selection?: string[];
}

export type CanvasPatchOperation =
  | { op: "add"; path: string; value: unknown }
  | { op: "remove"; path: string }
  | { op: "replace"; path: string; value: unknown }
  | { op: "move"; from: string; path: string };

export interface CanvasPatch {
  operations: CanvasPatchOperation[];
  description?: string;
}

export interface CanvasToolContext extends ToolContext {
  getState?: () => Promise<CanvasState>;
  applyPatch?: (patch: CanvasPatch) => Promise<void>;
  getSelection?: () => Promise<string[]>;
  setSelection?: (nodeIds: string[]) => Promise<void>;
}

export type LayoutAlgorithm =
  | "grid"
  | "tree"
  | "force"
  | "radial"
  | "horizontal"
  | "vertical"
  | "circular";

export interface LayoutOptions {
  algorithm: LayoutAlgorithm;
  spacing?: number;
  nodeIds?: string[];
  centerX?: number;
  centerY?: number;
  direction?: "LR" | "RL" | "TB" | "BT";
}

export interface NodeGenerationRequest {
  prompt: string;
  position?: Position;
  style?: NodeStyle;
  generateConnections?: boolean;
}

export interface NodeGenerationResult {
  nodes: CanvasNode[];
  connections?: CanvasConnection[];
  metadata?: {
    tokensUsed?: number;
    generationTimeMs?: number;
  };
}

export interface CanvasAnalysisResult {
  summary: string;
  nodeCount: number;
  connectionCount: number;
  insights?: string[];
  suggestions?: string[];
  clusters?: Array<{ id: string; nodeIds: string[]; label?: string }>;
}

export interface CanvasQueryResult<T = unknown> {
  data: T;
  matchCount: number;
  queryTimeMs: number;
}
