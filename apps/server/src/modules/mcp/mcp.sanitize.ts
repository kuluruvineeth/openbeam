import { z } from "zod";

function unwrapSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodDefault
  ) {
    return unwrapSchema(schema._def.innerType as z.ZodTypeAny);
  }
  return schema;
}

function pickKnownKeys(schema: z.ZodTypeAny, data: unknown): unknown {
  if (data == null) {
    return data;
  }

  const unwrapped = unwrapSchema(schema);

  if (unwrapped instanceof z.ZodArray && Array.isArray(data)) {
    const element = unwrapped._def.type as unknown as z.ZodTypeAny;
    return data.map((item) => pickKnownKeys(element, item));
  }

  if (
    unwrapped instanceof z.ZodObject &&
    typeof data === "object" &&
    !Array.isArray(data)
  ) {
    const shape = unwrapped.shape as Record<string, z.ZodTypeAny>;
    const src = data as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(shape)) {
      const fieldSchema = shape[key];
      if (key in src && fieldSchema) {
        out[key] = pickKnownKeys(fieldSchema, src[key]);
      }
    }
    return out;
  }

  return data;
}

export function sanitize<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.output<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  return pickKnownKeys(schema, data) as z.output<T>;
}

export function sanitizeArray<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown[]
): z.output<T>[] {
  return data.map((item) => sanitize(schema, item));
}
