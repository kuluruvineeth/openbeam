/**
 * Apps Router Middleware
 *
 * Re-exports shared middleware and adds app-specific helpers
 */

import { type Database, verifyConnectorOwnership } from "@openplane/db";
import { TRPCError } from "@trpc/server";

// Re-export shared middleware
export {
  type ContextWithTeam,
  type ContextWithTeamRole,
  getAccessControlIds,
  withActiveTeam,
  withAdmin,
  withManager,
  withMember,
  withOwner,
} from "../../middleware";

/**
 * Verify connector belongs to team
 */
export async function verifyConnectorAccess(
  prisma: Database,
  connectorId: string,
  teamId: string
) {
  const connector = await verifyConnectorOwnership(prisma, connectorId, teamId);

  if (!connector) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Connector not found or unauthorized",
    });
  }

  return connector;
}

/**
 * Verify tool belongs to team
 */
export async function verifyToolAccess(
  prisma: Database,
  toolId: string,
  teamId: string
) {
  const tool = await prisma.tool.findFirst({
    where: { id: toolId, teamId },
    include: { connector: true },
  });

  if (!tool) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Tool not found or unauthorized",
    });
  }

  return tool;
}
