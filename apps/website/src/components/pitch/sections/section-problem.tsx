import { PitchHeader } from "@/components/pitch/pitch-header";

export function SectionProblem() {
  return (
    <section className="relative flex min-h-screen flex-col bg-background px-8 py-12 lg:px-16">
      <PitchHeader label="The Problem" />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-16">
        <div className="flex flex-col gap-6">
          <h2 className="font-serif text-[36px] text-foreground leading-[1.15] tracking-tight sm:text-[48px] lg:text-[64px]">
            Factories generate 1,000× more data than Slack.
            <br />
            None of it is searchable.
          </h2>
          <p className="max-w-2xl font-sans text-base text-muted-foreground leading-relaxed lg:text-lg">
            Every enterprise search company indexes Slack, Google Drive, Jira.
            None of them can tell you why Line 3 went down, what the robot fleet
            saw last Tuesday, or whether Building 7’s HVAC is degrading.
            Physical operations generate terabytes per hour — 99% is never
            analyzed.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="border-l-2 border-l-foreground/40 py-1 pl-6">
            <p className="font-mono text-[40px] text-foreground leading-none lg:text-[56px]">
              35%
            </p>
            <p className="mt-2 text-foreground text-sm">
              Of work time lost searching disconnected tools
            </p>
            <p className="mt-1 text-muted-foreground text-xs">
              Bloomfire / HBR
            </p>
          </div>

          <div className="border-l-2 border-l-foreground/25 py-1 pl-6">
            <p className="font-mono text-[40px] text-foreground/75 leading-none lg:text-[56px]">
              $1.4T
            </p>
            <p className="mt-2 text-foreground text-sm">
              Lost annually to unplanned downtime
            </p>
            <p className="mt-1 text-muted-foreground text-xs">Siemens</p>
          </div>

          <div className="border-l-2 border-l-muted-foreground/40 py-1 pl-6">
            <p className="font-mono text-[40px] text-muted-foreground leading-none lg:text-[56px]">
              99%
            </p>
            <p className="mt-2 text-foreground text-sm">
              Of industrial sensor data never analyzed
            </p>
            <p className="mt-1 text-muted-foreground text-xs">McKinsey</p>
          </div>
        </div>
      </div>
    </section>
  );
}
