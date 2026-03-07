import type { Context, Next } from "hono";
import { z } from "zod";
import { extractAuthToken, safeTokenEqual } from "./http";

export interface SandboxAuthVariables {
  teamId: string;
}

const GLOBAL_TEAM_SCOPE = "*";
const TEAM_SCOPE_HEADER = "x-openbeam-team-id";
const TEAM_ID_SCHEMA = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/);

export function getGlobalTeamScope(): string {
  return GLOBAL_TEAM_SCOPE;
}

export function isGlobalTeamScope(teamId: string): boolean {
  return teamId === GLOBAL_TEAM_SCOPE;
}

function requireTeamScope(): boolean {
  return process.env.SANDBOX_REQUIRE_TEAM_ID !== "false";
}

function resolveTeamScope(c: Context): { ok: true; teamId: string } | Response {
  const rawTeamId = c.req.header(TEAM_SCOPE_HEADER)?.trim();
  if (!rawTeamId) {
    if (requireTeamScope()) {
      return c.json(
        {
          error: "MISSING_TEAM_SCOPE",
          message: `${TEAM_SCOPE_HEADER} header is required`,
        },
        400
      );
    }
    return { ok: true, teamId: GLOBAL_TEAM_SCOPE };
  }

  const parsedTeamId = TEAM_ID_SCHEMA.safeParse(rawTeamId);
  if (!parsedTeamId.success) {
    return c.json(
      {
        error: "INVALID_TEAM_SCOPE",
        details: parsedTeamId.error.issues,
      },
      400
    );
  }

  return {
    ok: true,
    teamId: parsedTeamId.data,
  };
}

export async function requireSandboxAuth(
  c: Context<{ Variables: SandboxAuthVariables }>,
  next: Next
): Promise<Response | undefined> {
  const expectedToken = process.env.SANDBOX_API_TOKEN;
  if (!expectedToken) {
    const teamScope = resolveTeamScope(c);
    if (teamScope instanceof Response) {
      return teamScope;
    }

    c.set("teamId", teamScope.teamId);
    await next();
    return;
  }

  const providedToken = extractAuthToken(c);
  if (!(providedToken && safeTokenEqual(providedToken, expectedToken))) {
    return c.json({ error: "UNAUTHORIZED" }, 401);
  }

  const teamScope = resolveTeamScope(c);
  if (teamScope instanceof Response) {
    return teamScope;
  }

  c.set("teamId", teamScope.teamId);
  await next();
  return;
}
