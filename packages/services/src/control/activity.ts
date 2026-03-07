import {
  createControlActivityLog,
  type Database,
  listControlActivityLogs,
} from "@openbeam/db";

interface ActivityLogInput {
  teamId: string;
  actorType?: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  agentId?: string;
  runId?: string;
  details?: Record<string, unknown>;
}

export async function logControlActivity(
  db: Database,
  input: ActivityLogInput
) {
  return await createControlActivityLog(db, input);
}

export async function listControlActivityForTeam(
  db: Database,
  teamId: string,
  options?: {
    entityType?: string;
    entityId?: string;
    limit?: number;
    offset?: number;
  }
) {
  return await listControlActivityLogs(db, teamId, options);
}
