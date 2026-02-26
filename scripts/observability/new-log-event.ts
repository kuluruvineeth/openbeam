#!/usr/bin/env bun

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { z } from "zod";

const usage = `Usage:
  bun run observability:new-log-event -- --event <event_name> --fields <name:type,name:type> [--level <info|warn|error|debug>] [--out <file>] [--message <default_message>] [--function <fnName>]

Field types:
  string | number | boolean

Example:
  bun run observability:new-log-event -- --event connector_sync_failed --fields connector_id:string,team_id:string,error_code:string --level error --out packages/services/src/observability/log-connector-sync-failed.ts
`;

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const parsed: Record<string, string | boolean> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const withoutPrefix = token.slice(2);
    const eqIndex = withoutPrefix.indexOf("=");

    if (eqIndex >= 0) {
      const key = withoutPrefix.slice(0, eqIndex);
      const value = withoutPrefix.slice(eqIndex + 1);
      parsed[key] = value;
      continue;
    }

    const key = withoutPrefix;
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = next;
    index += 1;
  }

  return parsed;
}

function toPascalCase(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .split("_")
    .filter(Boolean)
    .map(
      (segment) =>
        segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase()
    )
    .join("");
}

type FieldType = "string" | "number" | "boolean";

const fieldTypeSchema = z.enum(["string", "number", "boolean"]);
const fieldNameSchema = z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/);

const argsSchema = z.object({
  event: z.string().regex(/^[a-z0-9_]+$/),
  fields: z.string().min(1),
  level: z.enum(["info", "warn", "error", "debug"]).default("info"),
  out: z.string().optional(),
  message: z.string().optional(),
  function: z
    .string()
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/)
    .optional(),
});

async function main(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2));
  if (cli.help === true) {
    console.log(usage);
    process.exit(0);
  }

  const parsedArgs = argsSchema.safeParse({
    event: cli.event,
    fields: cli.fields,
    level: typeof cli.level === "string" ? cli.level : "info",
    out: typeof cli.out === "string" ? cli.out : undefined,
    message: typeof cli.message === "string" ? cli.message : undefined,
    function: typeof cli.function === "string" ? cli.function : undefined,
  });

  if (!parsedArgs.success) {
    console.error(
      parsedArgs.error.issues.map((issue) => issue.message).join("\n")
    );
    console.error(`\n${usage}`);
    process.exit(1);
  }

  const input = parsedArgs.data;
  const fieldSpecs = input.fields
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (fieldSpecs.length === 0) {
    console.error("At least one field is required.");
    process.exit(1);
  }

  const parsedFields: Array<{ name: string; type: FieldType }> = [];
  for (const spec of fieldSpecs) {
    const [rawName, rawType] = spec.split(":");
    const name = rawName?.trim() ?? "";
    const type = (rawType?.trim() ?? "string") as FieldType;

    const validName = fieldNameSchema.safeParse(name);
    if (!validName.success) {
      console.error(`Invalid field name "${name}".`);
      process.exit(1);
    }

    const validType = fieldTypeSchema.safeParse(type);
    if (!validType.success) {
      console.error(`Invalid field type "${type}" for field "${name}".`);
      process.exit(1);
    }

    parsedFields.push({ name, type });
  }

  const duplicates = parsedFields.filter(
    (field, index, all) =>
      all.findIndex((entry) => entry.name === field.name) !== index
  );
  if (duplicates.length > 0) {
    console.error(
      `Duplicate field names: ${duplicates.map((field) => field.name).join(", ")}`
    );
    process.exit(1);
  }

  const eventPascal = toPascalCase(input.event);
  const schemaName = `${eventPascal}PayloadSchema`;
  const typeName = `${eventPascal}Payload`;
  const functionName = input.function ?? `log${eventPascal}`;
  const defaultMessage = input.message ?? input.event;

  const zodTypeMap: Record<FieldType, string> = {
    string: "z.string()",
    number: "z.number()",
    boolean: "z.boolean()",
  };

  const fieldLines = parsedFields.map(
    (field) => `  ${field.name}: ${zodTypeMap[field.type]},`
  );

  const output = `import type { Logger } from "pino";
import { z } from "zod";

export const ${schemaName} = z.object({
${fieldLines.join("\n")}
});

export type ${typeName} = z.infer<typeof ${schemaName}>;

export function ${functionName}(
  logger: Logger,
  payload: ${typeName},
  message = "${defaultMessage}"
): void {
  const parsed = ${schemaName}.parse(payload);
  logger.${input.level}(
    {
      event: "${input.event}",
      ...parsed,
    },
    message
  );
}
`;

  if (input.out) {
    const absolute = resolve(process.cwd(), input.out);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, output, "utf8");
    console.log(`Log helper written: ${input.out}`);
  } else {
    console.log(output);
  }

  console.error(
    `Next step: import \`${functionName}\` in the relevant service module.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
