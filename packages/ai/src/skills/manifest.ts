import { z } from "zod";

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
const KEY_VALUE_REGEX = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/;
const SKILL_NAME_REGEX = /^[a-z][a-z0-9-]*$/;

export const SkillCategorySchema = z.enum([
  "search",
  "rag",
  "documents",
  "connectors",
  "analysis",
  "data",
  "integration",
  "custom",
]);

export type SkillCategory = z.infer<typeof SkillCategorySchema>;

export const SkillResourceSchema = z.object({
  name: z.string(),
  path: z.string(),
  type: z.enum(["file", "template", "script"]),
});

export type SkillResource = z.infer<typeof SkillResourceSchema>;

export const SkillTriggersSchema = z.object({
  keywords: z.array(z.string()).optional(),
  patterns: z.array(z.string()).optional(),
  contextTypes: z.array(z.string()).optional(),
});

export type SkillTriggers = z.infer<typeof SkillTriggersSchema>;

export const SkillExampleSchema = z.object({
  input: z.string(),
  description: z.string().optional(),
});

export type SkillExample = z.infer<typeof SkillExampleSchema>;

export const SkillManifestSchema = z.object({
  name: z
    .string()
    .regex(SKILL_NAME_REGEX, "Name must be lowercase with hyphens"),
  description: z.string().min(10).max(500),
  version: z.string().optional().default("1.0.0"),
  author: z.string().optional(),
  category: SkillCategorySchema.optional().default("custom"),
  tools: z.array(z.string()).optional(),
  resources: z.array(SkillResourceSchema).optional(),
  permissions: z.array(z.string()).optional(),
  triggers: SkillTriggersSchema.optional(),
  examples: z.array(SkillExampleSchema).optional(),
});

export type SkillManifest = z.infer<typeof SkillManifestSchema>;

export interface ParsedSkill {
  manifest: SkillManifest;
  instructions: string;
  resources: Map<string, string>;
}

interface FrontmatterResult {
  data: Record<string, unknown>;
  content: string;
}

function parseFrontmatter(content: string): FrontmatterResult {
  const match = content.match(FRONTMATTER_REGEX);

  if (!match) {
    return { data: {}, content: content.trim() };
  }

  const [, yamlContent, markdownContent] = match;
  const data = parseSimpleYaml(yamlContent ?? "");

  return {
    data,
    content: (markdownContent ?? "").trim(),
  };
}

function parseValue(value: string): unknown {
  const trimmed = value.trim();

  if (trimmed === "true") {
    return true;
  }
  if (trimmed === "false") {
    return false;
  }
  if (trimmed === "null" || trimmed === "~") {
    return null;
  }

  const num = Number(trimmed);
  if (!Number.isNaN(num) && trimmed !== "") {
    return num;
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function parseArrayItems(
  lines: string[],
  startIdx: number
): { items: string[]; endIdx: number } {
  const items: string[] = [];
  let idx = startIdx;

  while (idx < lines.length) {
    const line = lines[idx];
    if (!line) {
      idx += 1;
      continue;
    }
    if (line.startsWith("  - ")) {
      items.push(line.slice(4).trim());
      idx += 1;
    } else if (line.startsWith("    - ")) {
      items.push(line.slice(6).trim());
      idx += 1;
    } else {
      break;
    }
  }

  return { items, endIdx: idx };
}

function parseNestedObject(
  lines: string[],
  startIdx: number
): { obj: Record<string, unknown>; endIdx: number } {
  const obj: Record<string, unknown> = {};
  let idx = startIdx;

  while (idx < lines.length) {
    const line = lines[idx];
    if (!line?.startsWith("    ")) {
      break;
    }

    const trimmed = line.trim();
    const match = trimmed.match(KEY_VALUE_REGEX);
    if (match) {
      const [, key, value] = match;
      if (key) {
        obj[key] = parseValue(value ?? "");
      }
    }
    idx += 1;
  }

  return { obj, endIdx: idx };
}

function handleNestedValue(
  key: string,
  lines: string[],
  idx: number,
  result: Record<string, unknown>
): number {
  const nextLine = lines[idx + 1] ?? "";

  if (nextLine.startsWith("  - ") || nextLine.startsWith("    - ")) {
    const { items, endIdx } = parseArrayItems(lines, idx + 1);
    result[key] = items;
    return endIdx;
  }

  if (nextLine.startsWith("    ")) {
    const { obj, endIdx } = parseNestedObject(lines, idx + 1);
    result[key] = obj;
    return endIdx;
  }

  return idx + 1;
}

function parseSimpleYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split("\n");
  let idx = 0;

  while (idx < lines.length) {
    const line = lines[idx];
    const trimmed = line?.trim();
    if (!trimmed) {
      idx += 1;
      continue;
    }

    const match = trimmed.match(KEY_VALUE_REGEX);
    if (!match) {
      idx += 1;
      continue;
    }

    const [, key, value] = match;
    if (!key) {
      idx += 1;
      continue;
    }

    if (value?.trim()) {
      result[key] = parseValue(value);
      idx += 1;
      continue;
    }

    idx = handleNestedValue(key, lines, idx, result);
  }

  return result;
}

export function parseSkillMd(content: string): ParsedSkill {
  const { data, content: instructions } = parseFrontmatter(content);
  const manifest = SkillManifestSchema.parse(data);

  return {
    manifest,
    instructions,
    resources: new Map(),
  };
}

export function validateSkillManifest(manifest: unknown): SkillManifest {
  return SkillManifestSchema.parse(manifest);
}

export function isValidSkillName(name: string): boolean {
  return SKILL_NAME_REGEX.test(name);
}
