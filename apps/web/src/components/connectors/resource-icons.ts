import { Icons } from "@/components/icons";

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

export const ICON_SIZE = {
  xs: 9,
  sm: 12,
  md: 13,
  lg: 14,
  xl: 20,
} as const;

const RESOURCE_ICON_MAP = new Map<string, IconComponent>([
  ["private_channel", Icons.LockIcon],
  ["public_channel", Icons.Messages],
  ["channel", Icons.Messages],
  ["thread", Icons.Messages],
  ["group_dm", Icons.Messages],
  ["dm", Icons.User],
  ["document", Icons.FileTextIcon],
  ["page", Icons.FileTextIcon],
  ["file", Icons.FileIcon],
  ["database", Icons.Database],
  ["table", Icons.Database],
  ["workspace", Icons.ConnectorIcon],
  ["board", Icons.ConnectorIcon],
  ["folder", Icons.Folder],
  ["label", Icons.Folder],
  ["mailbox", Icons.Folder],
  ["collection", Icons.Folder],
  ["user", Icons.Folder],
  ["team", Icons.Folder],
  ["project", Icons.Folder],
  ["list", Icons.Folder],
]);

const DOC_TYPE_CONFIG: Record<string, { icon: IconComponent; style: string }> =
  {
    message: { icon: Icons.Messages, style: "text-openplane-blue" },
    page: { icon: Icons.FileTextIcon, style: "text-openplane-orange" },
    image: { icon: Icons.FileImageIcon, style: "text-openplane-pink" },
    file: { icon: Icons.FileIcon, style: "text-openplane-green" },
    video: { icon: Icons.Video, style: "text-openplane-purple" },
    audio: { icon: Icons.FileAudio, style: "text-openplane-yellow" },
    application: { icon: Icons.FileIcon, style: "text-foreground/40" },
    text: { icon: Icons.FileTextIcon, style: "text-foreground/40" },
  };

const DEFAULT_DOC_CONFIG = {
  icon: Icons.FileIcon,
  style: "text-foreground/40",
};

export function getResourceIcon(type: string): IconComponent {
  const normalized = type.toLowerCase();
  const exact = RESOURCE_ICON_MAP.get(normalized);
  if (exact) {
    return exact;
  }

  for (const [key, icon] of RESOURCE_ICON_MAP) {
    if (normalized.includes(key)) {
      return icon;
    }
  }
  return Icons.Folder;
}

export function getDocTypeConfig(type: string) {
  const normalized = type.toLowerCase();
  for (const [key, config] of Object.entries(DOC_TYPE_CONFIG)) {
    if (normalized.includes(key)) {
      return config;
    }
  }
  return DEFAULT_DOC_CONFIG;
}

export function formatResourceType(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
