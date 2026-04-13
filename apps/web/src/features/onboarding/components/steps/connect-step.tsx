"use client";

import { Button } from "@openbeam/ui";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";

type Props = {
  onAdvance: (connectorId?: string) => void;
  onSkip: () => void;
};

const POPULAR_SOURCES = [
  { label: "Slack", icon: Icons.MessageSquare },
  { label: "Notion", icon: Icons.FileIcon },
  { label: "Google Drive", icon: Icons.Folder },
  { label: "GitHub", icon: Icons.GitBranch },
  { label: "Jira", icon: Icons.Task },
  { label: "Confluence", icon: Icons.BookOpen },
  { label: "Linear", icon: Icons.Layers },
  { label: "Gmail", icon: Icons.Mail },
];

export function ConnectStep({ onAdvance }: Props) {
  const router = useRouter();

  return (
    <div className="space-y-6 py-8">
      <div className="space-y-2">
        <h2 className="font-medium text-lg">Connect a data source</h2>
        <p className="text-muted-foreground text-sm">
          Choose a tool to connect. You can add more later.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {POPULAR_SOURCES.map((source) => (
          <button
            className="flex items-center gap-3 border border-border/50 px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-foreground/3"
            key={source.label}
            onClick={() => router.push("/connectors")}
            type="button"
          >
            <div className="flex size-6 shrink-0 items-center justify-center bg-foreground/3">
              <source.icon size={14} />
            </div>
            <span className="min-w-0 flex-1 truncate text-sm">
              {source.label}
            </span>
            <Icons.ChevronRight
              className="shrink-0 text-foreground/30"
              size={14}
            />
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={() => router.push("/connectors")}
          size="sm"
          variant="outline"
        >
          Browse all connectors
        </Button>
        <button
          className="text-muted-foreground text-xs transition-colors hover:text-foreground"
          onClick={() => onAdvance()}
          type="button"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
