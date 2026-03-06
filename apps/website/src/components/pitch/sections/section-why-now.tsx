import { PitchHeader } from "@/components/pitch/pitch-header";

export function SectionWhyNow() {
  return (
    <section className="relative flex min-h-screen flex-col bg-background px-8 py-12 lg:px-16">
      <PitchHeader label="Why Now" />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-16">
        <div className="flex flex-col gap-6">
          <h2 className="font-serif text-[36px] text-foreground leading-[1.15] tracking-tight sm:text-[48px] lg:text-[64px]">
            Robots are shipping.
            <br />
            Their data has nowhere to go.
          </h2>
          <p className="max-w-2xl font-sans text-base text-muted-foreground leading-relaxed lg:text-lg">
            Physical AI is deploying at factory scale. Every machine generates
            terabytes no platform can ingest. Regulation is forcing data
            processing on-prem. And the 30-year incumbents are retreating — PTC
            is divesting ThingWorx for $725M.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          <div className="flex flex-col gap-4">
            <p className="font-mono text-foreground/60 text-xs uppercase tracking-widest">
              Deploying at scale
            </p>
            <div className="border-l-2 border-l-foreground/30 py-1 pl-6">
              <p className="font-mono text-[40px] text-foreground leading-none lg:text-[56px]">
                750K+
              </p>
              <p className="mt-2 text-foreground text-sm">
                Industrial robots deployed worldwide
              </p>
            </div>
            <p className="pl-6 text-muted-foreground text-sm">
              $40.7B robotics VC in 2025. Goldman revised humanoid TAM 6× to
              $38B.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <p className="font-mono text-foreground/60 text-xs uppercase tracking-widest">
              Data tsunami
            </p>
            <div className="border-l-2 border-l-foreground/25 py-1 pl-6">
              <p className="font-mono text-[40px] text-foreground/75 leading-none lg:text-[56px]">
                19 TB/hr
              </p>
              <p className="mt-2 text-foreground text-sm">
                Per autonomous vehicle — 99% goes unused
              </p>
            </div>
            <p className="pl-6 text-muted-foreground text-sm">
              A fleet of 1,000 robots generates petabytes per week. No platform
              exists to search it.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <p className="font-mono text-foreground/60 text-xs uppercase tracking-widest">
              Forced on-prem
            </p>
            <div className="border-l-2 border-l-muted-foreground/30 py-1 pl-6">
              <p className="font-mono text-[40px] text-muted-foreground leading-none lg:text-[56px]">
                86%
              </p>
              <p className="mt-2 text-foreground text-sm">
                Of CIOs planning cloud repatriation
              </p>
            </div>
            <p className="pl-6 text-muted-foreground text-sm">
              DORA live. CMMC Phase 1 live. EU AI Act enforcing Aug 2026.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
