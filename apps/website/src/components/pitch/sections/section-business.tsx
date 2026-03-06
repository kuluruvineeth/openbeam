import { PitchHeader } from "@/components/pitch/pitch-header";

const tiers = [
  {
    name: "Open Source",
    price: "$0",
    unit: "",
    description: "Self-hosted, MIT licensed, full features, 3 users",
    highlighted: false,
    opacity: "opacity-50",
  },
  {
    name: "Pro",
    price: "$15",
    unit: "/seat/mo",
    description: "Unlimited users, managed cloud, SSO, support",
    highlighted: true,
    opacity: "",
  },
  {
    name: "Enterprise",
    price: "Custom",
    unit: "",
    description:
      "Air-gapped, RBAC, audit logs, per-device pricing for physical ops",
    highlighted: false,
    opacity: "opacity-70",
  },
] as const;

const revenueStreams = [
  { label: "Platform Licenses", pct: 45, margin: "85-90%" },
  { label: "Usage (physical)", pct: 30, margin: "80%+" },
  { label: "Managed Cloud", pct: 20, margin: "75-80%" },
  { label: "Services", pct: 5, margin: "60-70%" },
] as const;

export function SectionBusiness() {
  return (
    <section className="relative flex min-h-screen flex-col bg-background px-8 py-12 lg:px-16">
      <PitchHeader label="Business Model" />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10">
        <div className="flex flex-col gap-2">
          <h2 className="font-serif text-[36px] text-foreground leading-[1.15] tracking-tight sm:text-[48px] lg:text-[64px]">
            Open source to land. Usage-based to expand.
          </h2>
          <p className="font-serif text-[24px] text-muted-foreground/70 leading-[1.15] tracking-tight sm:text-[32px] lg:text-[42px]">
            Seat-based for digital. Usage-based for physical.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {tiers.map((tier) => (
            <div
              className={`rounded-md border border-border bg-card p-6 ${tier.highlighted ? "border-t-2 border-t-foreground/40" : ""}`}
              key={tier.name}
            >
              <p
                className={`font-mono text-xs uppercase tracking-widest ${tier.highlighted ? "text-foreground" : "text-muted-foreground"}`}
              >
                {tier.name}
              </p>
              <p className="mt-3 font-mono text-3xl text-foreground">
                {tier.price}
                {tier.unit && (
                  <span className="text-muted-foreground/70 text-sm">
                    {tier.unit}
                  </span>
                )}
              </p>
              <p className="mt-2 text-muted-foreground/70 text-xs leading-relaxed">
                {tier.description}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-6">
          <p className="font-mono text-muted-foreground text-xs uppercase tracking-widest">
            Revenue Mix at Scale (Target)
          </p>

          <div className="flex h-8 w-full overflow-hidden rounded-sm">
            {revenueStreams.map((stream, i) => (
              <div
                className="flex h-full items-center justify-center"
                key={stream.label}
                style={{
                  width: `${stream.pct}%`,
                  backgroundColor: `hsl(var(--foreground) / ${0.12 - i * 0.025})`,
                  borderRight: "1px solid hsl(var(--background))",
                }}
              />
            ))}
          </div>

          <div className="grid grid-cols-4 gap-px overflow-hidden rounded-sm border border-border bg-border">
            {revenueStreams.map((stream) => (
              <div
                className="flex flex-col bg-card px-4 py-3"
                key={stream.label}
              >
                <p className="font-mono text-foreground text-sm">
                  {stream.margin}
                </p>
                <p className="mt-1 font-sans text-[10px] text-muted-foreground/70 uppercase tracking-wider">
                  {stream.label}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  {stream.pct}% mix
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
