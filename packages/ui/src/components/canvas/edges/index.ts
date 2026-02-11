import { AnimatedEdge } from "./animated-edge";
import { ConditionalEdge } from "./conditional-edge";
import { ControlEdge } from "./control-edge";
import { DataEdge } from "./data-edge";
import { EditableEdge } from "./editable-edge";
import { ErrorEdge } from "./error-edge";
import { FloatingEdge } from "./floating-edge";
import { MultiConnectionEdge } from "./multi-connection-edge";
import { TemporaryEdge } from "./temporary-edge";
import { TurboEdge } from "./turbo-edge";

export { AnimatedEdge } from "./animated-edge";
export type { ConditionalEdgeData } from "./conditional-edge";
export { ConditionalEdge } from "./conditional-edge";
export { REACT_FLOW_NO_INTERACT } from "./constants";
export type { ControlEdgeData } from "./control-edge";
export { ControlEdge } from "./control-edge";
export type { DataEdgeData } from "./data-edge";
export { DataEdge } from "./data-edge";
export type { EdgeTooltipProps } from "./edge-tooltip";
export { EdgeTooltip } from "./edge-tooltip";
export { buildSegments, EditableEdge } from "./editable-edge";
export type { ErrorEdgeData } from "./error-edge";
export { ErrorEdge } from "./error-edge";
export { FloatingEdge } from "./floating-edge";
export type { MultiConnectionEdgeData } from "./multi-connection-edge";
export { MultiConnectionEdge } from "./multi-connection-edge";
export { TemporaryEdge } from "./temporary-edge";
export type { TurboEdgeStatus } from "./turbo-edge";
export { TurboEdge } from "./turbo-edge";

export const edgeTypes = {
  animated: AnimatedEdge,
  data: DataEdge,
  control: ControlEdge,
  conditional: ConditionalEdge,
  editable: EditableEdge,
  error: ErrorEdge,
  floating: FloatingEdge,
  multiConnection: MultiConnectionEdge,
  temporary: TemporaryEdge,
  turbo: TurboEdge,
} as const;

export type EdgeTypes = keyof typeof edgeTypes;
