import type { Context } from "hono";
import type { SandboxProvider } from "../types";
import type { SandboxAuthVariables } from "./auth";
import { isGlobalTeamScope } from "./auth";
import { getSandboxOwnerTeamId, setSandboxOwnerTeamId } from "./ownership";

export async function authorizeSandboxAccess(
  c: Context<{ Variables: SandboxAuthVariables }>,
  provider: SandboxProvider,
  sandboxId: string
): Promise<Response | null> {
  const teamId = c.get("teamId");
  if (isGlobalTeamScope(teamId)) {
    return null;
  }

  const ownedTeamId = await getSandboxOwnerTeamId(provider.type, sandboxId);
  if (ownedTeamId) {
    if (ownedTeamId === teamId) {
      return null;
    }
    return c.json({ error: "SANDBOX_NOT_FOUND" }, 404);
  }

  const sandboxes = await provider.list(teamId);
  const owned = sandboxes.some((sandbox) => sandbox.id === sandboxId);
  if (owned) {
    await setSandboxOwnerTeamId(provider.type, sandboxId, teamId);
    return null;
  }

  return c.json({ error: "SANDBOX_NOT_FOUND" }, 404);
}
