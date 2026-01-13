import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const preferencesGetTool = defineTool({
  name: "preferences_get",
  description: `Get the current user's search and display preferences.

USE THIS WHEN:
- User asks "What are my preferences?" or "Show my settings"
- Before personalizing search results based on user preferences
- Debugging why certain results are prioritized or excluded
- Understanding current personalization settings

DO NOT USE WHEN:
- User wants to change preferences (use preferences_update)
- Looking for team-wide settings (those are admin-only)

RETURNS: User preferences including preferred/excluded sources, default limits, date range defaults, and display mode.`,
  category: "system",
  deferLoading: true,
  searchKeywords: ["preferences", "settings", "config", "personalization"],
  requiredPermissions: ["preferences:read"],

  parameters: z.object({}),

  async execute(_params, ctx) {
    const startTime = performance.now();

    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    if (!ctx.userId) {
      return failure(
        "UNAUTHORIZED",
        "User context required to get preferences"
      );
    }

    const preferences = await ctx.services.preferences.get(
      ctx.userId,
      ctx.teamId
    );

    return success(
      {
        preferences: {
          preferredSources: preferences.preferredSources,
          excludedSources: preferences.excludedSources,
          defaultSearchLimit: preferences.defaultSearchLimit,
          dateRangeDefault: preferences.dateRangeDefault ?? "all",
          resultDisplayMode: preferences.resultDisplayMode,
        },
        summary: {
          hasPreferredSources: preferences.preferredSources.length > 0,
          hasExcludedSources: preferences.excludedSources.length > 0,
          isCustomized:
            preferences.preferredSources.length > 0 ||
            preferences.excludedSources.length > 0 ||
            preferences.defaultSearchLimit !== 10,
        },
      },
      { latencyMs: performance.now() - startTime, source: "database" }
    );
  },
});
