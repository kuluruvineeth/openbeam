"use client";

import { Badge, Icons, Markdown } from "@openplane/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useArtifactDownload } from "../hooks/use-artifact-download";
import { formatContextualTimestamp } from "../lib/time-display";

type ArtifactType = "document" | "report" | "code" | "data" | "image" | "other";
type ArtifactStatus = "generating" | "completed" | "failed";

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

type MissionArtifactPanelProps = {
  artifacts: ArtifactSummary[];
  onRetry?: (artifactId: string) => void;
};

const TYPE_LABEL: Record<ArtifactType, string> = {
  document: "Document",
  report: "Report",
  code: "Code",
  data: "Data",
  image: "Image",
  other: "Output",
};

const STATUS_LABEL: Record<ArtifactStatus, string> = {
  generating: "Generating",
  completed: "Completed",
  failed: "Failed",
};

const STATUS_CLASS: Record<ArtifactStatus, string> = {
  generating:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  completed:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  failed: "border-destructive/40 bg-destructive/10 text-destructive",
};

function getArtifactIcon(type: ArtifactType) {
  switch (type) {
    case "code":
      return Icons.FileCode;
    case "data":
      return Icons.Table;
    case "image":
      return Icons.FileImageIcon;
    case "report":
      return Icons.FileSpreadsheetIcon;
    case "document":
      return Icons.FileTextIcon;
    default:
      return Icons.File;
  }
}

function serializeArtifactContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (content === undefined || content === null) {
    return "No content captured for this output.";
  }

  try {
    return JSON.stringify(content, null, 2);
  } catch {
    return String(content);
  }
}

function buildArtifactExcerpt(content: unknown): string {
  const normalized = serializeArtifactContent(content)
    .replace(/[`*_#>[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) {
    return "No preview available";
  }
  return normalized.slice(0, 90);
}

export function MissionArtifactPanel({
  artifacts,
  onRetry: _onRetry,
}: MissionArtifactPanelProps) {
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(
    null
  );
  const [copied, setCopied] = useState(false);
  const { download } = useArtifactDownload();

  useEffect(() => {
    if (artifacts.length === 0) {
      setSelectedArtifactId(null);
      return;
    }

    const hasSelected = artifacts.some(
      (artifact) => artifact.artifactId === selectedArtifactId
    );
    if (!hasSelected) {
      setSelectedArtifactId(artifacts[0]?.artifactId ?? null);
    }
  }, [artifacts, selectedArtifactId]);

  const selectedArtifact = useMemo(
    () =>
      selectedArtifactId
        ? (artifacts.find(
            (artifact) => artifact.artifactId === selectedArtifactId
          ) ?? null)
        : null,
    [artifacts, selectedArtifactId]
  );

  const selectedContent = useMemo(
    () => serializeArtifactContent(selectedArtifact?.content),
    [selectedArtifact]
  );

  const handleSelect = useCallback((artifactId: string) => {
    setSelectedArtifactId(artifactId);
    setCopied(false);
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

  const handleCopy = useCallback(async () => {
    if (!selectedArtifact || typeof navigator === "undefined") {
      return;
    }

    await navigator.clipboard.writeText(selectedContent);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }, [selectedArtifact, selectedContent]);

  if (artifacts.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-md border border-border/60 bg-muted/20 px-6 py-12 text-center">
        <Icons.File className="mb-3 text-muted-foreground/70" size={24} />
        <p className="font-medium text-sm">No outputs captured yet</p>
        <p className="mt-1 max-w-sm text-muted-foreground text-xs">
          Results appear here from published artifacts, step outputs, or mission
          completion summaries.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[480px] flex-col overflow-hidden rounded-md border border-border/60">
      <div className="flex items-center gap-2 border-border/60 border-b px-3 py-2">
        <Icons.FileText size={14} />
        <span className="font-medium text-sm">Output Center</span>
        <Badge className="font-mono text-[10px]" variant="outline">
          {artifacts.length}
        </Badge>
        <span className="ml-auto hidden text-[11px] text-muted-foreground 2xl:block">
          Final and intermediate deliverables
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 2xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="w-full shrink-0 border-border/60 border-b 2xl:w-[360px] 2xl:border-r 2xl:border-b-0">
          <div className="no-scrollbar max-h-64 overflow-y-auto 2xl:h-full 2xl:max-h-none">
            {artifacts.map((artifact) => {
              const selected = artifact.artifactId === selectedArtifactId;
              const Icon = getArtifactIcon(artifact.type);

              return (
                <button
                  className={cn(
                    "w-full border-border/40 border-b px-3 py-2 text-left transition-colors last:border-b-0",
                    selected
                      ? "bg-muted/40"
                      : "hover:bg-muted/20 focus-visible:bg-muted/20"
                  )}
                  key={artifact.artifactId}
                  onClick={() => handleSelect(artifact.artifactId)}
                  type="button"
                >
                  <div className="flex items-start gap-2">
                    <Icon
                      className="mt-0.5 shrink-0 text-muted-foreground"
                      size={13}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{artifact.title}</p>
                      <p className="truncate text-[11px] text-muted-foreground/90">
                        {buildArtifactExcerpt(artifact.content)}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <span className="truncate">{artifact.agentName}</span>
                        <span>•</span>
                        <time className="tabular-nums">
                          {formatContextualTimestamp(
                            artifact.createdAt,
                            Date.now()
                          )}
                        </time>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
          {selectedArtifact ? (
            <div className="flex h-full min-h-0 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge className="text-[10px]" variant="outline">
                  {TYPE_LABEL[selectedArtifact.type]}
                </Badge>
                <Badge
                  className={cn(
                    "text-[10px]",
                    STATUS_CLASS[selectedArtifact.status]
                  )}
                  variant="outline"
                >
                  {STATUS_LABEL[selectedArtifact.status]}
                </Badge>
                <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
                  {formatContextualTimestamp(
                    selectedArtifact.createdAt,
                    Date.now()
                  )}
                </span>
              </div>

              <div>
                <h3 className="line-clamp-2 font-medium text-base">
                  {selectedArtifact.title}
                </h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {selectedArtifact.agentName} • v{selectedArtifact.version}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center gap-1 rounded-sm border border-border/60 px-2 py-1 text-muted-foreground text-xs transition-colors hover:bg-muted/40 hover:text-foreground"
                  onClick={handleCopy}
                  type="button"
                >
                  {copied ? (
                    <Icons.Check size={12} />
                  ) : (
                    <Icons.Copy size={12} />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  className="inline-flex items-center gap-1 rounded-sm border border-border/60 px-2 py-1 text-muted-foreground text-xs transition-colors hover:bg-muted/40 hover:text-foreground"
                  onClick={() => handleDownload(selectedArtifact)}
                  type="button"
                >
                  <Icons.Download size={12} />
                  Download
                </button>
              </div>

              <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto rounded-sm border border-border/60 bg-muted/20 px-3 py-2">
                {typeof selectedArtifact.content === "string" ? (
                  <Markdown
                    content={selectedContent}
                    showControls={false}
                    size="sm"
                    variant="compact"
                  />
                ) : (
                  <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-5">
                    {selectedContent}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              Select an output to preview
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export type { ArtifactStatus, ArtifactSummary, ArtifactType };
