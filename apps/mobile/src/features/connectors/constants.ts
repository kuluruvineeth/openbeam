export const RESOURCES_LIMIT = 50;
export const DOCUMENTS_LIMIT = 10;

export const CONNECTOR_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  SYNCING: "Syncing",
  INACTIVE: "Paused",
  ERROR: "Error",
  DELETING: "Deleting",
};

export const CONNECTOR_STATUS_COLORS: Record<
  string,
  { bg: string; text: string }
> = {
  ACTIVE: { bg: "#dcfce7", text: "#166534" },
  SYNCING: { bg: "#dbeafe", text: "#1e40af" },
  INACTIVE: { bg: "#fef3c7", text: "#92400e" },
  ERROR: { bg: "#fee2e2", text: "#991b1b" },
  DELETING: { bg: "#fee2e2", text: "#991b1b" },
};

export const CATEGORY_ORDER = [
  "Communication",
  "Documents & Storage",
  "Documents & Collaboration",
  "Project Management",
  "Code & Collaboration",
  "Integration",
];
