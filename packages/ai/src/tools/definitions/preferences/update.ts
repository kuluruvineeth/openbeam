import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

interface PreferenceState {
  preferredSources?: string[];
  excludedSources?: string[];
  defaultSearchLimit?: number;
  dateRangeDefault?: string;
  resultDisplayMode?: string;
}

function detectChanges(
  params: PreferenceState,
  current: PreferenceState
): string[] {
  const changes: string[] = [];

  if (
    params.preferredSources !== undefined &&
    JSON.stringify(params.preferredSources) !==
      JSON.stringify(current.preferredSources)
  ) {
    const value =
      params.preferredSources.length > 0
        ? params.preferredSources.join(", ")
        : "none";
    changes.push(`Preferred sources: ${value}`);
  }

  if (
    params.excludedSources !== undefined &&
    JSON.stringify(params.excludedSources) !==
      JSON.stringify(current.excludedSources)
  ) {
    const value =
      params.excludedSources.length > 0
        ? params.excludedSources.join(", ")
        : "none";
    changes.push(`Excluded sources: ${value}`);
  }

  if (
    params.defaultSearchLimit !== undefined &&
    params.defaultSearchLimit !== current.defaultSearchLimit
  ) {
    changes.push(`Default limit: ${params.defaultSearchLimit}`);
  }

  if (
    params.dateRangeDefault !== undefined &&
    params.dateRangeDefault !== current.dateRangeDefault
  ) {
    changes.push(`Date range default: ${params.dateRangeDefault}`);
  }

  if (
    params.resultDisplayMode !== undefined &&
    params.resultDisplayMode !== current.resultDisplayMode
  ) {
    changes.push(`Display mode: ${params.resultDisplayMode}`);
  }

  return changes;
}

function hasAnyChange(params: PreferenceState): boolean {
  return (
    params.preferredSources !== undefined ||
    params.excludedSources !== undefined ||
    params.defaultSearchLimit !== undefined ||
    params.dateRangeDefault !== undefined ||
    params.resultDisplayMode !== undefined
  );
}

export const preferencesUpdateTool = defineTool({
  name: "preferences_update",
  description: `Update the current user's search and display preferences.

USE THIS WHEN:
- User explicitly asks "Prioritize Slack results" or "Exclude Notion from search"
- User wants to change default search behavior
- User wants to set a preferred display mode
- User wants to customize their search experience

DO NOT USE WHEN:
- User just wants to view preferences (use preferences_get)
- User wants one-time filter (just use filter params in search)
- Changes would affect team settings (admin-only)

IMPORTANT: Changes affect future searches. Provide clear feedback about what changed.

RETURNS: Updated preferences after changes are applied.`,
  category: "system",
  deferLoading: true,
  searchKeywords: [
    "preferences",
    "settings",
    "configure",
    "personalize",
    "customize",
  ],
  requiredPermissions: ["preferences:write"],

  parameters: z.object({
    preferredSources: z
      .array(z.string())
      .optional()
      .describe(
        "Connector types to prioritize in results. Valid values: 'slack', 'notion', 'linear', 'jira', 'github', 'google-drive', 'confluence'."
      ),
    excludedSources: z
      .array(z.string())
      .optional()
      .describe(
        "Connector types to exclude from results. Same valid values as preferredSources."
      ),
    defaultSearchLimit: z
      .number()
      .min(5)
      .max(100)
      .optional()
      .describe("Default number of results to return (5-100)."),
    dateRangeDefault: z
      .enum(["day", "week", "month", "year", "all"])
      .optional()
      .describe(
        "Default date range filter for searches. 'all' means no date filter."
      ),
    resultDisplayMode: z
      .enum(["compact", "detailed"])
      .optional()
      .describe(
        "'compact' shows title and snippet, 'detailed' includes metadata."
      ),
  }),

  async execute(params, ctx) {
    const startTime = performance.now();

    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    if (!ctx.userId) {
      return failure(
        "UNAUTHORIZED",
        "User context required to update preferences"
      );
    }

    if (!hasAnyChange(params)) {
      return failure(
        "INVALID_INPUT",
        "No preference changes specified. Provide at least one preference to update."
      );
    }

    const currentPrefs = await ctx.services.preferences.get(
      ctx.userId,
      ctx.teamId
    );

    const updatedPrefs = await ctx.services.preferences.update(
      ctx.userId,
      ctx.teamId,
      {
        preferredSources: params.preferredSources,
        excludedSources: params.excludedSources,
        defaultSearchLimit: params.defaultSearchLimit,
        dateRangeDefault: params.dateRangeDefault,
        resultDisplayMode: params.resultDisplayMode,
      }
    );

    const changes = detectChanges(params, currentPrefs);
    const message =
      changes.length > 0
        ? `Updated ${changes.length} preference(s)`
        : "No changes made";

    return success(
      {
        preferences: {
          preferredSources: updatedPrefs.preferredSources,
          excludedSources: updatedPrefs.excludedSources,
          defaultSearchLimit: updatedPrefs.defaultSearchLimit,
          dateRangeDefault: updatedPrefs.dateRangeDefault ?? "all",
          resultDisplayMode: updatedPrefs.resultDisplayMode,
        },
        changes,
        message,
      },
      { latencyMs: performance.now() - startTime, source: "database" }
    );
  },
});
