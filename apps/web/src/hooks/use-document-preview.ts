"use client";

import { parseAsString, useQueryStates } from "nuqs";
import { useCallback } from "react";

export const previewSchema = {
  preview: parseAsString,
};

export function useDocumentPreview() {
  const [params, setParams] = useQueryStates(previewSchema, {
    shallow: false,
  });

  const previewId = params.preview;
  const hasPreview = !!previewId;

  const openPreview = useCallback(
    (documentId: string) => {
      setParams({ preview: documentId });
    },
    [setParams]
  );

  const closePreview = useCallback(() => {
    setParams({ preview: null });
  }, [setParams]);

  const togglePreview = useCallback(
    (documentId: string) => {
      if (previewId === documentId) {
        closePreview();
      } else {
        openPreview(documentId);
      }
    },
    [previewId, openPreview, closePreview]
  );

  return {
    previewId,
    hasPreview,
    openPreview,
    closePreview,
    togglePreview,
  };
}
