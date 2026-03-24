import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const benchlingApp: UnifiedApp = {
  id: AppType.BENCHLING,
  name: "Benchling",
  category: "Life Sciences R&D",
  active: true,
  logo: AppType.BENCHLING,
  short_description:
    "Search notebook entries, sequences, projects, and assay results from Benchling.",
  description:
    "Connect Benchling to search across life sciences R&D data including notebook entries, DNA/protein sequences, projects, folders, and assay results. Supports API key authentication with Basic auth encoding and cursor-based pagination.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Benchling",
  website: "https://www.benchling.com",

  searchDisplay: {
    defaultIconKey: "FlaskIcon",
    documentTypes: {
      entry: {
        label: "notebook entry",
        iconKey: "BookOpenIcon",
        category: "document",
      },
      folder: {
        label: "folder",
        iconKey: "FolderIcon",
        category: "project",
      },
      project: {
        label: "project",
        iconKey: "FlagIcon",
        category: "project",
      },
      dna_sequence: {
        label: "DNA sequence",
        iconKey: "LayersIcon",
        category: "document",
      },
      aa_sequence: {
        label: "protein sequence",
        iconKey: "LayersIcon",
        category: "document",
      },
      assay_result: {
        label: "assay result",
        iconKey: "ChartBarIcon",
        category: "document",
      },
    },
  },

  features: [
    "Notebook entry search with content, authors, and schemas",
    "DNA and protein sequence indexing with annotations",
    "Project and folder hierarchy navigation",
    "Assay result search with schema and field data",
    "Incremental sync via modifiedAt sorting",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl: "https://docs.benchling.com/reference/getting-started",
    },
  },

  streams: [
    {
      name: "entries",
      label: "Notebook Entries",
      description:
        "Lab notebook entries with content, authors, schemas, and review status",
      entityType: "activity",
      isPii: false,
      dataPoints: [
        "Name",
        "Content",
        "Author",
        "Schema",
        "Folder",
        "Review Status",
        "Created",
        "Modified",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "folders",
      label: "Folders",
      description: "Folder hierarchy for organizing entries and sequences",
      entityType: "resource",
      isPii: false,
      dataPoints: ["Name", "Parent Folder", "Project", "Created", "Modified"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "projects",
      label: "Projects",
      description: "Top-level projects containing folders and entries",
      entityType: "resource",
      isPii: false,
      dataPoints: ["Name", "Owner", "Archive Reason", "Created", "Modified"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "sequences",
      label: "DNA & Protein Sequences",
      description:
        "DNA sequences and amino acid sequences with annotations and metadata",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Name",
        "Type",
        "Length",
        "Bases/Amino Acids",
        "Annotations",
        "Folder",
        "Created",
        "Modified",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "assay_results",
      label: "Assay Results",
      description: "Assay results with schema fields and associated entries",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Schema",
        "Fields",
        "Entry",
        "Project",
        "Created",
        "Modified",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "api_key",
      label: "API Key",
      description:
        "Benchling API key. Generate from Settings > API keys in your Benchling tenant.",
      type: "password",
      required: true,
      value: "",
      placeholder: "sk_...",
    },
    {
      id: "tenant",
      label: "Tenant",
      description:
        "Your Benchling tenant name (e.g., 'mycompany' for mycompany.benchling.com)",
      type: "text",
      required: true,
      value: "",
      placeholder: "mycompany",
    },
    {
      id: "sync_sequences",
      label: "Sync Sequences",
      description: "Include DNA and protein sequences in search results",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_assay_results",
      label: "Sync Assay Results",
      description: "Include assay results in search results",
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

export default benchlingApp;
