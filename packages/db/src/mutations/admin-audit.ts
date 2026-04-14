import type { Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

export function createAdminAuditLog(
  db: Database,
  data: Prisma.AuditLogUncheckedCreateInput
) {
  return db.auditLog.create({ data });
}
