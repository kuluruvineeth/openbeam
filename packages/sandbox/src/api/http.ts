import { timingSafeEqual } from "node:crypto";
import type { Context } from "hono";
import { ZodError, type ZodType, z } from "zod";
import type { SandboxProviderType } from "../types";

const SandboxIdSchema = z.string().min(1).max(200);
const ProviderTypeSchema = z.enum(["daytona", "local"]);
const AUTH_SPLIT_REGEX = /\s+/;

type ParseOk<T> = { ok: true; data: T };
type ParseError = { ok: false; response: Response };
export type ParseResult<T> = ParseOk<T> | ParseError;

export async function parseJsonBody<T>(
  c: Context,
  schema: ZodType<T>
): Promise<ParseResult<T>> {
  try {
    const body = await c.req.json();
    const parsed = schema.safeParse(body);
    if (parsed.success) {
      return { ok: true, data: parsed.data };
    }
    return {
      ok: false,
      response: c.json(
        {
          error: "INVALID_REQUEST",
          details: parsed.error.issues,
        },
        400
      ),
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        ok: false,
        response: c.json(
          {
            error: "INVALID_REQUEST",
            details: error.issues,
          },
          400
        ),
      };
    }

    return {
      ok: false,
      response: c.json({ error: "INVALID_JSON" }, 400),
    };
  }
}

export function parseSandboxId(c: Context): ParseResult<string> {
  const parsed = SandboxIdSchema.safeParse(c.req.param("sandboxId"));
  if (!parsed.success) {
    return {
      ok: false,
      response: c.json(
        {
          error: "INVALID_SANDBOX_ID",
          details: parsed.error.issues,
        },
        400
      ),
    };
  }

  return { ok: true, data: parsed.data };
}

export function parseProviderQuery(
  c: Context
): ParseResult<SandboxProviderType | undefined> {
  const raw = c.req.query("provider");
  if (!raw) {
    return { ok: true, data: undefined };
  }

  const parsed = ProviderTypeSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: c.json(
        {
          error: "INVALID_PROVIDER",
          details: parsed.error.issues,
        },
        400
      ),
    };
  }

  return { ok: true, data: parsed.data };
}

export function getDefaultProviderType(): SandboxProviderType {
  const raw = process.env.SANDBOX_DEFAULT_PROVIDER;
  if (!raw) {
    return "daytona";
  }

  const parsed = ProviderTypeSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }

  return "daytona";
}

export function extractAuthToken(c: Context): string | undefined {
  const explicit = c.req.header("x-openplane-sandbox-token");
  if (explicit) {
    return explicit;
  }

  const authorization = c.req.header("authorization");
  if (!authorization) {
    return;
  }

  const [scheme, value] = authorization.split(AUTH_SPLIT_REGEX, 2);
  if (scheme?.toLowerCase() !== "bearer" || !value) {
    return;
  }

  return value;
}

export function safeTokenEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}
