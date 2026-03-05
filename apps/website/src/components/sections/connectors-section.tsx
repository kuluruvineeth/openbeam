import { appLogos } from "@openplane/integrations/logos";
import Link from "next/link";
import { cn } from "@/lib/cn";

// ─── Data ───────────────────────────────────────────────────

const INNER_RING = [
  "Gmail",
  "Slack",
  "Linear",
  "Notion",
  "GitHub",
  "Samsara",
  "MQTT",
  "Matterport",
];

const OUTER_RING = [
  "Google Drive",
  "Verkada",
  "AWS IoT",
  "OPC-UA",
  "BACnet",
  "ThingsBoard",
  "Node-RED",
  "FHIR",
  "Viam",
  "SmartThings",
  "Azure IoT",
  "Omniverse",
];

const MARQUEE_CATEGORIES = [
  {
    label: "Productivity",
    connectors: [
      "Gmail",
      "Google Drive",
      "Slack",
      "Notion",
      "Linear",
      "GitHub",
    ],
  },
  {
    label: "IoT & Devices",
    connectors: ["Samsara", "Verkada", "AWS IoT", "SmartThings", "Azure IoT"],
  },
  {
    label: "Industrial",
    connectors: ["MQTT", "OPC-UA", "BACnet", "ThingsBoard", "Node-RED"],
  },
  {
    label: "Spatial & Health",
    connectors: ["Matterport", "FHIR", "Viam", "Omniverse"],
  },
];

// ─── Orbit visualization (desktop) ─────────────────────────

function OrbitRing({
  names,
  radius,
  orbitClass,
  counterClass,
}: {
  names: string[];
  radius: number;
  orbitClass: string;
  counterClass: string;
}) {
  const half = 22;

  return (
    <>
      <div
        className="absolute top-1/2 left-1/2 rounded-full border border-border/20 border-dashed"
        style={{
          width: radius * 2,
          height: radius * 2,
          marginLeft: -radius,
          marginTop: -radius,
        }}
      />
      <div className={cn("absolute inset-0", orbitClass)}>
        {names.map((name, index) => {
          const angle = (360 / names.length) * index;
          const rad = (angle * Math.PI) / 180;

          return (
            <div
              className="absolute top-1/2 left-1/2"
              key={name}
              style={{
                marginLeft: Math.cos(rad) * radius - half,
                marginTop: Math.sin(rad) * radius - half,
              }}
            >
              <div className={counterClass}>
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-border/50 bg-card"
                  title={name}
                >
                  <ConnectorIcon name={name} size={20} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function OrbitVisualization() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[600px]">
      <div className="-ml-7 -mt-7 absolute top-1/2 left-1/2 z-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card">
          <HubIcon />
        </div>
      </div>

      <OrbitRing
        counterClass="animate-[orbit_35s_linear_infinite_reverse]"
        names={INNER_RING}
        orbitClass="animate-[orbit_35s_linear_infinite]"
        radius={130}
      />
      <OrbitRing
        counterClass="animate-[orbit_55s_linear_infinite]"
        names={OUTER_RING}
        orbitClass="animate-[orbit_55s_linear_infinite_reverse]"
        radius={245}
      />
    </div>
  );
}

// ─── Marquee (mobile / tablet) ──────────────────────────────

function MarqueeRow({
  connectors,
  label,
  reverse,
}: {
  connectors: string[];
  label: string;
  reverse?: boolean;
}) {
  const items = [...connectors, ...connectors];

  return (
    <div className="space-y-2">
      <span className="px-4 font-sans text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </span>
      <div className="group relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent" />
        <div
          className={cn(
            "flex w-max gap-3 group-hover:[animation-play-state:paused]",
            reverse ? "animate-marquee-right" : "animate-marquee-left"
          )}
        >
          {items.map((name, i) => (
            <div
              className="flex items-center gap-2 border border-border/50 bg-card px-3 py-1.5"
              key={`${name}-${i}`}
            >
              <ConnectorIcon name={name} size={14} />
              <span className="whitespace-nowrap font-sans text-foreground text-sm">
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Section ────────────────────────────────────────────────

export function ConnectorsSection() {
  return (
    <section className="bg-background py-16 lg:py-24" id="connectors">
      <div className="mx-auto max-w-[1400px] px-4">
        <div className="mb-12 text-center">
          <h2 className="font-serif text-2xl text-foreground">
            Connect your entire stack
          </h2>
          <p className="mx-auto mt-3 hidden max-w-lg font-sans text-muted-foreground text-sm leading-relaxed sm:block">
            23 connectors across SaaS, IoT, industrial protocols, and spatial
            computing — with more shipping every week.
          </p>
        </div>

        <div className="hidden lg:block">
          <OrbitVisualization />
        </div>

        <div className="space-y-6 lg:hidden">
          {MARQUEE_CATEGORIES.map((category, index) => (
            <MarqueeRow
              connectors={category.connectors}
              key={category.label}
              label={category.label}
              reverse={index % 2 === 1}
            />
          ))}
        </div>

        <div className="mt-10 flex items-center justify-center gap-6 font-sans text-sm">
          <Link
            className="text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
            href="/connectors/"
          >
            View all connectors
          </Link>
          <span className="hidden h-4 w-px bg-border sm:block" />
          <a
            className="text-muted-foreground transition-colors hover:text-foreground"
            href="https://github.com/openbeam/openbeam/issues/new?template=connector_request.md"
          >
            Request a connector
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── ConnectorIcon ──────────────────────────────────────────

const NAME_TO_APP_ID: Record<string, string> = {
  Gmail: "GMAIL",
  "Google Drive": "GOOGLE_DRIVE",
  Slack: "SLACK",
  Notion: "NOTION",
  Linear: "LINEAR",
  GitHub: "GITHUB",
  Samsara: "SAMSARA",
  MQTT: "MQTT",
  "OPC-UA": "OPCUA",
  BACnet: "BACNET",
  ThingsBoard: "THINGSBOARD",
  "Node-RED": "NODERED",
  Omniverse: "OMNIVERSE",
  Matterport: "MATTERPORT",
  Viam: "VIAM",
  FHIR: "FHIR",
  Verkada: "VERKADA",
  "AWS IoT": "AWS_IOT",
  "Azure IoT": "AZURE_IOT",
  SmartThings: "SMARTTHINGS",
};

function ConnectorIcon({ name, size = 20 }: { name: string; size?: number }) {
  const appId = NAME_TO_APP_ID[name];
  const LogoComponent = appId ? appLogos[appId] : undefined;

  if (LogoComponent) {
    return <LogoComponent size={size} />;
  }

  return (
    <span
      className="font-mono text-muted-foreground/60"
      style={{ fontSize: Math.round(size * 0.65) }}
    >
      {name.charAt(0)}
    </span>
  );
}

// ─── Hub icon ───────────────────────────────────────────────

function HubIcon() {
  return (
    <svg
      aria-hidden="true"
      className="text-foreground"
      fill="none"
      height="24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="24"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
