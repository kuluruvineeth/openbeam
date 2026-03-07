import { z } from "zod";

export const HomeTabStateSchema = z.object({
  userId: z.string(),
  teamId: z.string(),
  connectorId: z.string(),
  recentSearches: z
    .array(
      z.object({
        query: z.string(),
        timestamp: z.number(),
        resultCount: z.number().optional(),
      })
    )
    .default([]),
  savedItems: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        url: z.string().optional(),
        savedAt: z.number(),
        documentType: z.string().optional(),
        source: z.string().optional(),
      })
    )
    .default([]),
  preferences: z
    .object({
      showRecentSearches: z.boolean().default(true),
      showSavedItems: z.boolean().default(true),
      showQuickActions: z.boolean().default(true),
      defaultSearchScope: z.enum(["all", "slack", "files"]).default("all"),
    })
    .default({
      showRecentSearches: true,
      showSavedItems: true,
      showQuickActions: true,
      defaultSearchScope: "all",
    }),
  lastVisited: z.number().optional(),
});

export type HomeTabState = z.infer<typeof HomeTabStateSchema>;

export interface RecentSearch {
  query: string;
  timestamp: number;
  resultCount?: number;
}

export interface SavedItem {
  id: string;
  title: string;
  url?: string;
  savedAt: number;
  documentType?: string;
  source?: string;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  actionId: string;
  description?: string;
}

export interface HomeTabContent {
  greeting: string;
  recentSearches: RecentSearch[];
  savedItems: SavedItem[];
  quickActions: QuickAction[];
  tips: string[];
}

export const HOME_CALLBACK_IDS = {
  SEARCH_INPUT: "home_search_input",
  QUICK_ACTION: "home_quick_action",
  CLEAR_RECENT: "home_clear_recent",
  REMOVE_SAVED: "home_remove_saved",
  SETTINGS: "home_settings",
  REFRESH: "home_refresh",
  CONFIGURE_DIGEST: "home_configure_digest",
  VIEW_ALL_SAVED: "home_view_all_saved",
} as const;

export const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    id: "search_all",
    label: "Search everything",
    icon: "🔍",
    actionId: `${HOME_CALLBACK_IDS.QUICK_ACTION}_search_all`,
    description: "Search across all connected sources",
  },
  {
    id: "ask_question",
    label: "Ask a question",
    icon: "💬",
    actionId: `${HOME_CALLBACK_IDS.QUICK_ACTION}_ask_question`,
    description: "Get AI-powered answers",
  },
  {
    id: "configure_digest",
    label: "Set up digest",
    icon: "📰",
    actionId: HOME_CALLBACK_IDS.CONFIGURE_DIGEST,
    description: "Configure your daily summary",
  },
  {
    id: "view_connectors",
    label: "Connected apps",
    icon: "🔗",
    actionId: `${HOME_CALLBACK_IDS.QUICK_ACTION}_view_connectors`,
    description: "Manage your integrations",
  },
];

export const TIPS = [
  "Use `/openbeam search <query>` to search from anywhere",
  "@mention OpenBeam in any channel to ask questions",
  "Save important items by using message shortcuts",
  "Set up a daily digest to stay informed",
] as const;
