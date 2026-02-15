import type { Database } from "@openplane/db";
import {
  createMissionTemplateAgent,
  createMissionTemplateTask,
} from "@openplane/db";
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
  db: Database,
  missionId: string,
  template: MissionTemplate,
  options: {
    createdById: string;
    agentIdsByName: Record<string, string>;
  }
): Promise<void> {
  for (const agentDef of template.agents) {
    const agentId = options.agentIdsByName[agentDef.name];
    if (!agentId) {
      throw new Error(
        `Missing agentId mapping for template agent '${agentDef.name}'`
      );
    }

    await createMissionTemplateAgent(db, {
      missionId,
      agentId,
      name: agentDef.name,
      role: agentDef.role,
      soulPrompt: agentDef.soulPrompt,
    });
  }

  for (const taskDef of template.tasks) {
    await createMissionTemplateTask(db, {
      missionId,
      title: taskDef.title,
      description: taskDef.description,
      priority: taskDef.priority,
      requestId: `${missionId}-${taskDef.title.toLowerCase().replace(/\s+/g, "-")}`,
      createdById: options.createdById,
    });
  }
}

export { ALL_TEMPLATES };
