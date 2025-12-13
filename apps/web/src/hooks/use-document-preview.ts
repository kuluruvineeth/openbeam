"use client";

import {
  parseAsFloat,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { useCallback } from "react";

const PREVIEW_TYPES = ["document", "media"] as const;
type PreviewType = (typeof PREVIEW_TYPES)[number];

const VIDEO_TABS = [
  "chapters",
  "highlights",
  "transcript",
  "ask",
  "info",
] as const;

export const previewSchema = {
  preview: parseAsString,
  previewType: parseAsStringLiteral(PREVIEW_TYPES),
  panel: parseAsStringLiteral(VIDEO_TABS),
  t: parseAsFloat,
};

export function useDocumentPreview() {
  const [params, setParams] = useQueryStates(previewSchema, {
    shallow: false,
  });

  const previewId = params.preview;
  const previewType = params.previewType;
  const hasPreview = !!previewId;

  const openPreview = useCallback(
    (id: string, type: PreviewType = "document") => {
      setParams({ preview: id, previewType: type });
    },
    [setParams]
  );

  const closePreview = useCallback(() => {
    setParams({ preview: null, previewType: null, panel: null, t: null });
  }, [setParams]);

  const togglePreview = useCallback(
    (id: string, type: PreviewType = "document") => {
      if (previewId === id) {
        closePreview();
      } else {
        openPreview(id, type);
      }
    },
    [previewId, openPreview, closePreview]
  );

  return {
    previewId,
    previewType,
    hasPreview,
    openPreview,
    closePreview,
    togglePreview,
  };
}
