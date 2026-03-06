import { PitchHeader } from "@/components/pitch/pitch-header";

const milestones = [
  { tam: "$7B", phase: "NOW", description: "Enterprise search", shade: "0.3" },
  {
    tam: "$50B+",
    phase: "YEAR 2-3",
    description: "Physical operations platform",
    shade: "0.5",
  },
  {
    tam: "$143B",
    phase: "YEAR 5+",
    description: "OS for robots and physical AI",
    shade: "0.8",
  },
] as const;

export function SectionVision() {
  return (
    <section className="relative flex min-h-screen flex-col bg-background px-8 py-12 lg:px-16">
      <PitchHeader label="Vision" />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-16">
        <p className="mx-auto max-w-4xl text-center font-serif text-[32px] text-foreground leading-[1.15] tracking-tight sm:text-[42px] lg:text-[56px]">
          When robots need to understand a building, a process, or an
          organization — they query OpenBeam.
        </p>

        <div className="mx-auto w-full max-w-3xl">
          <div className="relative flex items-stretch justify-between">
            <div className="absolute top-1/2 right-0 left-0 h-px bg-gradient-to-r from-foreground/15 via-foreground/30 to-foreground/50" />

            {milestones.map((m) => (
              <div
                className="relative z-10 flex flex-col items-center gap-3"
                key={m.phase}
              >
                <div
                  className="flex h-28 w-28 items-center justify-center rounded-md border bg-card"
                  style={{
                    borderColor: `hsl(var(--foreground) / ${m.shade})`,
                    borderTopWidth: "2px",
                    borderTopColor: `hsl(var(--foreground) / ${Number(m.shade) + 0.2})`,
                  }}
                >
                  <p
                    className="font-mono text-2xl"
                    style={{
                      color: `hsl(var(--foreground) / ${Number(m.shade) + 0.2})`,
                    }}
                  >
                    {m.tam}
                  </p>
                </div>
                <p className="font-mono text-foreground text-xs">{m.phase}</p>
                <p className="max-w-[140px] text-center text-[11px] text-muted-foreground/70">
                  {m.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="mx-auto max-w-3xl text-center font-serif text-[20px] text-muted-foreground leading-relaxed lg:text-[22px]">
          AWS started as cheap servers. Stripe as seven lines of code. OpenBeam
          starts as the search layer for the physical world.
        </p>
      </div>
    </section>
  );
}
