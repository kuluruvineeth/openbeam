import { PitchHeader } from "@/components/pitch/pitch-header";

const competitors = [
  {
    name: "Glean",
    has: "Digital search",
    missing:
      "Cloud-only architecture. Can't deploy at the edge. Will never go air-gapped — contradicts their entire stack.",
  },
  {
    name: "Onyx",
    has: "Digital search, open source",
    missing:
      "No physical connectors, no edge runtime, no industrial protocols. Digital-only.",
  },
  {
    name: "Samsara",
    has: "Physical telemetry",
    missing:
      "Hardware-bound. No digital knowledge search. No cross-source correlation.",
  },
  {
    name: "PTC / ThingWorx",
    has: "Physical ops, on-prem",
    missing:
      "Divesting for $725M. Legacy architecture, no AI, no search. The incumbent is leaving.",
  },
] as const;

export function SectionCompetition() {
  return (
    <section className="relative flex min-h-screen flex-col bg-background px-8 py-12 lg:px-16">
      <PitchHeader label="Competition" />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-16">
        <div className="flex flex-col gap-6">
          <h2 className="font-serif text-[36px] text-foreground leading-[1.15] tracking-tight sm:text-[48px] lg:text-[64px]">
            Glean can&apos;t go physical. Samsara can&apos;t do search. We do
            both.
          </h2>
          <p className="max-w-2xl font-sans text-base text-muted-foreground leading-relaxed lg:text-lg">
            Five capabilities define the full platform. No company has all five
            — because doing so requires edge-native architecture from day zero,
            not a bolt-on.
          </p>
        </div>

        <div className="flex flex-col">
          {competitors.map((competitor) => (
            <div
              className="flex flex-col gap-2 border-border/50 border-b py-5 sm:flex-row sm:items-start sm:gap-8"
              key={competitor.name}
            >
              <span className="w-40 shrink-0 font-mono text-foreground text-sm">
                {competitor.name}
              </span>
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[10px] text-muted-foreground/50 uppercase tracking-widest">
                  Has
                </span>
                <span className="font-sans text-muted-foreground text-sm">
                  {competitor.has}
                </span>
              </div>
              <div className="flex flex-col gap-1 sm:ml-8">
                <span className="font-mono text-[10px] text-muted-foreground/50 uppercase tracking-widest">
                  Missing
                </span>
                <span className="font-sans text-muted-foreground/70 text-sm">
                  {competitor.missing}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-md border-t-2 border-t-foreground/40 bg-foreground/[0.04] p-6">
          <div className="flex flex-col gap-3">
            <span className="font-mono font-semibold text-foreground text-sm">
              OpenBeam
            </span>
            <span className="font-sans text-foreground text-sm">
              Digital search + Physical ops + Edge/air-gap + Open source + AI
              agents
            </span>
            <span className="font-sans text-muted-foreground/70 text-sm">
              The only platform built edge-native from day zero.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
