import { PitchHeader } from "@/components/pitch/pitch-header";

export function SectionDemoAgents() {
  return (
    <section className="relative flex min-h-screen flex-col bg-background px-8 py-12 lg:px-16">
      <PitchHeader label="Edge-Native" />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-16">
        <div className="flex flex-col gap-6">
          <h2 className="font-serif text-[36px] text-foreground leading-[1.15] tracking-tight sm:text-[48px] lg:text-[64px]">
            Deploys anywhere.
            <br />
            Even air-gapped.
          </h2>
          <p className="max-w-2xl font-sans text-base text-muted-foreground leading-relaxed lg:text-lg">
            Most platforms require the cloud. OpenBeam runs fully disconnected —
            SQLite WAL for storage, BLAKE3 Merkle sync for integrity, quantized
            models for local AI inference. Same search, same agents, zero
            network dependency.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-6 rounded-md border border-border bg-card px-6 py-4">
            <div className="flex-1">
              <p className="font-mono text-muted-foreground text-sm">Cloud</p>
              <p className="mt-0.5 text-muted-foreground/70 text-sm">
                Managed SaaS. Zero infrastructure to manage.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 rounded-md border border-border bg-card px-6 py-4">
            <div className="flex-1">
              <p className="font-mono text-foreground/75 text-sm">On-Prem</p>
              <p className="mt-0.5 text-muted-foreground/70 text-sm">
                Your data center, your rules. SOC 2, DORA, CMMC compliant.
              </p>
            </div>
          </div>

          <div className="rounded-md border border-foreground/30 bg-foreground/[0.06] px-6 py-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-foreground text-sm">Air-Gapped</p>
                <p className="mt-1 text-muted-foreground/70 text-sm">
                  Full search and AI on commodity hardware. Factory floors,
                  defense facilities, offshore vessels. ITAR, CMMC, DORA
                  compliant.
                </p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="font-mono text-4xl text-foreground">0</p>
                <p className="font-mono text-foreground/40 text-xs">
                  bytes egress
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-8 font-mono text-muted-foreground/70 text-xs tracking-wider">
          <span>&lt; 200ms p99 on 500K+ docs</span>
          <span className="text-border">&middot;</span>
          <span>x86/ARM, 8GB RAM minimum</span>
          <span className="text-border">&middot;</span>
          <span>Tamper-proof BLAKE3 integrity</span>
        </div>
      </div>
    </section>
  );
}
