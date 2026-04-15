import type { Prisma, ResearchStatus } from "../../prisma/generated/client";
import type { Database } from "../index";

export function createResearchSession(
  db: Database,
  data: Prisma.ResearchSessionUncheckedCreateInput
) {
  return db.researchSession.create({ data });
}

export function updateResearchSession(
  db: Database,
  id: string,
  data: {
    status?: ResearchStatus;
    report?: string;
    plan?: Prisma.InputJsonValue;
    progress?: number;
    error?: string;
    tokenUsage?: Prisma.InputJsonValue;
  }
) {
  return db.researchSession.update({ where: { id }, data });
}

export function addResearchEvidence(
  db: Database,
  data: Prisma.ResearchEvidenceUncheckedCreateInput
) {
  return db.researchEvidence.create({ data });
}

export function addResearchEvidenceBatch(
  db: Database,
  items: Prisma.ResearchEvidenceUncheckedCreateInput[]
) {
  return db.researchEvidence.createMany({ data: items });
}
