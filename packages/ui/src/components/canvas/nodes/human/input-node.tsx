"use client";

import type { NodeStatus, Port } from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
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
import { NodeField, NodeHeader, NodeSection, NodeShell } from "../primitives";

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
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  value?: string | number | boolean;
  hasSubmitted?: boolean;
  fieldLabel?: string;
  helperText?: string;
  [key: string]: unknown;
}

type InputNodeType = Node<InputNodeData, "input">;

const INPUT_TYPE_CONFIG: Record<
  InputType,
  { icon: React.ElementType; label: string }
> = {
  text: { icon: Type, label: "Text" },
  number: { icon: Hash, label: "Number" },
  date: { icon: Calendar, label: "Date" },
  select: { icon: List, label: "Select" },
  boolean: { icon: ToggleLeft, label: "Boolean" },
  file: { icon: Upload, label: "File" },
  textarea: { icon: FormInput, label: "Long Text" },
};

export const InputNode = memo(
  forwardRef<HTMLDivElement, NodeProps<InputNodeType>>(
    function InputNodeComponent({ data, selected }, ref) {
      const inputType = data.config.inputType ?? "text";
      const isRequired = data.config.required !== false;
      const hasSubmitted = data.hasSubmitted ?? false;
      const typeConfig = INPUT_TYPE_CONFIG[inputType];
      const TypeIcon = typeConfig.icon;

      return (
        <NodeShell
          handles={[
            { type: "target", position: Position.Left },
            { type: "source", position: Position.Right },
          ]}
          ref={ref}
          selected={selected}
          status={data.status}
        >
          <NodeHeader
            colorVar="--node-input"
            icon={<TypeIcon className="size-5" />}
            subtitle={typeConfig.label}
            title={
              <>
                {data.label}
                {isRequired && <span className="ml-1 text-destructive">*</span>}
              </>
            }
          />
          <NodeSection>
            <div className="space-y-2">
              {data.fieldLabel && (
                <NodeField label="Field">
                  <span className="text-muted-foreground">
                    {data.fieldLabel}
                  </span>
                </NodeField>
              )}
              {data.config.placeholder && (
                <div className="truncate text-muted-foreground/70 text-xs">
                  "{data.config.placeholder}"
                </div>
              )}
              {hasSubmitted && (
                <div className="flex items-center gap-2">
                  <span className="rounded-sm bg-muted px-2 py-0.5 text-muted-foreground text-xs">
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
          </NodeSection>
        </NodeShell>
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
