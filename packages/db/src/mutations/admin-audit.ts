import type { Database } from "../index";

interface CreateAuditLogInput {
  teamId: string;
  userId: string;
  action: string;
  category: string;
  target?: string;
  metadata?: Record<string, unknown>;
}

export function createAdminAuditLog(db: Database, input: CreateAuditLogInput) {
  return db.auditLog.create({ data: input });
}
