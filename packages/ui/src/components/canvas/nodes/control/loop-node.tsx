"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Repeat } from "lucide-react";
import { forwardRef, memo } from "react";
import { cn } from "../../../../utils";
import type { NodePortDefinition } from "../base-node";

export interface LoopNodeConfig {
  loopType: "forEach" | "while" | "times";
  collection?: string;
  condition?: string;
  times?: number;
  maxIterations: number;
}

export interface LoopNodeData {
  label: string;
  config: LoopNodeConfig;
  inputs: NodePortDefinition[];
  outputs: NodePortDefinition[];
  [key: string]: unknown;
}

type LoopNodeType = Node<LoopNodeData, "loop">;

export const LoopNode = memo(
  forwardRef<HTMLDivElement, NodeProps<LoopNodeType>>(
    function LoopNodeComponent({ data, selected }, ref) {
      const loopPreview = (): string => {
        switch (data.config.loopType) {
          case "forEach":
            return `For each in ${data.config.collection ?? "items"}`;
          case "while":
            return `While ${data.config.condition ?? "condition"}`;
          case "times":
            return `Repeat ${data.config.times ?? 1} times`;
          default:
            return "Configure loop";
        }
      };

      return (
        <div
          className={cn(
            "relative flex min-w-[200px] flex-col rounded-sm border border-purple-500/50 bg-purple-500/5 shadow-sm",
            selected && "ring-2 ring-primary ring-offset-1"
          )}
          ref={ref}
        >
          <Handle
            className="h-3! w-3! border-2! border-background! bg-purple-500!"
            id="input"
            position={Position.Left}
            style={{ top: "30%" }}
            type="target"
          />

          <Handle
            className="h-3! w-3! border-2! border-background! bg-purple-500/60!"
            id="loopBack"
            position={Position.Left}
            style={{ top: "70%" }}
            type="target"
          />

          <div className="flex items-center gap-2 rounded-t-sm bg-purple-500/10 px-3 py-2">
            <div className="flex h-6 w-6 items-center justify-center text-purple-500">
              <Repeat className="h-4 w-4" />
            </div>
            <span className="font-medium text-sm">{data.label}</span>
          </div>

          <div className="border-border/50 border-t px-3 py-2">
            <div className="text-muted-foreground text-xs">{loopPreview()}</div>
            <div className="mt-1 text-muted-foreground/70 text-xs">
              Max: {data.config.maxIterations} iterations
            </div>
          </div>

          <Handle
            className="h-3! w-3! border-2! border-background! bg-purple-500!"
            id="body"
            position={Position.Right}
            style={{ top: "30%" }}
            type="source"
          />
          <div
            className="absolute right-[-32px] text-purple-500 text-xs"
            style={{ top: "27%" }}
          >
            Body
          </div>

          <Handle
            className="h-3! w-3! border-2! border-background! bg-green-500!"
            id="done"
            position={Position.Right}
            style={{ top: "70%" }}
            type="source"
          />
          <div
            className="absolute right-[-32px] text-green-500 text-xs"
            style={{ top: "67%" }}
          >
            Done
          </div>
        </div>
      );
    }
  )
);
LoopNode.displayName = "LoopNode";

export function createLoopNodeData(): LoopNodeData {
  return {
    label: "Loop",
    config: { loopType: "forEach", maxIterations: 100 },
    inputs: [
      { id: "input", label: "Input", type: "data", required: true },
      { id: "loopBack", label: "Loop Back", type: "control", required: false },
    ],
    outputs: [
      { id: "body", label: "Body", type: "control", required: false },
      { id: "done", label: "Done", type: "control", required: false },
    ],
  };
}
