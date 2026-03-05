import { appStore, type UnifiedApp } from "@openplane/integrations";

export interface WebsiteConnector {
  id: string;
  name: string;
  slug: string;
  category: string;
  active: boolean;
  short_description: string;
  description: string;
  features: string[];
  auth_type: string;
  developer?: string;
  website?: string;
  streams: { name: string; label: string; description: string }[];
  tint_color: string;
  featured: boolean;
}

const SLUG_MAP: Record<string, string> = {
  GMAIL: "gmail",
  GITHUB: "github",
  GOOGLE_DRIVE: "google-drive",
  LINEAR: "linear",
  NOTION: "notion",
  SLACK: "slack",
  SAMSARA: "samsara",
  MQTT: "mqtt",
  OPCUA: "opc-ua",
  BACNET: "bacnet",
  THINGSBOARD: "thingsboard",
  NODERED: "node-red",
  OMNIVERSE: "omniverse",
  MATTERPORT: "matterport",
  VIAM: "viam",
  FHIR: "fhir",
};

const TINT_COLORS: Record<string, string> = {
  GMAIL: "#EA4335",
  GITHUB: "#181717",
  GOOGLE_DRIVE: "#4285F4",
  LINEAR: "#5E6AD2",
  NOTION: "#000000",
  SLACK: "#4A154B",
  SAMSARA: "#00263E",
  MQTT: "#660066",
  OPCUA: "#2C5591",
  BACNET: "#00843D",
  THINGSBOARD: "#305680",
  NODERED: "#8F0000",
  OMNIVERSE: "#76B900",
  MATTERPORT: "#FF3158",
  VIAM: "#4361EE",
  FHIR: "#E35205",
};

const FEATURED_IDS = new Set([
  "GMAIL",
  "SLACK",
  "NOTION",
  "GITHUB",
  "LINEAR",
  "GOOGLE_DRIVE",
]);

function toWebsiteConnector(app: UnifiedApp): WebsiteConnector {
  return {
    id: app.id,
    name: app.name,
    slug: SLUG_MAP[app.id] ?? app.id.toLowerCase(),
    category: app.category,
    active: app.active,
    short_description: app.short_description ?? "",
    description: app.description ?? "",
    features: app.features,
    auth_type: app.auth.type,
    developer: app.developerName,
    website: app.website,
    streams: app.streams.map((s) => ({
      name: s.name,
      label: s.label,
      description: s.description,
    })),
    tint_color: TINT_COLORS[app.id] ?? "#6B7280",
    featured: FEATURED_IDS.has(app.id),
  };
}

export const connectors: WebsiteConnector[] = appStore.map(toWebsiteConnector);

export const categories = [
  { id: "all", name: "All" },
  { id: "Communication", name: "Communication" },
  { id: "Code & Collaboration", name: "Code" },
  { id: "Documents & Collaboration", name: "Documents" },
  { id: "Documents & Storage", name: "Storage" },
  { id: "Project Management", name: "Project Management" },
  { id: "Fleet Management & IoT", name: "Fleet & IoT" },
  { id: "Industrial IoT & Protocols", name: "Industrial IoT" },
  { id: "Building Automation", name: "Building Automation" },
  { id: "IoT Platform", name: "IoT Platform" },
  { id: "Automation & Integration", name: "Automation" },
  { id: "Physical AI & Spatial", name: "Physical AI" },
] as const;

const categorySet = new Set(connectors.map((c) => c.category));
export const activeCategories = categories.filter(
  (c) => c.id === "all" || categorySet.has(c.id)
);

const CATEGORY_TO_GROUP: Record<string, string> = {
  Communication: "productivity",
  "Code & Collaboration": "productivity",
  "Documents & Collaboration": "productivity",
  "Documents & Storage": "productivity",
  "Project Management": "productivity",
  "Fleet Management & IoT": "iot",
  "Industrial IoT & Protocols": "iot",
  "Building Automation": "iot",
  "IoT Platform": "iot",
  "Automation & Integration": "iot",
  "Physical AI & Spatial": "physical-ai",
};

export const displayGroups = [
  { id: "all", name: "All" },
  { id: "productivity", name: "Productivity" },
  { id: "iot", name: "IoT & Industrial" },
  { id: "physical-ai", name: "Physical AI" },
] as const;

export function getConnectorsByGroup(groupId: string): WebsiteConnector[] {
  if (groupId === "all") {
    return connectors;
  }
  return connectors.filter((c) => CATEGORY_TO_GROUP[c.category] === groupId);
}

export function getGroupForCategory(category: string): string {
  return CATEGORY_TO_GROUP[category] ?? "all";
}

export function getConnectorBySlug(slug: string): WebsiteConnector | undefined {
  return connectors.find((c) => c.slug === slug);
}

export function getConnectorsByCategory(category: string): WebsiteConnector[] {
  if (category === "all") {
    return connectors;
  }
  return connectors.filter((c) => c.category === category);
}

export function getCategoryName(categoryId: string): string {
  const cat = categories.find((c) => c.id === categoryId);
  return cat?.name ?? categoryId;
}

export function getAllSlugs(): string[] {
  return connectors.map((c) => c.slug);
}

export function getAllCategoryIds(): string[] {
  return activeCategories.filter((c) => c.id !== "all").map((c) => c.id);
}
