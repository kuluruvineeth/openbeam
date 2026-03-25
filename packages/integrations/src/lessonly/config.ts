import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const lessonlyApp: UnifiedApp = {
  id: AppType.LESSONLY,
  name: "Lessonly",
  category: "Training & Enablement",
  active: true,
  logo: AppType.LESSONLY,
  short_description:
    "Search lessons, learning paths, and assignments from Lessonly.",
  description:
    "Connect Lessonly (Seismic Learning) to search across training content including lessons, learning paths, assignments, groups, and users. Supports API key authentication with Basic auth encoding and page-based pagination.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Seismic",
  website: "https://www.lessonly.com",

  searchDisplay: {
    defaultIconKey: "BookOpenIcon",
    documentTypes: {
      lesson: {
        label: "lesson",
        iconKey: "BookOpenIcon",
        category: "document",
      },
      path: {
        label: "learning path",
        iconKey: "LayersIcon",
        category: "project",
      },
      assignment: {
        label: "assignment",
        iconKey: "ClipboardIcon",
        category: "task",
      },
      group: {
        label: "group",
        iconKey: "UsersIcon",
        category: "group",
      },
      user: {
        label: "user",
        iconKey: "UserIcon",
        category: "contact",
      },
    },
  },

  features: [
    "Lesson search with content, tags, and completion stats",
    "Learning path indexing with ordered lesson sequences",
    "Assignment tracking with status and completion data",
    "Group membership and hierarchy navigation",
    "Incremental sync via updatedAt sorting",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl: "https://docs.lessonly.com/",
    },
  },

  streams: [
    {
      name: "lessons",
      label: "Lessons",
      description:
        "Training lessons with content, tags, assignees count, and completion statistics",
      entityType: "activity",
      isPii: false,
      dataPoints: [
        "Title",
        "Description",
        "Tags",
        "Assignees Count",
        "Completed Count",
        "Retake Score",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "paths",
      label: "Learning Paths",
      description:
        "Ordered sequences of lessons forming learning tracks or courses",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Title",
        "Description",
        "Lessons",
        "Lesson Count",
        "Assignees Count",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "assignments",
      label: "Assignments",
      description:
        "User lesson and path assignments with status and completion data",
      entityType: "activity",
      isPii: true,
      dataPoints: [
        "Assignee",
        "Resource Type",
        "Resource Title",
        "Status",
        "Score",
        "Completed At",
        "Due Date",
        "Assigned",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "groups",
      label: "Groups",
      description: "User groups for organizing learners and assigning content",
      entityType: "resource",
      isPii: false,
      dataPoints: ["Name", "Description", "Member Count", "Created", "Updated"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "users",
      label: "Users",
      description: "Learner profiles with roles and group memberships",
      entityType: "resource",
      isPii: true,
      dataPoints: [
        "Name",
        "Email",
        "Role",
        "Groups",
        "Custom Fields",
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
        "Lessonly API key. Generate from Settings > Integrations in your Lessonly account.",
      type: "password",
      required: true,
      value: "",
      placeholder: "your-api-key",
    },
    {
      id: "subdomain",
      label: "Subdomain",
      description:
        "Your Lessonly subdomain (e.g., 'mycompany' for mycompany.lessonly.com)",
      type: "text",
      required: true,
      value: "",
      placeholder: "mycompany",
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

export default lessonlyApp;
