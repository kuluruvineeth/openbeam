import type { InputBlock, KnownBlock, View } from "@slack/web-api";
import {
  DEFAULT_QUICK_ACTIONS,
  HOME_CALLBACK_IDS,
  type HomeTabContent,
  type HomeTabState,
  type QuickAction,
  type RecentSearch,
  type SavedItem,
  TIPS,
} from "./types";

export function buildHomeTabView(
  state: HomeTabState,
  content: HomeTabContent
): View {
  return {
    type: "home",
    blocks: buildHomeTabBlocks(state, content),
  };
}

export function buildHomeTabBlocks(
  state: HomeTabState,
  content: HomeTabContent
): KnownBlock[] {
  const blocks: KnownBlock[] = [];

  blocks.push(buildHeader(content.greeting));
  blocks.push(buildSearchInput());
  blocks.push({ type: "divider" });

  if (state.preferences.showQuickActions) {
    blocks.push(...buildQuickActionsSection(content.quickActions));
  }

  if (
    state.preferences.showRecentSearches &&
    content.recentSearches.length > 0
  ) {
    blocks.push(...buildRecentSearchesSection(content.recentSearches));
  }

  if (state.preferences.showSavedItems && content.savedItems.length > 0) {
    blocks.push(...buildSavedItemsSection(content.savedItems));
  }

  blocks.push(...buildTipsSection(content.tips));
  blocks.push(...buildFooter());

  return blocks;
}

function buildHeader(greeting: string): KnownBlock {
  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*${greeting}*\n\nSearch across all your connected apps and get AI-powered answers.`,
    },
    accessory: {
      type: "button",
      text: {
        type: "plain_text",
        text: "⚙️ Settings",
        emoji: true,
      },
      action_id: HOME_CALLBACK_IDS.SETTINGS,
    },
  };
}

function buildSearchInput(): KnownBlock {
  return {
    type: "input",
    block_id: "home_search_block",
    dispatch_action: true,
    element: {
      type: "plain_text_input",
      action_id: HOME_CALLBACK_IDS.SEARCH_INPUT,
      placeholder: {
        type: "plain_text",
        text: "Search or ask a question...",
      },
    },
    label: {
      type: "plain_text",
      text: " ",
    },
  };
}

function buildQuickActionsSection(actions: QuickAction[]): KnownBlock[] {
  const blocks: KnownBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Quick Actions*",
      },
    },
  ];

  const actionButtons = actions.slice(0, 4).map((action) => ({
    type: "button" as const,
    text: {
      type: "plain_text" as const,
      text: `${action.icon} ${action.label}`,
      emoji: true,
    },
    action_id: action.actionId,
    value: action.id,
  }));

  blocks.push({
    type: "actions",
    block_id: "quick_actions",
    elements: actionButtons,
  });

  blocks.push({ type: "divider" });

  return blocks;
}

function buildRecentSearchesSection(searches: RecentSearch[]): KnownBlock[] {
  const blocks: KnownBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Recent Searches*",
      },
      accessory: {
        type: "button",
        text: {
          type: "plain_text",
          text: "Clear",
          emoji: true,
        },
        action_id: HOME_CALLBACK_IDS.CLEAR_RECENT,
        style: "danger",
      },
    },
  ];

  const searchItems = searches.slice(0, 5).map((search) => {
    const timeAgo = formatTimeAgo(search.timestamp);
    const resultInfo = search.resultCount
      ? ` · ${search.resultCount} results`
      : "";
    return `• \`${truncate(search.query, 40)}\` _${timeAgo}${resultInfo}_`;
  });

  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: searchItems.join("\n"),
    },
  });

  blocks.push({ type: "divider" });

  return blocks;
}

function buildSavedItemsSection(items: SavedItem[]): KnownBlock[] {
  const blocks: KnownBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Saved Items*",
      },
      accessory: {
        type: "button",
        text: {
          type: "plain_text",
          text: "View all",
          emoji: true,
        },
        action_id: HOME_CALLBACK_IDS.VIEW_ALL_SAVED,
      },
    },
  ];

  for (const item of items.slice(0, 5)) {
    const title = item.url
      ? `<${item.url}|${truncate(item.title, 50)}>`
      : truncate(item.title, 50);

    const sourceInfo = item.source ? ` · ${item.source}` : "";
    const typeIcon = getDocumentTypeIcon(item.documentType);

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${typeIcon} ${title}${sourceInfo}`,
      },
      accessory: {
        type: "overflow",
        action_id: `${HOME_CALLBACK_IDS.REMOVE_SAVED}_${item.id}`,
        options: [
          {
            text: {
              type: "plain_text",
              text: "🗑️ Remove",
              emoji: true,
            },
            value: `remove_${item.id}`,
          },
          {
            text: {
              type: "plain_text",
              text: "🔗 Copy link",
              emoji: true,
            },
            value: `copy_${item.id}`,
          },
        ],
      },
    });
  }

  blocks.push({ type: "divider" });

  return blocks;
}

function buildTipsSection(tips: readonly string[]): KnownBlock[] {
  const randomTip = tips[Math.floor(Math.random() * tips.length)] ?? tips[0];

  return [
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `💡 *Tip:* ${randomTip}`,
        },
      ],
    },
  ];
}

function buildFooter(): KnownBlock[] {
  return [
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `<${getAppUrl()}|Open OpenBeam> · <${getHelpUrl()}|Help & Support>`,
        },
      ],
    },
  ];
}

export function buildSettingsModal(state: HomeTabState): View {
  const recentSearchOption = {
    text: { type: "plain_text" as const, text: "Show recent searches" },
    value: "show_recent",
  };

  const savedItemsOption = {
    text: { type: "plain_text" as const, text: "Show saved items" },
    value: "show_saved",
  };

  return {
    type: "modal",
    callback_id: HOME_CALLBACK_IDS.SETTINGS,
    title: {
      type: "plain_text",
      text: "Home Settings",
    },
    submit: {
      type: "plain_text",
      text: "Save",
    },
    close: {
      type: "plain_text",
      text: "Cancel",
    },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Customize your Home tab*",
        },
      },
      {
        type: "input",
        block_id: "show_recent",
        optional: true,
        element: {
          type: "checkboxes",
          action_id: "show_recent_checkbox",
          options: [recentSearchOption],
          ...(state.preferences.showRecentSearches && {
            initial_options: [recentSearchOption],
          }),
        },
        label: {
          type: "plain_text",
          text: "Recent Searches",
        },
      },
      {
        type: "input",
        block_id: "show_saved",
        optional: true,
        element: {
          type: "checkboxes",
          action_id: "show_saved_checkbox",
          options: [savedItemsOption],
          ...(state.preferences.showSavedItems && {
            initial_options: [savedItemsOption],
          }),
        },
        label: {
          type: "plain_text",
          text: "Saved Items",
        },
      },
      {
        type: "input",
        block_id: "default_scope",
        element: {
          type: "static_select",
          action_id: "default_scope_select",
          initial_option: {
            text: {
              type: "plain_text",
              text: getScopeLabel(state.preferences.defaultSearchScope),
            },
            value: state.preferences.defaultSearchScope,
          },
          options: [
            {
              text: { type: "plain_text", text: "All sources" },
              value: "all",
            },
            {
              text: { type: "plain_text", text: "Slack only" },
              value: "slack",
            },
            {
              text: { type: "plain_text", text: "Files only" },
              value: "files",
            },
          ],
        },
        label: {
          type: "plain_text",
          text: "Default Search Scope",
        },
      },
    ],
  };
}

export interface DigestConfigSettings {
  channelIds?: string[];
  topics?: string[];
  frequency?: string;
  deliveryTime?: string;
  timezone?: string;
}

export function buildDigestConfigModal(settings?: DigestConfigSettings): View {
  const frequency = settings?.frequency ?? "daily";
  const deliveryTime = settings?.deliveryTime ?? "09:00";
  const timezone = settings?.timezone ?? "UTC";
  const topics = settings?.topics?.join(", ") ?? "";

  const timeOptions = buildTimeOptions();
  const timezoneOptions = buildTimezoneOptions();

  const frequencyOption =
    frequency === "weekly"
      ? {
          text: { type: "plain_text" as const, text: "Weekly" },
          value: "weekly",
        }
      : {
          text: { type: "plain_text" as const, text: "Daily" },
          value: "daily",
        };

  const timeOption = timeOptions.find((t) => t.value === deliveryTime) ?? {
    text: { type: "plain_text" as const, text: "9:00 AM" },
    value: "09:00",
  };

  const timezoneOption = timezoneOptions.find((t) => t.value === timezone) ?? {
    text: { type: "plain_text" as const, text: "UTC" },
    value: "UTC",
  };

  const channelsElement: Record<string, unknown> = {
    type: "multi_conversations_select",
    action_id: "channels_select",
    placeholder: { type: "plain_text", text: "Select channels" },
    filter: { include: ["public", "private"] },
  };

  if (settings?.channelIds && settings.channelIds.length > 0) {
    channelsElement.initial_conversations = settings.channelIds;
  }

  const topicsElement: Record<string, unknown> = {
    type: "plain_text_input",
    action_id: "topics_input",
    placeholder: {
      type: "plain_text",
      text: "e.g., product updates, engineering, sales",
    },
  };

  if (topics) {
    topicsElement.initial_value = topics;
  }

  return {
    type: "modal",
    callback_id: "digest_config_modal",
    title: { type: "plain_text", text: "Set Up Digest" },
    submit: { type: "plain_text", text: "Save" },
    close: { type: "plain_text", text: "Cancel" },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Configure your personalized digest to stay updated on what matters most.",
        },
      },
      {
        type: "input",
        block_id: "channels",
        optional: true,
        element: channelsElement as unknown as InputBlock["element"],
        label: { type: "plain_text", text: "Channels to Include" },
      },
      {
        type: "input",
        block_id: "topics",
        optional: true,
        element: topicsElement as unknown as InputBlock["element"],
        label: { type: "plain_text", text: "Topics (comma-separated)" },
      },
      {
        type: "input",
        block_id: "frequency",
        element: {
          type: "static_select",
          action_id: "frequency_select",
          initial_option: frequencyOption,
          options: [
            { text: { type: "plain_text", text: "Daily" }, value: "daily" },
            { text: { type: "plain_text", text: "Weekly" }, value: "weekly" },
          ],
        },
        label: { type: "plain_text", text: "Frequency" },
      },
      {
        type: "input",
        block_id: "time",
        element: {
          type: "static_select",
          action_id: "time_select",
          initial_option: timeOption,
          options: timeOptions,
        },
        label: { type: "plain_text", text: "Delivery Time" },
      },
      {
        type: "input",
        block_id: "timezone",
        element: {
          type: "static_select",
          action_id: "timezone_select",
          initial_option: timezoneOption,
          options: timezoneOptions,
        },
        label: { type: "plain_text", text: "Timezone" },
      },
    ],
  };
}

function buildTimeOptions() {
  const times = [
    { label: "7:00 AM", value: "07:00" },
    { label: "8:00 AM", value: "08:00" },
    { label: "9:00 AM", value: "09:00" },
    { label: "10:00 AM", value: "10:00" },
    { label: "12:00 PM", value: "12:00" },
    { label: "5:00 PM", value: "17:00" },
    { label: "6:00 PM", value: "18:00" },
  ];
  return times.map((t) => ({
    text: { type: "plain_text" as const, text: t.label },
    value: t.value,
  }));
}

function buildTimezoneOptions() {
  const zones = [
    { label: "UTC", value: "UTC" },
    { label: "US/Pacific (PT)", value: "America/Los_Angeles" },
    { label: "US/Mountain (MT)", value: "America/Denver" },
    { label: "US/Central (CT)", value: "America/Chicago" },
    { label: "US/Eastern (ET)", value: "America/New_York" },
    { label: "Europe/London (GMT)", value: "Europe/London" },
    { label: "Europe/Paris (CET)", value: "Europe/Paris" },
    { label: "Europe/Berlin (CET)", value: "Europe/Berlin" },
    { label: "Asia/Dubai (GST)", value: "Asia/Dubai" },
    { label: "Asia/Kolkata (IST)", value: "Asia/Kolkata" },
    { label: "Asia/Bangkok (ICT)", value: "Asia/Bangkok" },
    { label: "Asia/Singapore (SGT)", value: "Asia/Singapore" },
    { label: "Asia/Hong Kong (HKT)", value: "Asia/Hong_Kong" },
    { label: "Asia/Tokyo (JST)", value: "Asia/Tokyo" },
    { label: "Asia/Seoul (KST)", value: "Asia/Seoul" },
    { label: "Australia/Sydney (AEST)", value: "Australia/Sydney" },
    { label: "Pacific/Auckland (NZST)", value: "Pacific/Auckland" },
  ];
  return zones.map((z) => ({
    text: { type: "plain_text" as const, text: z.label },
    value: z.value,
  }));
}

export function getGreeting(_userId: string): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning! ☀️";
  }
  if (hour < 17) {
    return "Good afternoon! 👋";
  }
  return "Good evening! 🌙";
}

export function prepareHomeTabContent(
  state: HomeTabState,
  _userId: string
): HomeTabContent {
  return {
    greeting: getGreeting(_userId),
    recentSearches: state.recentSearches.slice(0, 5),
    savedItems: state.savedItems.slice(0, 5),
    quickActions: DEFAULT_QUICK_ACTIONS,
    tips: [...TIPS],
  };
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  if (days < 7) {
    return `${days}d ago`;
  }
  return new Date(timestamp).toLocaleDateString();
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3)}...`;
}

function getDocumentTypeIcon(docType?: string): string {
  const icons: Record<string, string> = {
    message: "💬",
    file: "📎",
    page: "📄",
    issue: "🎫",
    channel: "#️⃣",
  };
  return icons[docType ?? ""] ?? "📄";
}

function getScopeLabel(scope: string): string {
  const labels: Record<string, string> = {
    all: "All sources",
    slack: "Slack only",
    files: "Files only",
  };
  return labels[scope] ?? "All sources";
}

function getAppUrl(): string {
  return process.env.WEB_APP_URL ?? "https://app.openbeam.com";
}

function getHelpUrl(): string {
  return `${getAppUrl()}/help`;
}
