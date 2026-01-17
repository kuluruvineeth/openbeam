import { ConditionalEdge } from "./conditional-edge";
import { ControlEdge } from "./control-edge";
import { DataEdge } from "./data-edge";
import { ErrorEdge } from "./error-edge";

export type { ConditionalEdgeData } from "./conditional-edge";
export { ConditionalEdge } from "./conditional-edge";
export type { ControlEdgeData } from "./control-edge";
export { ControlEdge } from "./control-edge";
export type { DataEdgeData } from "./data-edge";
export { DataEdge } from "./data-edge";
export type { ErrorEdgeData } from "./error-edge";
export { ErrorEdge } from "./error-edge";

export const edgeTypes = {
  data: DataEdge,
  control: ControlEdge,
  conditional: ConditionalEdge,
  error: ErrorEdge,
} as const;

export type EdgeTypes = keyof typeof edgeTypes;
