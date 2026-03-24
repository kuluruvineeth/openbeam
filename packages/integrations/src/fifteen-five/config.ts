import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const fifteenFiveApp: UnifiedApp = {
  id: AppType.FIFTEEN_FIVE,
  name: "15Five",
  category: "HR & People",
  active: true,
  logo: AppType.FIFTEEN_FIVE,
  short_description:
    "Search check-ins, objectives, key results, high fives, and reviews from 15Five",
  description:
    "Connect 15Five to search across performance management data including weekly check-ins, OKRs, peer recognition, and performance reviews. Supports API key authentication with page-based pagination and modified_after incremental sync.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "15Five",
  website: "https://www.15five.com",

  searchDisplay: {
    defaultIconKey: "ClipboardCheckIcon",
    documentTypes: {
      checkin: {
        label: "check-in",
        iconKey: "ClipboardCheckIcon",
        category: "document",
      },
      objective: {
        label: "objective",
        iconKey: "TargetIcon",
        category: "task",
      },
      key_result: {
        label: "key result",
        iconKey: "TrendingUpIcon",
        category: "task",
      },
      high_five: {
        label: "high five",
        iconKey: "HandshakeIcon",
        category: "comment",
      },
      review: {
        label: "review",
        iconKey: "FileTextIcon",
        category: "document",
      },
    },
  },

  features: [
    "Weekly check-in search with pulse scores and questions",
    "OKR tracking with objectives and key results",
    "High Five peer recognition search",
    "Performance review search with cycle tracking",
    "Incremental sync via modified_after parameter",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl:
        "https://success.15five.com/hc/en-us/articles/360002854391-15Five-Public-API",
    },
  },

  streams: [
    {
      name: "checkins",
      label: "Check-ins",
      description: "Weekly check-ins with pulse scores, questions, and answers",
      entityType: "activity",
      isPii: true,
      dataPoints: [
        "Pulse Score",
        "Questions",
        "Answers",
        "User",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "objectives",
      label: "Objectives",
      description: "OKR objectives with status, owner, and progress",
      entityType: "activity",
      isPii: false,
      dataPoints: [
        "Name",
        "Description",
        "Status",
        "Owner",
        "Progress",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "key_results",
      label: "Key Results",
      description:
        "Key results linked to objectives with target and current values",
      entityType: "activity",
      isPii: false,
      dataPoints: [
        "Name",
        "Target Value",
        "Current Value",
        "Status",
        "Owner",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "high_fives",
      label: "High Fives",
      description: "Peer recognition with sender, receiver, and message",
      entityType: "activity",
      isPii: true,
      dataPoints: ["Sender", "Receiver", "Message", "Created"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "reviews",
      label: "Reviews",
      description: "Performance reviews with cycle and status tracking",
      entityType: "resource",
      isPii: true,
      dataPoints: [
        "Reviewer",
        "Reviewee",
        "Cycle",
        "Status",
        "Created",
        "Updated",
      ],
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
        "15Five API key. Generate from Features > API & Connectors > Public API in 15Five admin settings.",
      type: "password",
      required: true,
      value: "",
      placeholder: "Your 15Five API key",
    },
    {
      id: "sync_reviews",
      label: "Sync Reviews",
      description: "Include performance reviews in search results",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_high_fives",
      label: "Sync High Fives",
      description: "Include peer recognition (High Fives) in search results",
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

export default fifteenFiveApp;
