import type { LucideIcon } from "lucide-react-native";
import {
  Database,
  File,
  FileAudio,
  FileImage,
  FileText,
  Film,
  Folder,
  Lock,
  Mail,
  MessageSquare,
  User,
} from "lucide-react-native";

const RESOURCE_ICON_MAP = new Map<string, LucideIcon>([
  ["private_channel", Lock],
  ["public_channel", MessageSquare],
  ["channel", MessageSquare],
  ["thread", MessageSquare],
  ["group_dm", MessageSquare],
  ["dm", User],
  ["document", FileText],
  ["page", FileText],
  ["file", File],
  ["database", Database],
  ["table", Database],
  ["workspace", Folder],
  ["board", Folder],
  ["folder", Folder],
  ["label", Folder],
  ["mailbox", Mail],
  ["collection", Folder],
  ["user", User],
  ["team", Folder],
  ["project", Folder],
  ["list", Folder],
]);

const DOC_TYPE_COLORS: Record<string, string> = {
  message: "#3b82f6",
  page: "#f97316",
  image: "#ec4899",
  file: "#22c55e",
  video: "#a855f7",
  audio: "#eab308",
};

export function getResourceIcon(type: string): LucideIcon {
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
  return Folder;
}

export function getDocTypeIcon(type: string): LucideIcon {
  const normalized = type.toLowerCase();
  if (normalized.includes("message")) {
    return MessageSquare;
  }
  if (normalized.includes("page")) {
    return FileText;
  }
  if (normalized.includes("image")) {
    return FileImage;
  }
  if (normalized.includes("video")) {
    return Film;
  }
  if (normalized.includes("audio")) {
    return FileAudio;
  }
  if (normalized.includes("file")) {
    return File;
  }
  return File;
}

export function getDocTypeColor(type: string): string {
  const normalized = type.toLowerCase();
  for (const [key, color] of Object.entries(DOC_TYPE_COLORS)) {
    if (normalized.includes(key)) {
      return color;
    }
  }
  return "#9ca3af";
}

export function formatResourceType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
