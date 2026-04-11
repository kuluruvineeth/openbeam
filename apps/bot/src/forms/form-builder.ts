import type { FormField } from "@openbeam/types/bot";

interface ActionInput {
  id: string;
  name: string;
  description?: string;
  type: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
}

const TYPE_MAP: Record<string, FormField["type"]> = {
  string: "text",
  text: "text",
  number: "number",
  integer: "number",
  boolean: "boolean",
  select: "select",
  enum: "select",
  multiselect: "multiselect",
};

const COMPLEX_THRESHOLD = 4;

export function buildFormFields(inputs: ActionInput[]): FormField[] {
  return inputs
    .filter((i) => i.required !== false)
    .map((input) => ({
      id: input.id,
      label: input.name,
      prompt: input.description ?? `Enter ${input.name}:`,
      type: TYPE_MAP[input.type] ?? "text",
      required: input.required !== false,
      options: input.options,
    }));
}

export function isComplexForm(inputs: ActionInput[]): boolean {
  const requiredCount = inputs.filter((i) => i.required !== false).length;
  return requiredCount >= COMPLEX_THRESHOLD;
}
