import { PitchHeader } from "@/components/pitch/pitch-header";

export function SectionMoat() {
  return (
    <section className="relative flex min-h-screen flex-col bg-background px-8 py-12 lg:px-16">
      <PitchHeader label="Defensibility" />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-16">
        <div className="flex flex-col gap-6">
          <h2 className="font-serif text-[36px] text-foreground leading-[1.15] tracking-tight sm:text-[48px] lg:text-[64px]">
            Once you&apos;re the search layer,
            <br />
            you&apos;re infrastructure.
          </h2>
          <p className="max-w-2xl font-sans text-base text-muted-foreground leading-relaxed lg:text-lg">
            Glean owns digital search. Samsara owns hardware telemetry. Nobody
            owns the layer between them. Open source gets data flowing in under
            30 minutes. Once three sources are connected, cross-source
            intelligence crosses the usefulness threshold — and switching cost
            compounds from day one.
          </p>
        </div>

        <div className="mx-auto w-full max-w-4xl">
          <svg className="h-auto w-full" role="img" viewBox="0 0 800 420">
            <title>Defensibility flywheel</title>

            <defs>
              <marker
                id="arrow-w"
                markerHeight="8"
                markerWidth="8"
                orient="auto"
                refX="6"
                refY="4"
              >
                <path
                  d="M 0,0 L 8,4 L 0,8 Z"
                  fill="hsl(var(--foreground))"
                  opacity="0.5"
                />
              </marker>
            </defs>

            {/* Top — Data Gravity */}
            <rect
              fill="hsl(var(--card))"
              height="70"
              rx="6"
              stroke="hsl(var(--foreground))"
              strokeOpacity="0.2"
              strokeWidth="1"
              width="220"
              x="290"
              y="10"
            />
            <text
              fill="hsl(var(--foreground))"
              fillOpacity="0.4"
              fontFamily="monospace"
              fontSize="9"
              letterSpacing="0.1em"
              textAnchor="middle"
              x="400"
              y="36"
            >
              DATA GRAVITY
            </text>
            <text
              fill="hsl(var(--foreground))"
              fontFamily="monospace"
              fontSize="14"
              textAnchor="middle"
              x="400"
              y="60"
            >
              More sources connected
            </text>

            {/* Right — Intelligence */}
            <rect
              fill="hsl(var(--card))"
              height="70"
              rx="6"
              stroke="hsl(var(--foreground))"
              strokeOpacity="0.15"
              strokeWidth="1"
              width="220"
              x="560"
              y="170"
            />
            <text
              fill="hsl(var(--foreground))"
              fillOpacity="0.4"
              fontFamily="monospace"
              fontSize="9"
              letterSpacing="0.1em"
              textAnchor="middle"
              x="670"
              y="196"
            >
              INTELLIGENCE
            </text>
            <text
              fill="hsl(var(--foreground) / 0.75)"
              fontFamily="monospace"
              fontSize="14"
              textAnchor="middle"
              x="670"
              y="220"
            >
              Cross-source patterns
            </text>

            {/* Bottom — Dependency */}
            <rect
              fill="hsl(var(--card))"
              height="70"
              rx="6"
              stroke="hsl(var(--foreground))"
              strokeOpacity="0.1"
              strokeWidth="1"
              width="220"
              x="290"
              y="340"
            />
            <text
              fill="hsl(var(--foreground))"
              fillOpacity="0.4"
              fontFamily="monospace"
              fontSize="9"
              letterSpacing="0.1em"
              textAnchor="middle"
              x="400"
              y="366"
            >
              DEPENDENCY
            </text>
            <text
              fill="hsl(var(--muted-foreground))"
              fontFamily="monospace"
              fontSize="14"
              textAnchor="middle"
              x="400"
              y="390"
            >
              Agents built on top
            </text>

            {/* Left — Demand */}
            <rect
              fill="hsl(var(--card))"
              height="70"
              rx="6"
              stroke="hsl(var(--foreground))"
              strokeOpacity="0.15"
              strokeWidth="1"
              width="220"
              x="20"
              y="170"
            />
            <text
              fill="hsl(var(--foreground))"
              fillOpacity="0.4"
              fontFamily="monospace"
              fontSize="9"
              letterSpacing="0.1em"
              textAnchor="middle"
              x="130"
              y="196"
            >
              DEMAND
            </text>
            <text
              fill="hsl(var(--foreground) / 0.75)"
              fontFamily="monospace"
              fontSize="14"
              textAnchor="middle"
              x="130"
              y="220"
            >
              Users need more sources
            </text>

            {/* Curved connectors */}
            <path
              d="M 510,50 C 560,50 580,120 580,170"
              fill="none"
              markerEnd="url(#arrow-w)"
              stroke="hsl(var(--foreground))"
              strokeOpacity="0.2"
              strokeWidth="1.5"
            />
            <path
              d="M 600,240 C 560,300 520,340 510,365"
              fill="none"
              markerEnd="url(#arrow-w)"
              stroke="hsl(var(--foreground))"
              strokeOpacity="0.15"
              strokeWidth="1.5"
            />
            <path
              d="M 290,375 C 240,375 220,300 220,240"
              fill="none"
              markerEnd="url(#arrow-w)"
              stroke="hsl(var(--foreground))"
              strokeOpacity="0.2"
              strokeWidth="1.5"
            />
            <path
              d="M 180,170 C 220,110 260,60 290,45"
              fill="none"
              markerEnd="url(#arrow-w)"
              stroke="hsl(var(--foreground))"
              strokeOpacity="0.2"
              strokeWidth="1.5"
            />

            {/* Center */}
            <text
              fill="hsl(var(--foreground))"
              fillOpacity="0.2"
              fontFamily="monospace"
              fontSize="11"
              textAnchor="middle"
              x="400"
              y="205"
            >
              The knowledge layer
            </text>
            <text
              fill="hsl(var(--foreground))"
              fillOpacity="0.2"
              fontFamily="monospace"
              fontSize="11"
              textAnchor="middle"
              x="400"
              y="222"
            >
              becomes infrastructure
            </text>
          </svg>
        </div>

        <p className="mx-auto max-w-2xl text-center font-serif text-[20px] text-muted-foreground leading-relaxed lg:text-[22px]">
          You can switch your CRM. You can switch your ticketing tool. You
          don&apos;t switch the layer your robots think through.
        </p>
      </div>
    </section>
  );
}
