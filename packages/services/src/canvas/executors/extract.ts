import { complete } from "@openbeam/ai";
import {
  type CompletionOptions,
  getChatModel,
  type ProviderId,
  ProviderIdSchema,
} from "@openbeam/types/ai";
import {
  type ExtractedValue,
  type ExtractionField,
  type ExtractionResult,
  ExtractionResultSchema,
  type ExtractNodeConfig,
  ExtractNodeConfigSchema,
  type FieldType,
  type FieldValidation,
  type NerEntity,
  NerEntitySchema,
} from "@openbeam/types/canvas";
import { z } from "zod";
import { CanvasNodeExecutionError } from "../errors";
import { resolveNodeConfig } from "../node-config";
import type { CanvasNodeExecutor } from "../types";

const JSON_FENCE_REGEX = /```(?:json)?\s*([\s\S]*?)```/i;
const DEFAULT_CONFIDENCE = 0.5;
const DEFAULT_TEXT = "No extraction output.";
const DEFAULT_LIMIT = 4000;
const NORMALIZE_KEY = /[^a-z0-9]/g;

const ExtractValueSchema = z.object({
  field: z.string(),
  value: z.unknown(),
  confidence: z.number().optional(),
  source: z.string().optional(),
});

const ExtractModelOutputSchema = z.object({
  values: z.array(ExtractValueSchema),
  entities: z.array(NerEntitySchema).optional(),
});

type NormalizationOptions = {
  strictMode: boolean;
  includeConfidence: boolean;
  handleArrays: ExtractNodeConfig["handleArrays"];
  nullHandling: ExtractNodeConfig["nullHandling"];
};

type SchemaContext = {
  hasSchema: boolean;
  fields: ExtractionField[];
  fieldIndex: Map<string, ExtractionField>;
};

type InputPayload = {
  text: string;
};

type ParsedOutput = {
  values: ExtractedValue[];
  entities: NerEntity[];
  raw: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(NORMALIZE_KEY, "");
}

function buildFieldIndex(
  fields: ExtractionField[]
): Map<string, ExtractionField> {
  const index = new Map<string, ExtractionField>();
  for (const field of fields) {
    index.set(normalizeKey(field.id), field);
    index.set(normalizeKey(field.name), field);
  }
  return index;
}

function resolveFields(config: ExtractNodeConfig): ExtractionField[] {
  if (config.mode === "schema") {
    return config.fields ?? [];
  }
  if (config.mode === "template") {
    if (config.customTemplate?.fields?.length) {
      return config.customTemplate.fields;
    }
    return config.fields ?? [];
  }
  if (config.mode === "example") {
    if (config.inferredSchema?.length) {
      return config.inferredSchema;
    }
    return config.jsonExample ? inferFieldsFromExample(config.jsonExample) : [];
  }
  return [];
}

function inferFieldsFromExample(example: string): ExtractionField[] {
  try {
    const parsed = JSON.parse(example);
    return inferFieldsFromJson(parsed);
  } catch {
    return [];
  }
}

function inferFieldsFromJson(value: unknown, prefix = ""): ExtractionField[] {
  if (!isRecord(value)) {
    return [];
  }

  const fields: ExtractionField[] = [];
  for (const [key, entry] of Object.entries(value)) {
    const fieldId = prefix ? `${prefix}.${key}` : key;
    const fieldType = inferFieldType(entry);
    const field: ExtractionField = {
      id: fieldId,
      name: key,
      type: fieldType,
    };
    if (fieldType === "object" && isRecord(entry)) {
      field.nested = inferFieldsFromJson(entry);
    }
    if (fieldType === "array" && Array.isArray(entry)) {
      const first = entry.find((item) => isRecord(item)) as
        | Record<string, unknown>
        | undefined;
      if (first) {
        field.nested = inferFieldsFromJson(first);
      }
    }
    fields.push(field);
  }
  return fields;
}

function inferFieldType(value: unknown): FieldType {
  if (Array.isArray(value)) {
    return "array";
  }
  if (value instanceof Date) {
    return "date";
  }
  if (typeof value === "number") {
    return "number";
  }
  if (typeof value === "boolean") {
    return "boolean";
  }
  if (isRecord(value)) {
    return "object";
  }
  return "string";
}

function resolveSchemaContext(config: ExtractNodeConfig): SchemaContext {
  const fields = resolveFields(config);
  return {
    hasSchema: fields.length > 0,
    fields,
    fieldIndex: buildFieldIndex(fields),
  };
}

function resolveInputText(input: unknown): string {
  if (typeof input === "string") {
    return input.trim();
  }
  if (Array.isArray(input)) {
    return input
      .map((item) => resolveInputText(item))
      .filter(Boolean)
      .join("\n\n");
  }
  if (input === null || input === undefined) {
    return "";
  }
  if (!isRecord(input)) {
    return String(input);
  }

  const stringCandidates = [
    input.text,
    input.content,
    input.input,
    input.prompt,
    input.message,
    input.summary,
    input.body,
    input.output,
  ];
  for (const candidate of stringCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  if (Array.isArray(input.messages)) {
    const messages = input.messages
      .map((message) => {
        if (!isRecord(message)) {
          return "";
        }
        const role =
          typeof message.role === "string" ? message.role.trim() : "speaker";
        const content =
          typeof message.content === "string" ? message.content.trim() : "";
        return content ? `${role}: ${content}` : "";
      })
      .filter(Boolean);
    if (messages.length > 0) {
      return messages.join("\n\n");
    }
  }

  if (Array.isArray(input.chunks)) {
    const chunkText = input.chunks
      .map((chunk) => {
        if (!isRecord(chunk)) {
          return "";
        }
        return typeof chunk.content === "string" ? chunk.content.trim() : "";
      })
      .filter(Boolean)
      .join("\n\n");
    if (chunkText) {
      return chunkText;
    }
  }

  if (Array.isArray(input.documents)) {
    const docText = input.documents
      .map((doc) => {
        if (!isRecord(doc)) {
          return "";
        }
        let content = "";
        if (typeof doc.content === "string") {
          content = doc.content;
        } else if (typeof doc.text === "string") {
          content = doc.text;
        }
        return content.trim();
      })
      .filter(Boolean)
      .join("\n\n");
    if (docText) {
      return docText;
    }
  }

  try {
    return JSON.stringify(input);
  } catch {
    return String(input);
  }
}

function resolveInputPayload(input: unknown): InputPayload {
  const text = resolveInputText(input);
  return { text };
}

function resolveModel(model?: string): {
  providerId?: ProviderId;
  modelId?: string;
} {
  if (!model?.trim()) {
    return {};
  }
  const trimmed = model.trim();
  const prefixEnd = trimmed.indexOf(":");
  if (prefixEnd > 0) {
    const prefix = trimmed.slice(0, prefixEnd);
    const candidate = trimmed.slice(prefixEnd + 1);
    const provider = ProviderIdSchema.safeParse(prefix);
    if (provider.success) {
      return { providerId: provider.data, modelId: candidate || undefined };
    }
  }
  const known = getChatModel(trimmed);
  return { providerId: known?.provider, modelId: trimmed };
}

type SchemaFieldDefinition = {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  description?: string;
  validation?: FieldValidation;
  nested?: SchemaFieldDefinition[];
};

function toSchemaDefinition(field: ExtractionField): SchemaFieldDefinition {
  const nested = field.nested?.map(toSchemaDefinition);
  const definition: SchemaFieldDefinition = {
    id: field.id,
    name: field.name,
    type: field.type,
    required: Boolean(field.required),
    description: field.description,
    validation: field.validation,
  };
  if (nested && nested.length > 0) {
    definition.nested = nested;
  }
  return definition;
}

function buildSchemaDefinition(fields: ExtractionField[]): string {
  return JSON.stringify(fields.map(toSchemaDefinition), null, 2);
}

function buildExtractionPrompt(params: {
  config: ExtractNodeConfig;
  schema: SchemaContext;
}): string {
  const { config, schema } = params;
  const instructions: string[] = [];

  if (schema.hasSchema) {
    instructions.push("Extract only the fields defined in <schema>.");
  } else {
    instructions.push("Infer appropriate field identifiers based on the task.");
  }

  instructions.push(
    config.strictMode
      ? "Do not guess. Use null if the value is missing."
      : "Provide the best available value even if partially inferred."
  );

  if (config.handleArrays === "first") {
    instructions.push("If multiple values exist, return only the first.");
  } else if (config.handleArrays === "merge") {
    instructions.push(
      "Merge multiple values into a single array of unique entries."
    );
  } else {
    instructions.push("Return all values when multiple matches exist.");
  }

  if (config.nullHandling === "omit") {
    instructions.push("Omit fields that are missing.");
  } else if (config.nullHandling === "default") {
    instructions.push("Use sensible defaults when values are missing.");
  } else {
    instructions.push("Use null when values are missing.");
  }

  if (config.includeConfidence) {
    instructions.push(
      "Include confidence scores between 0 and 1 for each value."
    );
  }

  if (config.extractEntities) {
    const entityScope = config.entityTypes?.length
      ? `Restrict entities to: ${config.entityTypes.join(", ")}.`
      : "Extract named entities mentioned in the content.";
    instructions.push(entityScope);
  }

  if (config.extractionPrompt?.trim()) {
    instructions.push(config.extractionPrompt.trim());
  }

  return `<role>
You are a structured data extraction assistant.
</role>

<task>
Extract structured fields from the provided content.
</task>

${schema.hasSchema ? `<schema>\n${buildSchemaDefinition(schema.fields)}\n</schema>\n` : ""}

${config.jsonExample ? `<example_output>\n${config.jsonExample.trim()}\n</example_output>\n` : ""}

<instructions>
${instructions.map((instruction) => `- ${instruction}`).join("\n")}
</instructions>

<output_format>
Return JSON only:
{
  "values": [
    {
      "field": "field_id",
      "value": "value",
      "confidence": 0.0,
      "source": "optional source snippet"
    }
  ],
  "entities": [
    {
      "text": "Entity",
      "type": "person",
      "start": 0,
      "end": 4,
      "confidence": 0.0
    }
  ]
}
Use empty arrays when no values are found.
</output_format>`;
}

function extractJsonCandidate(text: string): string | null {
  const fenced = JSON_FENCE_REGEX.exec(text);
  if (fenced?.[1]) {
    return fenced[1];
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return text.slice(start, end + 1);
  }
  if (start < 0 && text.includes("[")) {
    const arrayStart = text.indexOf("[");
    const arrayEnd = text.lastIndexOf("]");
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      return text.slice(arrayStart, arrayEnd + 1);
    }
  }
  return null;
}

function parseModelOutput(
  content: string,
  schema: SchemaContext,
  options: NormalizationOptions
): ParsedOutput {
  const candidate = extractJsonCandidate(content);
  if (!candidate) {
    throw new Error("Extraction response did not include JSON");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new Error("Extraction response JSON could not be parsed");
  }

  const { values, entities } = normalizeParsedOutput(parsed);
  const normalizedValues = normalizeValues(values, schema, options);
  const normalizedEntities = options.strictMode
    ? entities
    : entities.filter((entity) => NerEntitySchema.safeParse(entity).success);

  return {
    values: normalizedValues,
    entities: normalizedEntities,
    raw: parsed,
  };
}

function normalizeParsedOutput(parsed: unknown): {
  values: ExtractedValue[];
  entities: NerEntity[];
} {
  if (ExtractModelOutputSchema.safeParse(parsed).success) {
    const data = parsed as z.infer<typeof ExtractModelOutputSchema>;
    return { values: data.values, entities: data.entities ?? [] };
  }
  if (isRecord(parsed)) {
    const entities = Array.isArray(parsed.entities)
      ? parsed.entities.filter(
          (entity) => NerEntitySchema.safeParse(entity).success
        )
      : [];
    const valuesFromMap = mapToValues(parsed, entities);
    return { values: valuesFromMap, entities };
  }
  if (Array.isArray(parsed)) {
    const values: ExtractedValue[] = [];
    for (const entry of parsed) {
      const result = ExtractValueSchema.safeParse(entry);
      if (result.success) {
        values.push(result.data);
      }
    }
    return { values, entities: [] };
  }
  return { values: [], entities: [] };
}

function mapToValues(
  parsed: Record<string, unknown>,
  entities: NerEntity[]
): ExtractedValue[] {
  const values: ExtractedValue[] = [];
  for (const [key, value] of Object.entries(parsed)) {
    if (key === "entities") {
      continue;
    }
    values.push({ field: key, value });
  }
  if (values.length === 0 && entities.length === 0) {
    values.push({ field: "extracted", value: DEFAULT_TEXT });
  }
  return values;
}

function normalizeValues(
  values: ExtractedValue[],
  schema: SchemaContext,
  options: NormalizationOptions
): ExtractedValue[] {
  const normalized: ExtractedValue[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const fieldKey = value.field;
    const field = schema.hasSchema
      ? schema.fieldIndex.get(normalizeKey(fieldKey))
      : undefined;

    if (schema.hasSchema && !field) {
      if (options.strictMode) {
        throw new Error(`Unknown field '${fieldKey}' in extraction output`);
      }
      continue;
    }

    const resolvedField = field ?? {
      id: fieldKey,
      name: fieldKey,
      type: inferFieldType(value.value),
    };

    const normalizedValue = normalizeValueForField(
      resolvedField,
      value.value,
      options
    );

    if (normalizedValue === undefined) {
      continue;
    }

    const output: ExtractedValue = {
      field: resolvedField.id,
      value: normalizedValue,
    };

    if (options.includeConfidence) {
      output.confidence =
        typeof value.confidence === "number"
          ? value.confidence
          : DEFAULT_CONFIDENCE;
    }
    if (typeof value.source === "string" && value.source.trim()) {
      output.source = value.source.trim();
    }

    normalized.push(output);
    seen.add(resolvedField.id);
  }

  if (schema.hasSchema) {
    fillMissingRequiredFields(schema.fields, normalized, seen, options);
  }

  return normalized;
}

function fillMissingRequiredFields(
  fields: ExtractionField[],
  values: ExtractedValue[],
  seen: Set<string>,
  options: NormalizationOptions
): void {
  for (const field of fields) {
    if (!field.required) {
      continue;
    }
    if (seen.has(field.id)) {
      continue;
    }
    const fallback = resolveMissingValue(field.type, options);
    if (fallback === undefined) {
      if (options.strictMode) {
        throw new Error(`Required field '${field.id}' is missing`);
      }
      continue;
    }
    values.push({ field: field.id, value: fallback });
  }
}

function resolveMissingValue(
  fieldType: FieldType,
  options: NormalizationOptions
): unknown | undefined {
  if (options.nullHandling === "omit") {
    return;
  }
  if (options.nullHandling === "null") {
    return null;
  }
  if (options.nullHandling === "default") {
    return defaultValueForType(fieldType);
  }
  return;
}

function defaultValueForType(fieldType: FieldType): unknown {
  if (fieldType === "number") {
    return 0;
  }
  if (fieldType === "boolean") {
    return false;
  }
  if (fieldType === "array") {
    return [];
  }
  if (fieldType === "object") {
    return {};
  }
  return "";
}

function normalizeValueForField(
  field: ExtractionField,
  value: unknown,
  options: NormalizationOptions
): unknown | undefined {
  if (value === undefined || value === null) {
    return resolveMissingValue(field.type, options);
  }

  if (Array.isArray(value)) {
    return normalizeArrayValue(field, value, options);
  }

  if (field.type === "array") {
    if (options.strictMode) {
      throw new Error(`Field '${field.id}' expects array`);
    }
    return normalizeArrayValue(field, [value], options);
  }

  if (field.type === "object") {
    return normalizeObjectValue(field, value, options);
  }

  const primitive = normalizePrimitiveValue(field.type, value, options);
  if (!validateValue(field.validation, primitive, options)) {
    if (options.strictMode) {
      throw new Error(`Field '${field.id}' failed validation`);
    }
    return resolveMissingValue(field.type, options);
  }
  return primitive;
}

function normalizeArrayValue(
  field: ExtractionField,
  value: unknown[],
  options: NormalizationOptions
): unknown | undefined {
  if (value.length === 0) {
    return resolveMissingValue(field.type, options);
  }

  let normalized = value;
  if (options.handleArrays === "first") {
    normalized = [value[0]];
  } else if (options.handleArrays === "merge") {
    normalized = mergeArrayValues(value);
  }

  if (field.type !== "array") {
    return normalized[0];
  }

  const nestedFields = field.nested ?? [];
  if (nestedFields.length > 0) {
    const nestedObjects = normalized
      .map((entry) => normalizeNestedObject(entry, nestedFields, options))
      .filter((entry): entry is Record<string, unknown> => entry !== undefined);
    return nestedObjects;
  }

  return normalized;
}

function normalizeObjectValue(
  field: ExtractionField,
  value: unknown,
  options: NormalizationOptions
): unknown | undefined {
  if (!isRecord(value)) {
    if (options.strictMode) {
      throw new Error(`Field '${field.id}' expects object`);
    }
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (isRecord(parsed)) {
          return normalizeObjectValue(field, parsed, options);
        }
      } catch {
        return resolveMissingValue(field.type, options);
      }
    }
    return resolveMissingValue(field.type, options);
  }

  if (!field.nested || field.nested.length === 0) {
    return value;
  }

  const normalized = normalizeNestedObject(value, field.nested, options);
  if (normalized === undefined) {
    return resolveMissingValue(field.type, options);
  }
  return normalized;
}

function normalizeNestedObject(
  value: unknown,
  fields: ExtractionField[],
  options: NormalizationOptions
): Record<string, unknown> | undefined {
  if (!isRecord(value)) {
    return;
  }
  const nestedIndex = buildFieldIndex(fields);
  const normalized: Record<string, unknown> = {};
  const seen = new Set<string>();

  for (const [key, entryValue] of Object.entries(value)) {
    const field = nestedIndex.get(normalizeKey(key));
    if (!field) {
      if (options.strictMode) {
        throw new Error(`Unknown nested field '${key}'`);
      }
      continue;
    }
    const normalizedValue = normalizeValueForField(field, entryValue, options);
    if (normalizedValue === undefined) {
      continue;
    }
    normalized[field.id] = normalizedValue;
    seen.add(field.id);
  }

  for (const field of fields) {
    if (!field.required || seen.has(field.id)) {
      continue;
    }
    const fallback = resolveMissingValue(field.type, options);
    if (fallback === undefined) {
      if (options.strictMode) {
        throw new Error(`Required nested field '${field.id}' is missing`);
      }
      continue;
    }
    normalized[field.id] = fallback;
  }

  return normalized;
}

function mergeArrayValues(values: unknown[]): unknown[] {
  const flat = values.flatMap((entry) =>
    Array.isArray(entry) ? entry : [entry]
  );
  const seen = new Set<string>();
  const result: unknown[] = [];
  for (const entry of flat) {
    const key = isRecord(entry) ? JSON.stringify(entry) : String(entry);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(entry);
  }
  return result;
}

function normalizePrimitiveValue(
  fieldType: FieldType,
  value: unknown,
  options: NormalizationOptions
): unknown {
  if (fieldType === "number") {
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    if (options.strictMode) {
      throw new Error("Expected number value");
    }
    return defaultValueForType(fieldType);
  }

  if (fieldType === "boolean") {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      if (value.toLowerCase() === "true") {
        return true;
      }
      if (value.toLowerCase() === "false") {
        return false;
      }
    }
    if (options.strictMode) {
      throw new Error("Expected boolean value");
    }
    return defaultValueForType(fieldType);
  }

  if (fieldType === "date") {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === "number") {
      return new Date(value).toISOString();
    }
    if (typeof value === "string") {
      return value;
    }
    if (options.strictMode) {
      throw new Error("Expected date value");
    }
    return "";
  }

  if (fieldType === "object") {
    return value;
  }

  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (options.strictMode) {
    throw new Error("Expected string value");
  }
  return String(value);
}

function validateValue(
  validation: FieldValidation | undefined,
  value: unknown,
  options: NormalizationOptions
): boolean {
  if (!validation) {
    return true;
  }
  if (value === null || value === undefined) {
    return !options.strictMode;
  }
  if (typeof value === "string") {
    if (
      validation.minLength !== undefined &&
      value.length < validation.minLength
    ) {
      return false;
    }
    if (
      validation.maxLength !== undefined &&
      value.length > validation.maxLength
    ) {
      return false;
    }
    if (validation.pattern) {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        return false;
      }
    }
    if (validation.enum && !validation.enum.includes(value)) {
      return false;
    }
  }
  if (typeof value === "number") {
    if (validation.min !== undefined && value < validation.min) {
      return false;
    }
    if (validation.max !== undefined && value > validation.max) {
      return false;
    }
  }
  return true;
}

function buildCompletionOptions(config: ExtractNodeConfig): CompletionOptions {
  const model = resolveModel(config.model);
  return {
    providerId: model.providerId,
    modelId: model.modelId,
    temperature: config.temperature,
  };
}

function buildUsage(
  result: Awaited<ReturnType<typeof complete>>,
  startedAt: number
): ExtractionResult["usage"] {
  return {
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    latencyMs: Date.now() - startedAt,
  };
}

export const extractExecutor: CanvasNodeExecutor = async ({ node, input }) => {
  const config = ExtractNodeConfigSchema.parse(resolveNodeConfig(node.data));
  const startedAt = Date.now();

  try {
    const payload = resolveInputPayload(input);
    if (!payload.text.trim()) {
      throw new Error("Extract input is required");
    }

    const schemaContext = resolveSchemaContext(config);
    const systemPrompt = buildExtractionPrompt({
      config,
      schema: schemaContext,
    });

    const contentText =
      payload.text.length > DEFAULT_LIMIT
        ? payload.text.slice(0, DEFAULT_LIMIT)
        : payload.text;

    const completion = await complete(
      [{ role: "user", content: `<content>\n${contentText}\n</content>` }],
      {
        ...buildCompletionOptions(config),
        systemPrompt,
      }
    );

    const parsed = parseModelOutput(completion.content ?? "", schemaContext, {
      strictMode: config.strictMode,
      includeConfidence: config.includeConfidence,
      handleArrays: config.handleArrays,
      nullHandling: config.nullHandling,
    });

    const result: ExtractionResult = {
      values: parsed.values,
      usage: buildUsage(completion, startedAt),
    };

    if (config.extractEntities && parsed.entities.length > 0) {
      result.entities = parsed.entities;
    }

    if (!config.strictMode) {
      result.raw = parsed.raw;
    }

    return ExtractionResultSchema.parse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new CanvasNodeExecutionError({
      nodeType: node.type,
      nodeId: node.id,
      message,
      cause: error,
    });
  }
};
