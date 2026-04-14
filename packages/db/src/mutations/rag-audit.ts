import type { Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

export const createRagAuditLog = (
  db: Database,
  data: Prisma.RagAuditLogCreateInput
) => db.ragAuditLog.create({ data });
