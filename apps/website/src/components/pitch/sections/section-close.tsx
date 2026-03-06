import { PitchHeader } from "@/components/pitch/pitch-header";

const allocation = [
  {
    label: "Engineering",
    pct: 60,
    detail: "3 engineers → 75 connectors, production edge runtime",
  },
  {
    label: "Go-to-Market",
    pct: 25,
    detail: "DevRel + 1 AE → 10 enterprise design partners",
  },
  {
    label: "Infrastructure",
    pct: 10,
    detail: "Edge test lab, SOC 2 certification",
  },
  { label: "Operations", pct: 5, detail: "Legal, ops" },
] as const;

export function SectionClose() {
  return (
    <section className="relative flex min-h-screen flex-col bg-background px-8 py-12 lg:px-16">
      <PitchHeader label="The Ask" />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-12">
        <div className="text-center">
          <p className="font-mono text-[72px] text-foreground leading-none sm:text-[96px] lg:text-[120px]">
            $4M
          </p>
          <p className="mt-2 font-serif text-2xl text-foreground">Seed Round</p>
        </div>

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <div className="flex h-2 w-full overflow-hidden rounded-full">
            {allocation.map((item, i) => (
              <div
                className="h-full"
                key={item.label}
                style={{
                  width: `${item.pct}%`,
                  backgroundColor: `hsl(var(--foreground) / ${0.5 - i * 0.1})`,
                }}
              />
            ))}
          </div>
          <div className="flex justify-between">
            {allocation.map((item, i) => (
              <div
                className="flex flex-col"
                key={item.label}
                style={{ width: `${Math.max(item.pct, 12)}%` }}
              >
                <p className="font-sans text-foreground text-xs">
                  {item.label}
                </p>
                <p
                  className="font-mono text-xs"
                  style={{ color: `hsl(var(--foreground) / ${0.6 - i * 0.1})` }}
                >
                  {item.pct}%
                </p>
                <p className="text-[10px] text-muted-foreground/70">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-3xl space-y-3 text-center">
          <p className="font-serif text-[24px] text-muted-foreground leading-[1.2] sm:text-[28px] lg:text-[36px]">
            Every enterprise will search across sensors and SaaS.
          </p>
          <p className="font-serif text-[24px] text-foreground leading-[1.2] sm:text-[28px] lg:text-[36px]">
            The company that owns this layer becomes infrastructure.
          </p>
        </div>

        <p className="pt-4 text-center font-serif text-[36px] text-foreground leading-tight sm:text-[48px] lg:text-[72px]">
          We’re building it.
        </p>

        <div className="flex flex-col items-center">
          <a
            className="rounded-md bg-foreground px-12 py-4 font-mono text-background text-base transition-colors hover:bg-foreground/90"
            href="https://openbeam.work"
          >
            Schedule a conversation &rarr;
          </a>
        </div>
      </div>
    </section>
  );
}
