import { PrismaClient } from "../prisma/generated/client";
import { instrumentPrisma } from "./instrumentation";

export * from "../prisma/generated/client";

const prismaClient = new PrismaClient();

let prisma: PrismaClient;
try {
  prisma = instrumentPrisma(prismaClient);
} catch {
  prisma = prismaClient;
}

export const connectDb = async () => prisma;

export type Database = PrismaClient;

export default prisma;

// Mutations
export * from "./mutations/actions";
export * from "./mutations/ai";
export * from "./mutations/analytics";
export * from "./mutations/api-keys";
export * from "./mutations/assistants";
export * from "./mutations/audit";
export * from "./mutations/collections";
export * from "./mutations/connectors";
export * from "./mutations/enterprise";
export * from "./mutations/entities";
export * from "./mutations/exports";
export {
  bulkUpsertGroups,
  markGroupsInactive,
  updateGroupMemberCount,
  upsertGroup,
} from "./mutations/groups";
export * from "./mutations/identities";
export * from "./mutations/notifications";
export * from "./mutations/oauth";
export * from "./mutations/permission-policies";
export * from "./mutations/permissions";
export * from "./mutations/preferences";
export * from "./mutations/resources";
export * from "./mutations/sync";
export * from "./mutations/teams";
export * from "./mutations/tools";
// Queries - some have naming conflicts, use explicit exports
export * from "./queries/actions";
export * from "./queries/ai";
export * from "./queries/analytics";
export * from "./queries/api-keys";
export * from "./queries/assistants";
export * from "./queries/audit";
export * from "./queries/collections";
export * from "./queries/connectors";
export * from "./queries/enterprise";
export * from "./queries/entities";
export * from "./queries/exports";
// Re-export groups with aliases to avoid conflicts
export {
  findGroupByExternalId,
  type GroupListResult as ExternalGroupListResult,
  type GroupStats as ExternalGroupStats,
  type GroupTypeCount as ExternalGroupTypeCount,
  getGroupById,
  getGroupStats,
  getGroupTypes,
  type ListGroupsOptions as ExternalGroupListOptions,
  listGroupsByConnector,
} from "./queries/groups";
export * from "./queries/identities";
export * from "./queries/notifications";
export * from "./queries/permission-policies";
export * from "./queries/permissions";
export * from "./queries/preferences";
export * from "./queries/resources";
export * from "./queries/sync";
export * from "./queries/teams";
export * from "./queries/tools";
export * from "./queries/users";
