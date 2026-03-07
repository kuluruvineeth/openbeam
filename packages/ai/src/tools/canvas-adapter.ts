import type { ToolMetadata } from "@openbeam/types/ai";
import { asSchema, type FlexibleSchema } from "ai";
import type { ToolRegistry } from "./registry";

export interface CanvasToolPickerItem {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface CanvasToolParameterDef {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description?: string;
  required?: boolean;
  default?: unknown;
}

function formatToolName(raw: string): string {
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function firstLine(text: string): string {
  return text.split("\n")[0] ?? text;
}

export function toToolPickerItems(
  metadata: ToolMetadata[]
): CanvasToolPickerItem[] {
  return metadata.map((m) => ({
    id: m.name,
    name: formatToolName(m.name),
    description: firstLine(m.description),
    category: m.category,
  }));
}

function jsonSchemaTypeToSimple(
  schema: Record<string, unknown>
): CanvasToolParameterDef["type"] {
  const t = schema.type;
  if (t === "string") {
    return "string";
  }
  if (t === "number" || t === "integer") {
    return "number";
  }
  if (t === "boolean") {
    return "boolean";
  }
  if (t === "array") {
    return "array";
  }
  return "object";
}

export function createGetToolParameters(
  registry: ToolRegistry
): (toolId: string) => Promise<CanvasToolParameterDef[]> {
  return async (toolId: string): Promise<CanvasToolParameterDef[]> => {
    const info = registry.getToolInfo(toolId);
    if (!info?.inputSchema) {
      return [];
    }

    const wrapped = asSchema(info.inputSchema as FlexibleSchema);
    const jsonSchema = (await wrapped.jsonSchema) as Record<string, unknown>;

    const properties = (jsonSchema.properties ?? {}) as Record<
      string,
      Record<string, unknown>
    >;
    const required = (jsonSchema.required ?? []) as string[];

    return Object.entries(properties).map(([name, prop]) => ({
      name,
      type: jsonSchemaTypeToSimple(prop),
      description: prop.description as string | undefined,
      required: required.includes(name),
      default: prop.default,
    }));
  };
}
