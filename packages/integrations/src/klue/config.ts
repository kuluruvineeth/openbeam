import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const klueApp: UnifiedApp = {
  id: AppType.KLUE,
  name: "Klue",
  category: "Competitive Intelligence",
  active: true,
  logo: AppType.KLUE,
  short_description:
    "Search competitors, battlecards, intel, and boards from Klue",
  description:
    "Connect Klue to search across competitive intelligence data including competitor profiles, battlecards, intel items, and boards. Supports API key authentication with page-based pagination and updated_after incremental sync.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Klue Labs",
  website: "https://klue.com",

  searchDisplay: {
    defaultIconKey: "TargetIcon",
    documentTypes: {
      competitor: {
        label: "competitor",
        iconKey: "TargetIcon",
        category: "knowledge",
      },
      battlecard: {
        label: "battlecard",
        iconKey: "FileTextIcon",
        category: "knowledge",
      },
      intel: {
        label: "intel",
        iconKey: "BellIcon",
        category: "knowledge",
      },
      board: {
        label: "board",
        iconKey: "LayoutIcon",
        category: "project",
      },
    },
  },

  features: [
    "Competitor profile search with win rates and status tracking",
    "Battlecard content for sales enablement and competitive positioning",
    "Intel items with source tracking and competitor attribution",
    "Board collections for organized competitive research",
    "Incremental sync via updated_after parameter",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl: "https://app.klue.com/api/docs",
    },
  },

  streams: [
    {
      name: "competitors",
      label: "Competitors",
      description:
        "Competitive profiles with status, win rates, and market positioning",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Name",
        "Description",
        "Status",
        "Win Rate",
        "Website",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "battlecards",
      label: "Battlecards",
      description:
        "Sales enablement cards with competitive positioning and objection handling",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Title",
        "Content",
        "Competitor",
        "Status",
        "Last Reviewed",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "intel",
      label: "Intel",
      description:
        "Competitive intelligence items with source tracking and analysis",
      entityType: "activity",
      isPii: false,
      dataPoints: [
        "Title",
        "Content",
        "Source",
        "Competitor",
        "Tags",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "boards",
      label: "Boards",
      description: "Collections of competitive intel organized by topic",
      entityType: "resource",
      isPii: false,
      dataPoints: ["Name", "Description", "Card Count", "Created", "Updated"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "api_key",
      label: "API Key",
      description:
        "Klue API key. Generate from Settings > API in your Klue account.",
      type: "password",
      required: true,
      value: "",
      placeholder: "Your Klue API key",
    },
    {
      id: "sync_boards",
      label: "Sync Boards",
      description: "Include boards in search results",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "lookback_days",
      label: "Lookback Days",
      description:
        "Number of days of history to sync on first run (0 = all time)",
      type: "text",
      required: false,
      value: "0",
      placeholder: "0",
    },
  ],
};

export default klueApp;
