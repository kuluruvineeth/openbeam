import { PitchHeader } from "@/components/pitch/pitch-header";

const projections = [
  { period: "Month 8-10", arr: "$120K", width: "8%" },
  { period: "Month 12", arr: "$600K", width: "20%" },
  { period: "Month 18", arr: "$1.8M", width: "45%" },
  { period: "Month 24", arr: "$3.6M", width: "70%" },
  { period: "Month 36", arr: "$6M", width: "100%" },
] as const;

const monthlyBurn = [
  { label: "Salaries (4)", amount: "$52K", pct: 84 },
  { label: "AI APIs", amount: "$2.5K", pct: 4 },
  { label: "AKS + Cloud", amount: "$1.4K", pct: 2 },
  { label: "SF + Ops", amount: "$6K", pct: 10 },
] as const;

export function SectionFinancials() {
  return (
    <section className="relative flex min-h-screen flex-col bg-background px-8 py-12 lg:px-16">
      <PitchHeader label="Financials" />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10">
        <div className="flex flex-col gap-2">
          <h2 className="font-serif text-[36px] text-foreground leading-[1.15] tracking-tight sm:text-[48px] lg:text-[64px]">
            Default alive at $930K ARR.
          </h2>
          <p className="font-serif text-[24px] text-muted-foreground/70 leading-[1.15] tracking-tight sm:text-[32px] lg:text-[42px]">
            $6M ARR by month 36.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {projections.map((row, i) => (
            <div className="flex items-center gap-4" key={row.period}>
              <span className="w-24 shrink-0 font-mono text-muted-foreground text-xs">
                {row.period}
              </span>
              <div className="relative h-8 flex-1 overflow-hidden rounded-sm bg-card">
                <div
                  className="absolute inset-y-0 left-0 rounded-sm"
                  style={{
                    width: row.width,
                    background:
                      i === projections.length - 1
                        ? "linear-gradient(to right, hsl(var(--foreground) / 0.15), hsl(var(--foreground) / 0.08))"
                        : "linear-gradient(to right, hsl(var(--foreground) / 0.10), hsl(var(--foreground) / 0.04))",
                    borderLeft:
                      i === projections.length - 1
                        ? "2px solid hsl(var(--foreground) / 0.6)"
                        : "2px solid hsl(var(--foreground) / 0.3)",
                  }}
                />
              </div>
              <span className="w-16 shrink-0 text-right font-mono text-foreground text-xs">
                {row.arr}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-md bg-foreground/[0.06] px-6 py-5">
            <p className="font-mono text-foreground/60 text-xs uppercase tracking-widest">
              Monthly Burn (4-person team)
            </p>
            <p className="mt-3 font-mono text-2xl text-foreground">~$62K/mo</p>
            <div className="mt-4 flex flex-col gap-2">
              {monthlyBurn.map((item) => (
                <div className="flex items-center gap-3" key={item.label}>
                  <span className="w-20 shrink-0 font-sans text-[10px] text-muted-foreground/70 uppercase tracking-wider">
                    {item.label}
                  </span>
                  <div className="relative h-3 flex-1 overflow-hidden rounded-sm bg-card">
                    <div
                      className="absolute inset-y-0 left-0 rounded-sm bg-foreground/10"
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                    {item.amount}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground/70">
              Base case: 12 enterprise customers at $50K ACV = $600K ARR by
              month 12. 64+ months runway on $4M.
            </p>
          </div>

          <div className="flex flex-col justify-between rounded-md bg-foreground/[0.06] px-6 py-5">
            <div>
              <p className="font-mono text-foreground/60 text-xs uppercase tracking-widest">
                Projected Unit Economics
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <span className="w-8 font-sans text-muted-foreground/70 text-xs">
                    CAC
                  </span>
                  <div
                    className="h-4 flex-1 rounded-sm bg-foreground/10"
                    style={{ maxWidth: "28%" }}
                  />
                  <span className="font-mono text-muted-foreground text-sm">
                    $1,200
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-8 font-sans text-muted-foreground/70 text-xs">
                    LTV
                  </span>
                  <div className="h-4 flex-1 rounded-sm bg-foreground/10" />
                  <span className="font-mono text-foreground text-sm">
                    $4,320
                  </span>
                </div>
              </div>
              <p className="mt-2 font-mono text-muted-foreground text-xs">
                3.6x LTV:CAC
              </p>
            </div>
            <div className="mt-4 flex items-end justify-between border-border border-t pt-4">
              <div>
                <p className="font-mono text-3xl text-foreground">4</p>
                <p className="font-sans text-[10px] text-muted-foreground/70">
                  month payback
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-3xl text-foreground">$930K</p>
                <p className="font-sans text-[10px] text-muted-foreground/70">
                  breakeven ARR
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
