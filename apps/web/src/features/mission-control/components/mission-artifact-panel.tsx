"use client";

import {
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icons,
} from "@openplane/ui";
import { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useArtifactDownload } from "../hooks/use-artifact-download";
import {
  ArtifactCard,
  type ArtifactStatus,
  type ArtifactType,
} from "./artifact-card";
import {
  type ArtifactDetailData,
  ArtifactDetailDrawer,
} from "./artifact-detail-drawer";
import { ArtifactListItem } from "./artifact-list-item";
import { type ArtifactView, ArtifactViewSwitch } from "./artifact-view-switch";

type ArtifactSummary = {
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

const ARTIFACT_TYPES: ArtifactType[] = [
  "document",
  "report",
  "code",
  "data",
  "image",
  "other",
];

type MissionArtifactPanelProps = {
  artifacts: ArtifactSummary[];
  onRetry?: (artifactId: string) => void;
};

export function MissionArtifactPanel({
  artifacts,
  onRetry: _onRetry,
}: MissionArtifactPanelProps) {
  const [view, setView] = useState<ArtifactView>("grid");
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(
    null
  );
  const [typeFilter, setTypeFilter] = useState<ArtifactType | "all">("all");

  const { download } = useArtifactDownload();

  const filteredArtifacts = useMemo(
    () =>
      typeFilter === "all"
        ? artifacts
        : artifacts.filter((a) => a.type === typeFilter),
    [artifacts, typeFilter]
  );

  const selectedArtifact = useMemo<ArtifactDetailData | null>(() => {
    if (!selectedArtifactId) {
      return null;
    }
    const found = artifacts.find((a) => a.artifactId === selectedArtifactId);
    return found ?? null;
  }, [artifacts, selectedArtifactId]);

  const selectedVersions = useMemo(() => {
    if (!selectedArtifact) {
      return [];
    }
    return Array.from({ length: selectedArtifact.version }, (_, i) => ({
      version: i + 1,
      createdAt: selectedArtifact.createdAt,
      agentName: selectedArtifact.agentName,
    }));
  }, [selectedArtifact]);

  const handleSelect = useCallback((artifactId: string) => {
    setSelectedArtifactId(artifactId);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedArtifactId(null);
  }, []);

  const handleDownload = useCallback(
    (artifact: ArtifactSummary) => {
      download({
        title: artifact.title,
        type: artifact.type,
        content: artifact.content,
      });
    },
    [download]
  );

  const handleSelectedDownload = useCallback(() => {
    if (selectedArtifact) {
      download({
        title: selectedArtifact.title,
        type: selectedArtifact.type,
        content: selectedArtifact.content,
      });
    }
  }, [selectedArtifact, download]);

  if (artifacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Icons.File className="mb-2 opacity-50" size={24} />
        <span className="text-sm">No artifacts yet</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">Artifacts</span>
          <Badge className="font-mono text-[10px]" variant="outline">
            {filteredArtifacts.length}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs transition-colors",
                  typeFilter !== "all"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
                type="button"
              >
                <Icons.Filter size={12} />
                {typeFilter === "all" ? "All types" : typeFilter}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={() => setTypeFilter("all")}>
                All types
              </DropdownMenuItem>
              {ARTIFACT_TYPES.map((t) => (
                <DropdownMenuItem key={t} onClick={() => setTypeFilter(t)}>
                  <span className="capitalize">{t}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <ArtifactViewSwitch onViewChange={setView} view={view} />
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredArtifacts.map((artifact) => (
            <ArtifactCard
              artifact={artifact}
              isSelected={artifact.artifactId === selectedArtifactId}
              key={artifact.artifactId}
              onSelect={() => handleSelect(artifact.artifactId)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col rounded-md border border-border/50">
          {filteredArtifacts.map((artifact) => (
            <ArtifactListItem
              artifact={artifact}
              isSelected={artifact.artifactId === selectedArtifactId}
              key={artifact.artifactId}
              onDownload={() => handleDownload(artifact)}
              onSelect={() => handleSelect(artifact.artifactId)}
            />
          ))}
        </div>
      )}

      <ArtifactDetailDrawer
        artifact={selectedArtifact}
        isOpen={selectedArtifactId !== null}
        onClose={handleClose}
        onDownload={handleSelectedDownload}
        versions={selectedVersions}
      />
    </div>
  );
}

export type { ArtifactSummary };
