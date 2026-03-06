import { PitchHeader } from "@/components/pitch/pitch-header";

export function SectionSolution() {
  return (
    <section className="relative flex min-h-screen flex-col bg-background px-8 py-12 lg:px-16">
      <PitchHeader label="The Solution" />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-12">
        <div className="flex flex-col gap-6">
          <h2 className="font-serif text-[36px] text-foreground leading-[1.15] tracking-tight sm:text-[48px] lg:text-[64px]">
            One query across sensors and SaaS.
            <br />
            Answers in 200ms.
          </h2>
          <p className="max-w-xl font-sans text-base text-muted-foreground leading-relaxed">
            A factory engineer asks why Line 3 tripped last night. OpenBeam
            synthesizes the OPC-UA sensor spike, the Slack thread from night
            shift, and the equipment manual from Confluence — one answer, three
            data planes, 200ms.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-md border-border border-x border-t-2 border-t-foreground/30 border-b bg-foreground/[0.02] p-6">
              <p className="mb-4 font-mono text-foreground text-xs uppercase tracking-widest">
                Digital Knowledge
                <span className="ml-2 text-foreground/40">9 connectors</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: "Slack", primary: true },
                  { name: "Jira", primary: true },
                  { name: "GitHub", primary: true },
                  { name: "Notion", primary: true },
                  { name: "Gmail", primary: true },
                  { name: "Confluence", primary: false },
                  { name: "Linear", primary: false },
                  { name: "Salesforce", primary: false },
                  { name: "Google Drive", primary: false },
                ].map((c) => (
                  <span
                    className={`rounded-sm bg-foreground/8 px-3 py-1.5 font-mono text-[11px] tracking-wide ${c.primary ? "text-foreground/80" : "text-foreground/40"}`}
                    key={c.name}
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-md border-border border-x border-t-2 border-t-muted-foreground/40 border-b bg-muted-foreground/[0.02] p-6">
              <p className="mb-4 font-mono text-muted-foreground text-xs uppercase tracking-widest">
                Physical Operations
                <span className="ml-2 text-muted-foreground/50">
                  8 connectors
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: "MQTT", primary: true },
                  { name: "OPC-UA", primary: true },
                  { name: "BACnet", primary: true },
                  { name: "Samsara", primary: true },
                  { name: "Verkada", primary: true },
                  { name: "SmartThings", primary: false },
                  { name: "AWS IoT", primary: false },
                  { name: "ThingsBoard", primary: false },
                ].map((c) => (
                  <span
                    className={`rounded-sm bg-muted-foreground/8 px-3 py-1.5 font-mono text-[11px] tracking-wide ${c.primary ? "text-muted-foreground" : "text-muted-foreground/50"}`}
                    key={c.name}
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mx-auto h-px w-full max-w-md bg-gradient-to-r from-foreground/20 via-foreground/40 to-foreground/20" />

          <div className="rounded-md bg-foreground/[0.06] px-6 py-5">
            <p className="font-mono text-foreground/60 text-xs uppercase tracking-widest">
              One Unified Platform
            </p>
            <p className="mt-2 font-serif text-foreground text-xl lg:text-2xl">
              Search across sensors and SaaS. AI agents that act. Cloud,
              on-prem, or air-gapped.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
