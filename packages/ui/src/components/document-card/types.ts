import type { ReactNode } from "react";

type DocumentCardVariant = "compact" | "panel";

type DocumentCardRootProps = {
  variant?: DocumentCardVariant;
  isLoading?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
};

type DocumentCardHeaderProps = {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  breadcrumb?: string;
  externalUrl?: string;
  onClose?: () => void;
  className?: string;
};

type DocumentCardContentProps = {
  children: ReactNode;
  maxLines?: number;
  className?: string;
};

type DocumentCardMetadataProps = {
  items: Array<{ label: string; value: string }>;
  columns?: 1 | 2;
  className?: string;
};

type DocumentCardActionsProps = {
  children: ReactNode;
  className?: string;
};

export type {
  DocumentCardVariant,
  DocumentCardRootProps,
  DocumentCardHeaderProps,
  DocumentCardContentProps,
  DocumentCardMetadataProps,
  DocumentCardActionsProps,
};
