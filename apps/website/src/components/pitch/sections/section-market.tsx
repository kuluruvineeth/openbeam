import { PitchHeader } from "@/components/pitch/pitch-header";

export function SectionMarket() {
  return (
    <section className="relative flex min-h-screen flex-col bg-background px-8 py-12 lg:px-16">
      <PitchHeader label="Market" />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-16">
        <div className="flex flex-col gap-6">
          <h2 className="font-serif text-[36px] text-foreground leading-[1.15] tracking-tight sm:text-[48px] lg:text-[64px]">
            A $7B market Glean proved.
            <br />A $50B+ market no one serves.
          </h2>
          <p className="max-w-2xl font-sans text-base text-muted-foreground leading-relaxed lg:text-lg">
            Glean proved enterprise search at $200M+ ARR. But physical
            operations has no unified search platform. Our beachhead: 47,000 US
            manufacturers with 500+ employees running disconnected digital and
            physical systems. At $50K average ACV, that&apos;s a $2.4B
            serviceable market before expansion.
          </p>
        </div>

        <div className="mx-auto w-full max-w-4xl">
          <svg className="h-auto w-full" role="img" viewBox="0 0 840 320">
            <title>Market expansion S-curves</title>

            <defs>
              <linearGradient id="heroFill" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="hsl(var(--foreground))"
                  stopOpacity="0.06"
                />
                <stop
                  offset="100%"
                  stopColor="hsl(var(--foreground))"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            {/* Axis */}
            <line
              className="stroke-border"
              strokeWidth="1"
              x1="60"
              x2="780"
              y1="260"
              y2="260"
            />

            {/* Tick marks */}
            <line
              className="stroke-border"
              strokeWidth="1"
              x1="140"
              x2="140"
              y1="260"
              y2="266"
            />
            <line
              className="stroke-border"
              strokeWidth="1"
              x1="370"
              x2="370"
              y1="260"
              y2="266"
            />
            <line
              className="stroke-border"
              strokeWidth="1"
              x1="600"
              x2="600"
              y1="260"
              y2="266"
            />

            {/* Enterprise Search — mature, plateauing */}
            <path
              className="stroke-muted-foreground"
              d="M 60,255 C 130,252 180,240 240,200 C 300,140 340,70 390,42 C 420,30 450,28 480,28"
              fill="none"
              strokeLinecap="round"
              strokeWidth="2"
            />
            <circle className="fill-muted-foreground" cx="480" cy="28" r="3" />
            <text
              className="fill-muted-foreground"
              fontFamily="monospace"
              fontSize="12"
              x="488"
              y="32"
            >
              $7B → $11B
            </text>

            {/* Physical Ops — hero curve */}
            <path
              className="stroke-foreground"
              d="M 230,260 L 230,255 C 300,253 360,245 420,200 C 480,135 510,60 560,35 C 590,24 620,22 660,22"
              fill="none"
              strokeLinecap="round"
              strokeWidth="2.5"
            />
            <path
              d="M 230,255 C 300,253 360,245 420,200 C 480,135 510,60 560,35 C 590,24 620,22 660,22 L 660,260 L 230,260 Z"
              fill="url(#heroFill)"
            />
            <circle className="fill-foreground" cx="660" cy="22" r="3" />
            <text
              className="fill-foreground"
              fontFamily="monospace"
              fontSize="12"
              x="668"
              y="26"
            >
              $50B+
            </text>

            {/* Edge AI — projected */}
            <path
              className="stroke-foreground"
              d="M 440,255 C 490,252 520,245 550,228 C 580,210 610,175 640,140 C 670,105 700,80 730,65"
              fill="none"
              opacity="0.4"
              strokeDasharray="6 3"
              strokeLinecap="round"
              strokeWidth="1.5"
            />
            <circle
              className="fill-foreground"
              cx="730"
              cy="65"
              opacity="0.4"
              r="3"
            />
            <text
              className="fill-foreground"
              fontFamily="monospace"
              fontSize="12"
              opacity="0.4"
              x="738"
              y="69"
            >
              $143B by 2034
            </text>

            {/* Timeline */}
            <text
              fontFamily="monospace"
              fontSize="10"
              letterSpacing="0.08em"
              style={{ fill: "hsl(var(--muted-foreground) / 0.7)" }}
              textAnchor="middle"
              x="140"
              y="284"
            >
              NOW
            </text>
            <text
              fontFamily="monospace"
              fontSize="10"
              letterSpacing="0.08em"
              style={{ fill: "hsl(var(--muted-foreground) / 0.7)" }}
              textAnchor="middle"
              x="370"
              y="284"
            >
              YEAR 2-3
            </text>
            <text
              fontFamily="monospace"
              fontSize="10"
              letterSpacing="0.08em"
              style={{ fill: "hsl(var(--muted-foreground) / 0.7)" }}
              textAnchor="middle"
              x="600"
              y="284"
            >
              YEAR 5+
            </text>
          </svg>
        </div>

        <div className="flex items-center justify-center gap-8 font-mono text-muted-foreground text-xs">
          <div className="flex items-center gap-2">
            <div className="h-px w-4 bg-muted-foreground" />
            <span>Enterprise Search</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-px w-4 bg-foreground" />
            <span>Physical Ops</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-px w-4 border-foreground border-t border-dashed opacity-40" />
            <span>Edge AI (projected)</span>
          </div>
        </div>
      </div>
    </section>
  );
}
