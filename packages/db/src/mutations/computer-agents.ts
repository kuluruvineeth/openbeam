import type {
  ComputerAgentMode,
  ComputerAgentSource,
  ComputerAgentStatus,
} from "../../prisma/generated/client";
import type { Database } from "../index";

export function createComputerAgent(
  db: Database,
  data: {
    teamId: string;
    name: string;
    slug: string;
    description?: string | null;
    source: ComputerAgentSource;
    code: string;
    codeHash?: string | null;
    templateId?: string | null;
    status?: ComputerAgentStatus;
    mode?: ComputerAgentMode;
    scheduleCron?: string | null;
    config?: unknown;
    createdBy?: string | null;
  }
) {
  return db.computerAgent.create({
    data: {
      teamId: data.teamId,
      name: data.name,
      slug: data.slug,
      description: data.description,
      source: data.source,
      code: data.code,
      codeHash: data.codeHash,
      templateId: data.templateId,
      status: data.status ?? "DRAFT",
      mode: data.mode ?? "APPROVAL",
      scheduleCron: data.scheduleCron,
      config: data.config as object | undefined,
      createdBy: data.createdBy,
    },
  });
}

export function updateComputerAgent(
  db: Database,
  id: string,
  teamId: string,
  data: {
    status?: ComputerAgentStatus;
    mode?: ComputerAgentMode;
    scheduleCron?: string | null;
    config?: unknown;
    code?: string;
    codeHash?: string | null;
  }
) {
  return db.computerAgent.update({
    where: { id, teamId },
    data: {
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.mode !== undefined ? { mode: data.mode } : {}),
      ...(data.scheduleCron !== undefined
        ? { scheduleCron: data.scheduleCron }
        : {}),
      ...(data.config !== undefined ? { config: data.config as object } : {}),
      ...(data.code !== undefined ? { code: data.code } : {}),
      ...(data.codeHash !== undefined ? { codeHash: data.codeHash } : {}),
    },
  });
}

export function deleteComputerAgent(db: Database, id: string, teamId: string) {
  return db.computerAgent.delete({ where: { id, teamId } });
}
