"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import {
  Calendar,
  FormInput,
  Hash,
  List,
  ToggleLeft,
  Type,
  Upload,
} from "lucide-react";
import { forwardRef, memo } from "react";
import { cn } from "../../../../utils";
import type { NodePortDefinition } from "../base-node";

export type InputType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "boolean"
  | "file"
  | "textarea";

export interface InputOption {
  value: string;
  label: string;
}

export interface InputNodeConfig {
  inputType: InputType;
  placeholder?: string;
  required?: boolean;
  options?: InputOption[];
  min?: number;
  max?: number;
  accept?: string;
}

export interface InputNodeData {
  label: string;
  config: InputNodeConfig;
  inputs: NodePortDefinition[];
  outputs: NodePortDefinition[];
  value?: string | number | boolean;
  hasSubmitted?: boolean;
  fieldLabel?: string;
  helperText?: string;
  [key: string]: unknown;
}

type InputNodeType = Node<InputNodeData, "input">;

const INPUT_TYPE_CONFIG: Record<
  InputType,
  { icon: React.ElementType; label: string; color: string }
> = {
  text: { icon: Type, label: "Text", color: "text-cyan-500" },
  number: { icon: Hash, label: "Number", color: "text-blue-500" },
  date: { icon: Calendar, label: "Date", color: "text-purple-500" },
  select: { icon: List, label: "Select", color: "text-orange-500" },
  boolean: { icon: ToggleLeft, label: "Boolean", color: "text-green-500" },
  file: { icon: Upload, label: "File", color: "text-pink-500" },
  textarea: { icon: FormInput, label: "Long Text", color: "text-teal-500" },
};

function InputNodeDetails({ data }: { data: InputNodeData }) {
  const inputType = data.config.inputType ?? "text";
  const optionCount = data.config.options?.length ?? 0;
  const hasRange =
    data.config.min !== undefined || data.config.max !== undefined;

  return (
    <>
      {data.fieldLabel && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">Field</span>
          <span className="text-xs">{data.fieldLabel}</span>
        </div>
      )}

      {inputType === "select" && optionCount > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">Options</span>
          <span className="text-xs">{optionCount} choices</span>
        </div>
      )}

      {inputType === "number" && hasRange && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">Range</span>
          <span className="text-xs">
            {data.config.min ?? "∞"} - {data.config.max ?? "∞"}
          </span>
        </div>
      )}

      {data.config.placeholder && (
        <div className="mt-1 truncate text-muted-foreground/70 text-xs">
          "{data.config.placeholder}"
        </div>
      )}

      {data.helperText && (
        <p className="text-[10px] text-muted-foreground">{data.helperText}</p>
      )}
    </>
  );
}

export const InputNode = memo(
  forwardRef<HTMLDivElement, NodeProps<InputNodeType>>(
    function InputNodeComponent({ data, selected }, ref) {
      const inputType = data.config.inputType ?? "text";
      const isRequired = data.config.required !== false;
      const hasSubmitted = data.hasSubmitted ?? false;

      const typeConfig = INPUT_TYPE_CONFIG[inputType];
      const TypeIcon = typeConfig.icon;

      return (
        <div
          className={cn(
            "flex min-w-[200px] flex-col rounded-sm border border-cyan-500/50 bg-cyan-500/5 shadow-sm",
            selected && "ring-2 ring-primary ring-offset-1",
            hasSubmitted && "border-green-500/50 bg-green-500/5"
          )}
          ref={ref}
        >
          <div className="flex items-center gap-2 rounded-t-sm bg-cyan-500/10 px-3 py-2">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center",
                typeConfig.color
              )}
            >
              <TypeIcon className="h-4 w-4" />
            </div>
            <span className="font-medium text-sm">{data.label}</span>
            {isRequired && <span className="text-red-500 text-xs">*</span>}
          </div>

          <div className="space-y-1.5 border-border/50 border-t px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Type</span>
              <span className={cn("font-medium text-xs", typeConfig.color)}>
                {typeConfig.label}
              </span>
            </div>

            <InputNodeDetails data={data} />

            {hasSubmitted && (
              <div className="flex items-center gap-1 pt-1">
                <span className="rounded-sm bg-green-500/20 px-1.5 py-0.5 text-green-500 text-xs">
                  Submitted
                </span>
                {data.value !== undefined && (
                  <span className="truncate text-xs">
                    {String(data.value).slice(0, 20)}
                  </span>
                )}
              </div>
            )}
          </div>

          <Handle
            className="h-3! w-3! border-2! border-background! bg-cyan-500!"
            position={Position.Right}
            type="source"
          />
        </div>
      );
    }
  )
);
InputNode.displayName = "InputNode";

export function createInputNodeData(): InputNodeData {
  return {
    label: "User Input",
    config: {
      inputType: "text",
      required: true,
    },
    inputs: [],
    outputs: [{ id: "value", label: "Value", type: "data", required: true }],
    hasSubmitted: false,
  };
}
