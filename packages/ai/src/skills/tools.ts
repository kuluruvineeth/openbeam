import { z } from "zod";
import { defineTool, failure, success } from "../tools/builder";
import { SkillCategorySchema } from "./manifest";
import { skillRegistry } from "./registry";

export const loadSkillTool = defineTool({
  name: "load_skill",
  description: `Load a skill to enable specialized capabilities and tools.
Use when you need domain-specific functionality for tasks like:
- search: Enterprise search across data sources
- rag: Retrieval-augmented generation for Q&A
- documents: Document management and analysis
- connectors: Integration management
- analysis: Data analysis and insights`,
  category: "system",
  deferLoading: false,
  searchKeywords: ["skill", "load", "enable", "capability", "activate"],

  parameters: z.object({
    skillName: z
      .string()
      .describe("Name of the skill to load (e.g., 'search', 'rag')"),
  }),

  async execute(params, _ctx) {
    const result = await skillRegistry.load(params.skillName);

    if (!result) {
      return failure("NOT_FOUND", `Skill '${params.skillName}' not found`);
    }

    return success({
      name: result.skill.manifest.name,
      description: result.skill.manifest.description,
      category: result.skill.manifest.category,
      instructions: result.skill.instructions,
      enabledTools: result.enabledTools,
      loaded: true,
    });
  },
});

export const listSkillsTool = defineTool({
  name: "list_skills",
  description: `List available skills and their capabilities.
Use to discover what specialized skills are available before loading them.
Returns skill names, descriptions, categories, and keywords.`,
  category: "system",
  deferLoading: false,
  searchKeywords: ["skills", "list", "available", "discover", "capabilities"],

  parameters: z.object({
    category: SkillCategorySchema.optional().describe(
      "Filter by skill category"
    ),
    keyword: z.string().optional().describe("Search skills by keyword"),
    loadedOnly: z
      .boolean()
      .optional()
      .default(false)
      .describe("Only show loaded skills"),
  }),

  execute(params, _ctx) {
    let skills = skillRegistry.getDiscoveryInfo();

    if (params.category) {
      skills = skills.filter((s) => s.category === params.category);
    }

    if (params.keyword) {
      const keyword = params.keyword.toLowerCase();
      skills = skills.filter(
        (s) =>
          s.name.toLowerCase().includes(keyword) ||
          s.description.toLowerCase().includes(keyword) ||
          s.keywords.some((k) => k.toLowerCase().includes(keyword))
      );
    }

    if (params.loadedOnly) {
      skills = skills.filter((s) => s.isLoaded);
    }

    return Promise.resolve(
      success({
        skills: skills.map((s) => ({
          name: s.name,
          description: s.description,
          category: s.category,
          keywords: s.keywords,
          tools: s.tools,
          isLoaded: s.isLoaded,
        })),
        total: skills.length,
        loadedCount: skills.filter((s) => s.isLoaded).length,
      })
    );
  },
});

export const unloadSkillTool = defineTool({
  name: "unload_skill",
  description: `Unload a skill to free up context space.
Use when you no longer need a skill's capabilities.
Unloading disables the skill's tools and removes its instructions.`,
  category: "system",
  deferLoading: false,
  searchKeywords: ["skill", "unload", "disable", "remove", "deactivate"],

  parameters: z.object({
    skillName: z.string().describe("Name of the skill to unload"),
  }),

  execute(params, _ctx) {
    const unloaded = skillRegistry.unload(params.skillName);

    if (!unloaded) {
      return Promise.resolve(
        failure(
          "NOT_FOUND",
          `Skill '${params.skillName}' not found or not loaded`
        )
      );
    }

    return Promise.resolve(
      success({
        skillName: params.skillName,
        unloaded: true,
        remainingLoaded: skillRegistry.getLoadedSkillNames(),
      })
    );
  },
});

export const getSkillResourceTool = defineTool({
  name: "get_skill_resource",
  description: `Get a resource file from a loaded skill.
Use to access templates, scripts, or configuration files bundled with a skill.
The skill must be loaded first.`,
  category: "system",
  deferLoading: false,
  searchKeywords: ["skill", "resource", "template", "file", "get"],

  parameters: z.object({
    skillName: z.string().describe("Name of the loaded skill"),
    resourceName: z.string().describe("Name of the resource to retrieve"),
  }),

  execute(params, _ctx) {
    const skill = skillRegistry.get(params.skillName);

    if (!skill) {
      return Promise.resolve(
        failure("NOT_FOUND", `Skill '${params.skillName}' not found`)
      );
    }

    if (!skill.isLoaded) {
      return Promise.resolve(
        failure(
          "INVALID_STATE",
          `Skill '${params.skillName}' is not loaded. Load it first.`
        )
      );
    }

    const resource = skill.resources.get(params.resourceName);

    if (!resource) {
      const availableResources = Array.from(skill.resources.keys());
      return Promise.resolve(
        failure(
          "NOT_FOUND",
          `Resource '${params.resourceName}' not found in skill '${params.skillName}'`,
          { details: { availableResources } }
        )
      );
    }

    return Promise.resolve(
      success({
        skillName: params.skillName,
        resourceName: params.resourceName,
        content: resource,
      })
    );
  },
});

export const getSkillInstructionsTool = defineTool({
  name: "get_skill_instructions",
  description: `Get the detailed instructions for loaded skills.
Use to retrieve context and guidance for using skill capabilities.
Returns instructions for one or all loaded skills.`,
  category: "system",
  deferLoading: false,
  searchKeywords: ["skill", "instructions", "context", "guidance", "help"],

  parameters: z.object({
    skillName: z
      .string()
      .optional()
      .describe("Specific skill name, or omit for all loaded skills"),
  }),

  execute(
    params,
    _ctx
  ): Promise<
    | ReturnType<
        typeof success<{
          skillName?: string;
          loadedSkills?: string[];
          instructions: string;
        }>
      >
    | ReturnType<typeof failure>
  > {
    if (params.skillName) {
      const instructions = skillRegistry.getInstructions(params.skillName);

      if (!instructions) {
        return Promise.resolve(
          failure(
            "NOT_FOUND",
            `Skill '${params.skillName}' not found or not loaded`
          )
        );
      }

      return Promise.resolve(
        success({
          skillName: params.skillName,
          instructions,
        })
      );
    }

    const allInstructions = skillRegistry.getAllLoadedInstructions();
    const loadedSkills = skillRegistry.getLoadedSkillNames();

    return Promise.resolve(
      success({
        loadedSkills,
        instructions: allInstructions,
      })
    );
  },
});

export function registerSkillTools(): void {
  loadSkillTool.register();
  listSkillsTool.register();
  unloadSkillTool.register();
  getSkillResourceTool.register();
  getSkillInstructionsTool.register();
}

export const skillTools = {
  loadSkill: loadSkillTool,
  listSkills: listSkillsTool,
  unloadSkill: unloadSkillTool,
  getSkillResource: getSkillResourceTool,
  getSkillInstructions: getSkillInstructionsTool,
};
