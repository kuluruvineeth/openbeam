"use client";

import { appLogos } from "@openbeam/integrations/logos";
import type { ReactNode } from "react";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";

type BannerItem =
  | { type: "text"; content: string; emphasis?: boolean }
  | { type: "data"; content: string }
  | { type: "link"; content: string; href: string; icon?: ReactNode }
  | { type: "connectors" }
  | { type: "separator" };

const ENTERPRISE_CONNECTORS = [
  { id: "SLACK", label: "Slack" },
  { id: "GMAIL", label: "Gmail" },
  { id: "GOOGLE_DRIVE", label: "Drive" },
  { id: "NOTION", label: "Notion" },
  { id: "LINEAR", label: "Linear" },
  { id: "GITHUB", label: "GitHub" },
  { id: "SAMSARA", label: "Samsara" },
  { id: "MQTT", label: "MQTT" },
  { id: "OPCUA", label: "OPC-UA" },
  { id: "BACNET", label: "BACnet" },
  { id: "THINGSBOARD", label: "ThingsBoard" },
  { id: "NODERED", label: "Node-RED" },
  { id: "OMNIVERSE", label: "Omniverse" },
  { id: "MATTERPORT", label: "Matterport" },
  { id: "VIAM", label: "Viam" },
  { id: "FHIR", label: "FHIR" },
  { id: "NVD", label: "NVD" },
  { id: "CISA_KEV", label: "CISA KEV" },
  { id: "MITRE_ATTACK", label: "MITRE" },
  { id: "OWASP", label: "OWASP" },
] as const;

const BANNER_ITEMS: BannerItem[] = [
  {
    type: "text",
    content: "You're searching 264K+ public security docs right now",
    emphasis: true,
  },
  { type: "separator" },
  { type: "data", content: "NVD · MITRE ATT&CK · OWASP · CISA KEV" },
  { type: "separator" },
  { type: "text", content: "Now imagine this across your entire stack" },
  { type: "connectors" },
  { type: "separator" },
  { type: "data", content: "25+ connectors · AI agents · CLI · API" },
  { type: "separator" },
  {
    type: "text",
    content: "Solo builder · open source · 3 nodes · ~$500/mo compute",
  },
  { type: "separator" },
  {
    type: "link",
    content: "GitHub",
    href: "https://github.com/kuluruvineeth/openbeam",
    icon: <Icons.GitBranch size={12} />,
  },
  { type: "separator" },
  { type: "text", content: "More datasets planned — limited by compute" },
  { type: "separator" },
  {
    type: "link",
    content: "Help us scale",
    href: "https://github.com/sponsors/kuluruvineeth",
  },
];

function ConnectorChip({ id, label }: { id: string; label: string }) {
  const Logo = appLogos[id];
  if (!Logo) {
    return null;
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-sm border border-border/40 bg-card p-1.5 transition-colors hover:border-border"
      title={label}
    >
      <Logo size={16} />
    </span>
  );
}

function Separator({ index }: { index: number }) {
  return (
    <span className="h-3.5 w-px shrink-0 bg-border/60" key={`sep-${index}`} />
  );
}

function MarqueeTrack() {
  const items = [...BANNER_ITEMS, ...BANNER_ITEMS];

  return (
    <div
      className={cn(
        "flex w-max animate-[marquee-left_70s_linear_infinite] items-center gap-8"
      )}
    >
      {items.map((item, i) => {
        if (item.type === "separator") {
          return <Separator index={i} key={`sep-${i}`} />;
        }

        if (item.type === "connectors") {
          return (
            <span
              className="inline-flex items-center gap-2"
              key={`connectors-${i}`}
            >
              {ENTERPRISE_CONNECTORS.map((c) => (
                <ConnectorChip id={c.id} key={`${c.id}-${i}`} label={c.label} />
              ))}
            </span>
          );
        }

        if (item.type === "link") {
          return (
            <a
              className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium text-[13px] text-foreground transition-colors hover:text-foreground/70"
              href={item.href}
              key={`${item.content}-${i}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              {item.icon}
              <span className="underline decoration-foreground/25 underline-offset-4">
                {item.content}
              </span>
            </a>
          );
        }

        if (item.type === "data") {
          return (
            <span
              className="whitespace-nowrap font-mono text-foreground/50 text-xs tracking-wide"
              key={`${item.content}-${i}`}
            >
              {item.content}
            </span>
          );
        }

        return (
          <span
            className={cn(
              "whitespace-nowrap",
              item.emphasis
                ? "font-semibold text-[13px] text-foreground/90"
                : "text-muted-foreground text-xs"
            )}
            key={`${item.content}-${i}`}
          >
            {item.content}
          </span>
        );
      })}
    </div>
  );
}

export function ExploreBanner() {
  return (
    <div className="group relative w-full shrink-0 overflow-hidden border-border/30 border-b bg-card/30 py-3.5">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-28 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-28 bg-gradient-to-l from-background to-transparent" />
      <div className="group-hover:[&>div]:[animation-play-state:paused]">
        <MarqueeTrack />
      </div>
    </div>
  );
}
