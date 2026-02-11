"use client";

import {
  Icons,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@openplane/ui";
import { useCallback, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import type { ArtifactStatus, ArtifactType } from "./artifact-card";
import { ArtifactDiffView } from "./artifact-diff-view";
import { ArtifactPreview } from "./artifact-preview";
import {
  type ArtifactVersion,
  ArtifactVersionHistory,
} from "./artifact-version-history";

type ArtifactDetailData = {
  artifactId: string;
  title: string;
  type: ArtifactType;
  agentName: string;
  version: number;
  status: ArtifactStatus;
  createdAt: number;
  previewUrl?: string;
  content?: unknown;
};

type ArtifactDetailDrawerProps = {
  artifact: ArtifactDetailData | null;
  versions: ArtifactVersion[];
  isOpen: boolean;
  onClose: () => void;
  onDownload: () => void;
};

export function ArtifactDetailDrawer({
  artifact,
  versions,
  isOpen,
  onClose,
  onDownload,
}: ArtifactDetailDrawerProps) {
  const [selectedVersion, setSelectedVersion] = useState(
    artifact?.version ?? 1
  );
  const [showDiff, setShowDiff] = useState(false);

  const navigatePrev = useCallback(() => {
    setSelectedVersion((v) => Math.max(v - 1, 1));
  }, []);

  const navigateNext = useCallback(() => {
    setSelectedVersion((v) => Math.min(v + 1, versions.length));
  }, [versions.length]);

  useHotkeys("[", navigatePrev, { enabled: isOpen });
  useHotkeys("]", navigateNext, { enabled: isOpen });

  if (!artifact) {
    return null;
  }

  const previousContent =
    showDiff && selectedVersion > 1
      ? String(artifact.content ?? "")
      : undefined;

  return (
    <Sheet onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <SheetContent
        className="w-[500px] overflow-y-auto p-0 sm:max-w-[500px]"
        side="right"
      >
        <SheetHeader className="border-border/50 border-b px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-base">
                {artifact.title}
              </SheetTitle>
              <div className="mt-0.5 text-muted-foreground text-xs">
                {artifact.agentName}
              </div>
            </div>
            <button
              className="shrink-0 rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={onDownload}
              type="button"
            >
              <Icons.Download size={16} />
            </button>
          </div>
        </SheetHeader>

        {versions.length > 1 && (
          <ArtifactVersionHistory
            onDiffToggle={() => setShowDiff((d) => !d)}
            onVersionSelect={setSelectedVersion}
            selectedVersion={selectedVersion}
            showDiff={showDiff}
            versions={versions}
          />
        )}

        <div className="p-4">
          {showDiff && previousContent !== undefined ? (
            <ArtifactDiffView
              current={String(artifact.content ?? "")}
              previous={previousContent}
              type={artifact.type}
            />
          ) : (
            <ArtifactPreview
              content={artifact.content}
              title={artifact.title}
              type={artifact.type}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export type { ArtifactDetailData };
