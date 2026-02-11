import type { MissionTemplate } from "@openplane/types/mission-control";
import { accountingTemplates } from "./accounting";
import { legalTemplates } from "./legal";
import { privateEquityTemplates } from "./private-equity";

const ALL_TEMPLATES: MissionTemplate[] = [
  ...legalTemplates,
  ...accountingTemplates,
  ...privateEquityTemplates,
];

const templateMap = new Map(ALL_TEMPLATES.map((t) => [t.id, t]));

export function getAvailableTemplates(vertical?: string): MissionTemplate[] {
  if (!vertical) {
    return ALL_TEMPLATES;
  }
  return ALL_TEMPLATES.filter((t) => t.vertical === vertical);
}

export function getTemplate(templateId: string): MissionTemplate | undefined {
  return templateMap.get(templateId);
}

export async function applyTemplate(
  db: unknown,
  missionId: string,
  template: MissionTemplate
): Promise<void> {
  const prisma = db as {
    missionAgent: {
      create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
    };
    missionTask: {
      create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
    };
  };

  for (const agentDef of template.agents) {
    await prisma.missionAgent.create({
      data: {
        missionId,
        name: agentDef.name,
        role: agentDef.role,
        soulPrompt: agentDef.soulPrompt,
      },
    });
  }

  for (const taskDef of template.tasks) {
    await prisma.missionTask.create({
      data: {
        missionId,
        title: taskDef.title,
        description: taskDef.description,
        priority: taskDef.priority,
        status: "INBOX",
        requestId: `${missionId}-${taskDef.title.toLowerCase().replace(/\s+/g, "-")}`,
      },
    });
  }
}

export { ALL_TEMPLATES };
