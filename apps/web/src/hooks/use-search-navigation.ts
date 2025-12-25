"use client";

import { useHotkeys } from "react-hotkeys-hook";
import type { PreviewType } from "@/hooks/use-document-preview";
import { getPreviewCategory, isPreviewable } from "@/lib/file-preview-config";
import type { UnifiedSearchItem } from "@/lib/search-types";

type SearchNavigationOptions = {
  items: UnifiedSearchItem[];
  selectedIndex: number;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  previewId: string | null;
  openPreview: (id: string, type: PreviewType) => void;
  closePreview: () => void;
  onOpenExternal?: (url: string) => void;
  enabled?: boolean;
};

export function useSearchNavigation({
  items,
  selectedIndex,
  setSelectedIndex,
  previewId,
  openPreview,
  closePreview,
  onOpenExternal,
  enabled = true,
}: SearchNavigationOptions) {
  useHotkeys(
    "down, j",
    (e) => {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
    },
    { enabled: enabled && items.length > 0, enableOnFormTags: false }
  );

  useHotkeys(
    "up, k",
    (e) => {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    },
    { enabled: enabled && items.length > 0, enableOnFormTags: false }
  );

  useHotkeys(
    "enter, space",
    (e) => {
      e.preventDefault();
      const item = items[selectedIndex];
      if (!item) {
        return;
      }

      if (item.type === "media") {
        openPreview(item.data.id, "media");
      } else {
        const previewCategory = getPreviewCategory(
          item.data.connector_type,
          item.data.document_type
        );
        if (previewCategory) {
          openPreview(item.data.id, previewCategory);
        } else if (
          isPreviewable(
            item.data.mime_type,
            item.data.file_name,
            item.data.document_type
          )
        ) {
          openPreview(item.data.id, "document");
        } else if (item.data.url) {
          onOpenExternal?.(item.data.url);
        }
      }
    },
    {
      enabled: enabled && selectedIndex >= 0 && items.length > 0,
      enableOnFormTags: false,
    }
  );

  useHotkeys(
    "escape",
    () => {
      if (previewId) {
        closePreview();
      }
    },
    { enabled: !!previewId }
  );

  useHotkeys(
    "o, mod+enter",
    () => {
      const item = items[selectedIndex];
      if (item?.data.url) {
        onOpenExternal?.(item.data.url);
      }
    },
    {
      enabled: enabled && selectedIndex >= 0 && items.length > 0,
      enableOnFormTags: false,
    }
  );

  useHotkeys(
    "home, g g",
    (e) => {
      e.preventDefault();
      setSelectedIndex(0);
    },
    { enabled: enabled && items.length > 0, enableOnFormTags: false }
  );

  useHotkeys(
    "end, shift+g",
    (e) => {
      e.preventDefault();
      setSelectedIndex(items.length - 1);
    },
    { enabled: enabled && items.length > 0, enableOnFormTags: false }
  );

  return {
    selectedIndex,
    setSelectedIndex,
  };
}
