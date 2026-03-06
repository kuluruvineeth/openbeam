import { PitchHeader } from "@/components/pitch/pitch-header";

export function SectionDemoPhysical() {
  return (
    <section className="relative flex min-h-screen flex-col bg-background px-8 py-12 lg:px-16">
      <PitchHeader label="Agents — Autonomous Workflows" />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10">
        <div className="flex flex-col gap-4">
          <h2 className="font-serif text-[36px] text-foreground leading-[1.15] tracking-tight sm:text-[48px] lg:text-[56px]">
            3:47 AM — an agent prevents a $200K failure.
          </h2>
          <p className="max-w-2xl font-sans text-base text-muted-foreground leading-relaxed lg:text-lg">
            Vibration sensor on CNC Mill 12 spikes 2.3σ. OpenBeam agent
            correlates with maintenance history, finds this pattern preceded a
            bearing failure on Mill 9 last quarter. Files a P2 ticket, alerts
            the night shift lead on Slack, and schedules a parts order — before
            anyone wakes up.
          </p>
        </div>

        <div
          className="overflow-hidden rounded-md border border-border"
          style={{
            boxShadow: "0 24px 80px rgba(0, 0, 0, 0.5)",
          }}
        >
          <video
            autoPlay
            className="h-auto w-full"
            loop
            muted
            playsInline
            poster="/images/examples/a3.png"
          >
            <source
              src="/images/examples/openplane_agents.mp4"
              type="video/mp4"
            />
          </video>
        </div>

        <div className="flex items-center justify-center gap-8 font-mono text-muted-foreground text-xs tracking-wider">
          <span>100+ composable tools</span>
          <span className="text-border">&middot;</span>
          <span>Temporal-backed reliability</span>
          <span className="text-border">&middot;</span>
          <span>Zero human intervention required</span>
        </div>
      </div>
    </section>
  );
}
