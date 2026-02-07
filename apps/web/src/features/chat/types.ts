import type React from "react";

export type UserRole = "user" | "admin" | "superadmin";

export type Capability = "reasoning" | "websearch" | "deepResearch" | null;

export type FileType =
  | "image"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "pdf"
  | "text"
  | "file";

export type SelectedFile = {
  file: File;
  id: string;
  uploading?: boolean;
  uploadError?: string;
  preview?: string;
  fileType?: FileType;
};

export type ChatBoxProps = {
  userRole: UserRole;
  query: string;
  setQuery: (query: string) => void;
  isStreaming?: boolean;
  retryIsStreaming?: boolean;
  handleStop?: () => void;
  chatId?: string | null;
  agentIdFromChatData?: string | null;
  hideButtons?: boolean;
  isKnowledgeBaseChat?: boolean;
};

export type Model = {
  labelName: string;
  description?: string;
  provider: "openai" | "google" | "anthropic" | "other";
};

export type ModelProvider = {
  name: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  models: Model[];
};
