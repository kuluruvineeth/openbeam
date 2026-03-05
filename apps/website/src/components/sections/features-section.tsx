import { cn } from "@/lib/cn";

interface Feature {
  title: string;
  description: string;
  stat?: string;
  statLabel?: string;
  icon: React.FC;
}

const HERO_FEATURES: [Feature, Feature] = [
  {
    title: "Enterprise Search",
    description:
      "Semantic + keyword hybrid search across every connected source. Find anything in milliseconds, not minutes.",
    stat: "< 200ms",
    statLabel: "p99 latency",
    icon: SearchIcon,
  },
  {
    title: "AI Agents",
    description:
      "Autonomous agents with multi-step reasoning. Compose tools, delegate tasks, and take action across your stack.",
    stat: "129+",
    statLabel: "tools available",
    icon: AgentIcon,
  },
];

const MID_FEATURES: Feature[] = [
  {
    title: "Mission Control",
    description:
      "Multi-agent squads that orchestrate complex workflows. Parse RFPs, draft responses, triage tickets — autonomously.",
    stat: "11",
    statLabel: "agent patterns",
    icon: MissionIcon,
  },
  {
    title: "Connectors",
    description:
      "Gmail, Slack, Notion, GitHub, Linear, and more. Full and incremental sync keeps your index current.",
    stat: "23",
    statLabel: "integrations",
    icon: ConnectorIcon,
  },
  {
    title: "Real-Time Sync",
    description:
      "Temporal-powered workflows for durable, exactly-once sync. Webhook triggers, cursor-based incremental updates.",
    icon: SyncIcon,
  },
];

const SMALL_FEATURES: Feature[] = [
  {
    title: "Self-Hosted",
    description: "Docker, one command. Your servers, your data.",
    icon: ServerIcon,
  },
  {
    title: "Edge AI",
    description: "Local models, offline search, on-device RAG.",
    icon: EdgeIcon,
  },
  {
    title: "Video Search",
    description: "Transcription, frame analysis, temporal search.",
    icon: VideoIcon,
  },
  {
    title: "Open Source",
    description: "MIT licensed. No vendor lock-in, ever.",
    icon: CodeIcon,
  },
];

function FeatureCard({
  feature,
  className,
}: {
  feature: Feature;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group border border-border/50 bg-background p-5 transition-colors duration-200 hover:border-border sm:p-6",
        className
      )}
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center border border-border bg-card">
        <feature.icon />
      </div>
      <h3 className="font-sans text-base text-foreground">{feature.title}</h3>
      <p className="mt-1.5 font-sans text-muted-foreground text-sm leading-relaxed">
        {feature.description}
      </p>
      {feature.stat && (
        <div className="mt-4 border-border/50 border-t pt-4">
          <span className="font-sans text-2xl text-foreground">
            {feature.stat}
          </span>
          <span className="ml-2 font-sans text-muted-foreground text-xs tracking-wide">
            {feature.statLabel}
          </span>
        </div>
      )}
    </div>
  );
}

export function FeaturesSection() {
  return (
    <section className="bg-background py-16 lg:py-24" id="features">
      <div className="mx-auto max-w-[1400px] px-4">
        <div className="mb-12 text-center">
          <h2 className="font-serif text-2xl text-foreground">
            Everything you need for enterprise search
          </h2>
          <p className="mx-auto mt-3 hidden max-w-xl font-sans text-muted-foreground text-sm leading-relaxed sm:block">
            Connect your tools, search across everything, and let AI agents
            automate your workflows.
          </p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <FeatureCard className="h-full" feature={HERO_FEATURES[0]} />
            </div>
            <div className="lg:col-span-5">
              <FeatureCard className="h-full" feature={HERO_FEATURES[1]} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {MID_FEATURES.map((feature) => (
              <FeatureCard feature={feature} key={feature.title} />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {SMALL_FEATURES.map((feature) => (
              <FeatureCard feature={feature} key={feature.title} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="text-muted-foreground"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="20"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function AgentIcon() {
  return (
    <svg
      aria-hidden="true"
      className="text-muted-foreground"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="20"
    >
      <path d="M12 8V4H8" />
      <rect height="12" rx="2" width="16" x="4" y="8" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}

function MissionIcon() {
  return (
    <svg
      aria-hidden="true"
      className="text-muted-foreground"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="20"
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" x2="4" y1="22" y2="15" />
    </svg>
  );
}

function ConnectorIcon() {
  return (
    <svg
      aria-hidden="true"
      className="text-muted-foreground"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="20"
    >
      <path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3" />
      <line x1="8" x2="16" y1="12" y2="12" />
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg
      aria-hidden="true"
      className="text-muted-foreground"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="20"
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

function ServerIcon() {
  return (
    <svg
      aria-hidden="true"
      className="text-muted-foreground"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="20"
    >
      <rect height="8" rx="2" ry="2" width="20" x="2" y="2" />
      <rect height="8" rx="2" ry="2" width="20" x="2" y="14" />
      <line x1="6" x2="6.01" y1="6" y2="6" />
      <line x1="6" x2="6.01" y1="18" y2="18" />
    </svg>
  );
}

function EdgeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="text-muted-foreground"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="20"
    >
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" x2="12.01" y1="20" y2="20" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg
      aria-hidden="true"
      className="text-muted-foreground"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="20"
    >
      <rect height="14" rx="2" ry="2" width="18" x="3" y="5" />
      <polygon points="10 9 15 12 10 15 10 9" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="text-muted-foreground"
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="20"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}
