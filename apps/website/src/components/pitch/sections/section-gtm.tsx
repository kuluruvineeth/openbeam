import { PitchHeader } from "@/components/pitch/pitch-header";

export function SectionGtm() {
  return (
    <section className="relative flex min-h-screen flex-col bg-background px-8 py-12 lg:px-16">
      <PitchHeader label="Traction & Go-to-Market" />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-12">
        <div className="flex flex-col gap-4">
          <h2 className="font-serif text-[36px] text-foreground leading-[1.15] tracking-tight sm:text-[48px] lg:text-[64px]">
            One person. Twelve months.
            <br />
            Production-ready.
          </h2>
          <p className="max-w-2xl font-sans text-base text-muted-foreground leading-relaxed lg:text-lg">
            Every connector, every agent tool, every line of edge runtime —
            built by a single engineer. The same open source → enterprise path
            as GitLab ($15B), Elastic ($10B), and HashiCorp ($5B) — into a
            market none of them entered.
          </p>
        </div>

        {/* Big stats — like Problem slide */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="border-l-[3px] border-l-foreground/40 py-1 pl-6">
            <p className="font-mono text-[40px] text-foreground leading-none lg:text-[56px]">
              25+
            </p>
            <p className="mt-2 font-sans text-foreground text-sm">
              Connectors shipping
            </p>
            <p className="mt-1 text-muted-foreground text-xs">
              SaaS, IoT, industrial protocols, physical AI
            </p>
          </div>

          <div className="border-l-[3px] border-l-foreground/25 py-1 pl-6">
            <p className="font-mono text-[40px] text-foreground/75 leading-none lg:text-[56px]">
              100+
            </p>
            <p className="mt-2 font-sans text-foreground text-sm">
              AI tools &amp; agents
            </p>
            <p className="mt-1 text-muted-foreground text-xs">
              Search, RAG, orchestration, memory, canvas
            </p>
          </div>

          <div className="border-l-[3px] border-l-muted-foreground/40 py-1 pl-6">
            <p className="font-mono text-[40px] text-muted-foreground leading-none lg:text-[56px]">
              3
            </p>
            <p className="mt-2 font-sans text-foreground text-sm">
              Deployment targets
            </p>
            <p className="mt-1 text-muted-foreground text-xs">
              Cloud, on-prem, fully air-gapped
            </p>
          </div>
        </div>

        {/* GTM motion — like Platform stacked rows */}
        <div className="overflow-hidden rounded-md border border-border">
          <div className="flex items-center gap-6 border-b border-b-border border-l-[3px] border-l-foreground/60 bg-card px-6 py-5">
            <p className="w-20 shrink-0 font-mono text-foreground text-sm">
              Now
            </p>
            <div>
              <p className="font-sans text-foreground/80 text-sm">
                Open source launch
              </p>
              <p className="mt-0.5 text-muted-foreground/70 text-xs">
                GitHub + Hacker News + developer community. MIT licensed. Deploy
                in 30 minutes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 border-b border-b-border border-l-[3px] border-l-foreground/40 bg-card px-6 py-5">
            <p className="w-20 shrink-0 font-mono text-foreground/75 text-sm">
              Month 6
            </p>
            <div>
              <p className="font-sans text-foreground/80 text-sm">
                Design partners → first revenue
              </p>
              <p className="mt-0.5 text-muted-foreground/70 text-xs">
                3-5 manufacturing/logistics pilots. Pro upsell at $15/seat when
                teams exceed 10 users or need SSO.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 border-l-[3px] border-l-muted-foreground/50 bg-card px-6 py-5">
            <p className="w-20 shrink-0 font-mono text-muted-foreground text-sm">
              Month 12
            </p>
            <div>
              <p className="font-sans text-foreground/80 text-sm">
                Enterprise expand — custom pricing
              </p>
              <p className="mt-0.5 text-muted-foreground/70 text-xs">
                First air-gapped deployment. Usage-based physical ops pricing.
                Target: $50K+ ACV.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
