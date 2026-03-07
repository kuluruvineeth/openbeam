import type {
  RegisteredTool,
  SkillDiscoveryInfo,
  SkillLoadResult,
} from "@openbeam/ai";
import { SkillCategorySchema, skillRegistry, toolRegistry } from "@openbeam/ai";
import { getTeamUsageSummary } from "@openbeam/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { getExternalSkillsCatalog } from "./ai.skills-catalog";
import { withActiveTeam } from "./apps/middleware";

const ToolCategorySchema = z.enum([
  "search",
  "rag",
  "documents",
  "connectors",
  "data",
  "media",
  "browser",
  "action",
  "analysis",
  "integration",
  "system",
  "skills",
]);

const loadSkillSchema = z.object({
  name: z.string().min(1).max(100),
  injectIntoContext: z.boolean().default(false),
});

const loadSkillsByKeywordSchema = z.object({
  keyword: z.string().min(1).max(100),
});

const loadSkillsByCategorySchema = z.object({
  category: SkillCategorySchema,
});

const usagePeriodSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

const listToolsSchema = z.object({
  category: ToolCategorySchema.optional(),
  includeDeferred: z.boolean().default(false),
});

export const aiRouter = createTRPCRouter({
  skills: createTRPCRouter({
    catalog: withActiveTeam.query(async () => getExternalSkillsCatalog()),

    list: withActiveTeam.query(() => {
      const skills = skillRegistry.getDiscoveryInfo();
      return {
        skills,
        total: skills.length,
        loaded: skills.filter((s: SkillDiscoveryInfo) => s.isLoaded).length,
      };
    }),

    get: withActiveTeam
      .input(z.object({ name: z.string() }))
      .query(({ input }) => {
        const skill = skillRegistry.get(input.name);

        if (!skill) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Skill not found: ${input.name}`,
          });
        }

        return {
          name: skill.manifest.name,
          description: skill.manifest.description,
          category: skill.manifest.category,
          version: skill.manifest.version,
          triggers: skill.manifest.triggers,
          tools: skill.manifest.tools,
          resources: skill.manifest.resources,
          isLoaded: skill.isLoaded,
          loadedAt: skill.loadedAt,
        };
      }),

    load: withActiveTeam.input(loadSkillSchema).mutation(async ({ input }) => {
      const result = await skillRegistry.load(input.name, {
        injectIntoContext: input.injectIntoContext,
      });

      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Skill not found: ${input.name}`,
        });
      }

      return {
        name: result.skill.manifest.name,
        enabledTools: result.enabledTools,
        instructions: result.skill.instructions.slice(0, 500),
      };
    }),

    loadByKeyword: withActiveTeam
      .input(loadSkillsByKeywordSchema)
      .mutation(async ({ input }) => {
        const results = await skillRegistry.loadByKeyword(input.keyword);

        return {
          loaded: results.map((r: SkillLoadResult) => ({
            name: r.skill.manifest.name,
            enabledTools: r.enabledTools,
          })),
          count: results.length,
        };
      }),

    loadByCategory: withActiveTeam
      .input(loadSkillsByCategorySchema)
      .mutation(async ({ input }) => {
        const results = await skillRegistry.loadByCategory(input.category);

        return {
          loaded: results.map((r: SkillLoadResult) => ({
            name: r.skill.manifest.name,
            enabledTools: r.enabledTools,
          })),
          count: results.length,
        };
      }),

    unload: withActiveTeam
      .input(z.object({ name: z.string() }))
      .mutation(({ input }) => {
        const success = skillRegistry.unload(input.name);

        if (!success) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Skill not found or not loaded: ${input.name}`,
          });
        }

        return { success: true };
      }),

    getInstructions: withActiveTeam
      .input(z.object({ name: z.string() }))
      .query(({ input }) => {
        const instructions = skillRegistry.getInstructions(input.name);

        if (instructions === null) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Skill not found or not loaded: ${input.name}`,
          });
        }

        return { instructions };
      }),

    getAllLoadedInstructions: withActiveTeam.query(() => {
      const instructions = skillRegistry.getAllLoadedInstructions();
      const loadedNames = skillRegistry.getLoadedSkillNames();

      return {
        instructions,
        loadedSkills: loadedNames,
        count: loadedNames.length,
      };
    }),
  }),

  tools: createTRPCRouter({
    list: withActiveTeam.input(listToolsSchema).query(({ input }) => {
      let tools = toolRegistry.getAll();

      if (input.category) {
        tools = toolRegistry.getByCategory(input.category);
      }

      if (!input.includeDeferred) {
        tools = tools.filter((t: RegisteredTool) => !t.metadata.deferLoading);
      }

      return {
        tools: tools.map((t: RegisteredTool) => ({
          name: t.metadata.name,
          description: t.metadata.description,
          category: t.metadata.category,
          requiredPermissions: t.metadata.requiredPermissions,
          deferLoading: t.metadata.deferLoading,
        })),
        total: tools.length,
      };
    }),

    get: withActiveTeam
      .input(z.object({ name: z.string() }))
      .query(({ input }) => {
        const tool = toolRegistry.get(input.name);

        if (!tool) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Tool not found: ${input.name}`,
          });
        }

        return {
          name: tool.metadata.name,
          description: tool.metadata.description,
          category: tool.metadata.category,
          requiredPermissions: tool.metadata.requiredPermissions,
          deferLoading: tool.metadata.deferLoading,
        };
      }),

    listBySkill: withActiveTeam.query(() => {
      const enabledTools = skillRegistry.getAllEnabledTools();
      const loadedSkills = skillRegistry.getLoadedSkillNames();

      return {
        enabledTools,
        loadedSkills,
        count: enabledTools.length,
      };
    }),

    categories: withActiveTeam.query(() => {
      const tools = toolRegistry.getAll();
      const categoryCount = new Map<string, number>();

      for (const tool of tools) {
        const count = categoryCount.get(tool.metadata.category) ?? 0;
        categoryCount.set(tool.metadata.category, count + 1);
      }

      return {
        categories: Array.from(categoryCount.entries()).map(
          ([category, count]) => ({
            category,
            count,
          })
        ),
      };
    }),
  }),

  usage: createTRPCRouter({
    getSummary: withActiveTeam
      .input(usagePeriodSchema)
      .query(async ({ ctx, input }) => {
        const summary = await getTeamUsageSummary(
          ctx.prisma,
          ctx.teamId,
          new Date(input.startDate),
          new Date(input.endDate)
        );

        return summary;
      }),

    getDaily: withActiveTeam
      .input(
        z.object({
          days: z.number().min(1).max(90).default(30),
        })
      )
      .query(async ({ ctx, input }) => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);

        const summary = await getTeamUsageSummary(
          ctx.prisma,
          ctx.teamId,
          startDate,
          endDate
        );

        return {
          ...summary,
          period: {
            ...summary.period,
            days: input.days,
          },
        };
      }),
  }),

  info: withActiveTeam.query(() => {
    const toolCount = toolRegistry.size();
    const skillCount = skillRegistry.size();
    const loadedSkillCount = skillRegistry.loadedCount();
    const toolMetadata = toolRegistry.getAllMetadata();

    const categoryBreakdown = new Map<string, number>();
    for (const meta of toolMetadata) {
      const count = categoryBreakdown.get(meta.category) ?? 0;
      categoryBreakdown.set(meta.category, count + 1);
    }

    return {
      tools: {
        total: toolCount,
        byCategory: Object.fromEntries(categoryBreakdown),
      },
      skills: {
        total: skillCount,
        loaded: loadedSkillCount,
      },
    };
  }),
});
