"use client";

import { useCallback } from "react";
import type { ArtifactType } from "../components/artifact-card";

const EXTENSION_MAP: Record<ArtifactType, string> = {
  document: ".md",
  report: ".md",
  code: ".ts",
  data: ".json",
  image: ".png",
  other: ".txt",
};

function sanitizeFilename(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function contentToBlob(content: unknown, type: ArtifactType): Blob {
  if (type === "data") {
    return new Blob([JSON.stringify(content, null, 2)], {
      type: "application/json",
    });
  }
  return new Blob([String(content ?? "")], { type: "text/plain" });
}

type DownloadableArtifact = {
  title: string;
  type: ArtifactType;
  content: unknown;
};

type UseArtifactDownloadReturn = {
  download: (artifact: DownloadableArtifact) => void;
};

export function useArtifactDownload(): UseArtifactDownloadReturn {
  const download = useCallback((artifact: DownloadableArtifact) => {
    const extension = EXTENSION_MAP[artifact.type];
    const filename = `${sanitizeFilename(artifact.title)}${extension}`;
    const blob = contentToBlob(artifact.content, artifact.type);
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();

    URL.revokeObjectURL(url);
  }, []);

  return { download };
}
