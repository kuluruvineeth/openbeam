"use client";

import { Button } from "@openbeam/ui";
import { Icons } from "@/components/icons";

type Props = {
  onAdvance: () => void;
  onSkip: () => void;
};

export function WelcomeStep({ onAdvance, onSkip }: Props) {
  return (
    <div className="space-y-8 py-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Icons.Search size={20} />
          <h1 className="font-medium text-xl">Welcome to OpenBeam</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Search across all your tools in one place. Connect a data source to
          get started.
        </p>
      </div>

      <div className="space-y-3">
        <Feature
          icon={<Icons.Link size={14} />}
          text="Connect Slack, Notion, Google Drive, and 100+ more"
        />
        <Feature
          icon={<Icons.Search size={14} />}
          text="Search everything with AI-powered results"
        />
        <Feature
          icon={<Icons.BotIcon size={14} />}
          text="Ask questions and get answers grounded in your data"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={onAdvance} size="sm">
          Get started
        </Button>
        <button
          className="text-muted-foreground text-xs transition-colors hover:text-foreground"
          onClick={onSkip}
          type="button"
        >
          Skip setup
        </button>
      </div>
    </div>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex size-7 shrink-0 items-center justify-center border border-border/50 bg-foreground/3">
        {icon}
      </div>
      <span className="text-foreground/80">{text}</span>
    </div>
  );
}
