"use client";

import type {
  InputField,
  InputFieldType,
  InputNodeConfig,
  NodeStatus,
  Port,
} from "@openplane/types/canvas";
import type { Node, NodeProps } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { forwardRef, memo, useMemo } from "react";
import { Icons } from "../../../icons";
import { NodeHeader, NodeSection, NodeShell } from "../primitives";

const MAX_VISIBLE_FIELDS = 4;

const FIELD_TYPE_LABELS: Record<InputFieldType, string> = {
  text: "text",
  textarea: "long",
  number: "num",
  boolean: "bool",
  date: "date",
  select: "sel",
  multiselect: "multi",
  email: "email",
  url: "url",
  file: "file",
  password: "pass",
  hidden: "hide",
};

export interface InputNodeData {
  label: string;
  config: InputNodeConfig;
  inputs?: Port[];
  outputs?: Port[];
  status?: NodeStatus;
  values?: Record<string, unknown>;
  hasSubmitted?: boolean;
  [key: string]: unknown;
}

type InputNodeType = Node<InputNodeData, "input">;

export const InputNode = memo(
  forwardRef<HTMLDivElement, NodeProps<InputNodeType>>(
    function InputNodeComponent({ data, selected }, ref) {
      const fields = data.config.fields ?? [];
      const allowSkip = data.config.allowSkip ?? false;
      const hasSubmitted = data.hasSubmitted ?? false;
      const fieldCount = fields.length;

      const handles = useMemo(() => {
        const h: Array<{
          type: "target" | "source";
          position: typeof Position.Left | typeof Position.Right;
          id?: string;
          style?: React.CSSProperties;
        }> = [{ type: "target", position: Position.Left }];

        if (allowSkip) {
          h.push(
            {
              type: "source",
              position: Position.Right,
              id: "data",
              style: { top: "35%" },
            },
            {
              type: "source",
              position: Position.Right,
              id: "skipped",
              style: { top: "65%" },
            }
          );
        } else {
          h.push({ type: "source", position: Position.Right });
        }
        return h;
      }, [allowSkip]);

      const visibleFields = fields.slice(0, MAX_VISIBLE_FIELDS);
      const hiddenCount = fieldCount - MAX_VISIBLE_FIELDS;

      return (
        <NodeShell
          handles={handles}
          ref={ref}
          selected={selected}
          status={data.status}
        >
          <NodeHeader
            colorVar="--node-input"
            icon={<Icons.Clipboard className="size-5" />}
            subtitle={
              fieldCount > 0
                ? `${fieldCount} field${fieldCount !== 1 ? "s" : ""}`
                : "No fields"
            }
            title={data.label}
          />
          <NodeSection>
            {fieldCount > 0 ? (
              <div className="space-y-1">
                {visibleFields.map((field) => (
                  <FieldRow field={field} key={field.id} />
                ))}
                {hiddenCount > 0 && (
                  <div className="pt-0.5 text-center text-[10px] text-muted-foreground/70">
                    +{hiddenCount} more
                  </div>
                )}
                {hasSubmitted ? (
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="rounded-sm bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-600">
                      Submitted
                    </span>
                    {data.values && (
                      <span className="text-[10px] text-muted-foreground">
                        {Object.keys(data.values).length} values
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="truncate border-border/30 border-t pt-1.5 text-[10px] text-muted-foreground/70">
                    "{data.config.submitLabel ?? "Submit"}"
                  </div>
                )}
              </div>
            ) : (
              <div className="py-2 text-center text-muted-foreground/50 text-xs">
                No fields configured
              </div>
            )}
          </NodeSection>
        </NodeShell>
      );
    }
  )
);

InputNode.displayName = "InputNode";

const FieldRow = memo(function FieldRowComponent({
  field,
}: {
  field: InputField;
}) {
  const isRequired = field.validation?.required ?? false;
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="min-w-0 flex-1 truncate">{field.label}</span>
      <span className="shrink-0 rounded-sm bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
        {FIELD_TYPE_LABELS[field.type]}
      </span>
      {isRequired && <span className="shrink-0 text-destructive">*</span>}
    </div>
  );
});

FieldRow.displayName = "FieldRow";

export function createInputNodeData(): InputNodeData {
  return {
    label: "User Input",
    config: {
      prompt: "",
      fields: [],
      submitLabel: "Submit",
      allowSkip: false,
      skipLabel: "Skip",
      timeoutAction: "skip",
    },
    inputs: [],
    outputs: [{ id: "data", label: "Data", type: "data", required: true }],
    hasSubmitted: false,
  };
}
