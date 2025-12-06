"use client";

import { useHotkeys } from "react-hotkeys-hook";
import { isPreviewable } from "@/lib/file-preview-config";
import type { SearchResultDocument } from "@/lib/search-types";

type SearchNavigationOptions = {
  documents: SearchResultDocument[];
  selectedIndex: number;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  previewId: string | null;
  setPreviewId: (id: string | null) => void;
  onOpenExternal?: (url: string) => void;
  enabled?: boolean;
};

export function useSearchNavigation({
  documents,
  selectedIndex,
  setSelectedIndex,
  previewId,
  setPreviewId,
  onOpenExternal,
  enabled = true,
}: SearchNavigationOptions) {
  useHotkeys(
    "down, j",
    (e) => {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, documents.length - 1));
    },
    { enabled: enabled && documents.length > 0, enableOnFormTags: false }
  );

  useHotkeys(
    "up, k",
    (e) => {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    },
    { enabled: enabled && documents.length > 0, enableOnFormTags: false }
  );

  useHotkeys(
    "enter, space",
    (e) => {
      e.preventDefault();
      const doc = documents[selectedIndex];
      if (!doc) {
        return;
      }

      if (isPreviewable(doc.mime_type, doc.file_name, doc.document_type)) {
        setPreviewId(doc.id);
      } else if (doc.url) {
        onOpenExternal?.(doc.url);
      }
    },
    {
      enabled: enabled && selectedIndex >= 0 && documents.length > 0,
      enableOnFormTags: false,
    }
  );

  useHotkeys(
    "escape",
    () => {
      if (previewId) {
        setPreviewId(null);
      }
    },
    { enabled: !!previewId }
  );

  useHotkeys(
    "o, mod+enter",
    () => {
      const doc = documents[selectedIndex];
      if (doc?.url) {
        onOpenExternal?.(doc.url);
      }
    },
    {
      enabled: enabled && selectedIndex >= 0 && documents.length > 0,
      enableOnFormTags: false,
    }
  );

  useHotkeys(
    "home, g g",
    (e) => {
      e.preventDefault();
      setSelectedIndex(0);
    },
    { enabled: enabled && documents.length > 0, enableOnFormTags: false }
  );

  useHotkeys(
    "end, shift+g",
    (e) => {
      e.preventDefault();
      setSelectedIndex(documents.length - 1);
    },
    { enabled: enabled && documents.length > 0, enableOnFormTags: false }
  );

  return {
    selectedIndex,
    setSelectedIndex,
  };
}
