"use client";

const TESTIMONIALS = [
  {
    name: "Sarah Chen",
    company: "Series B Startup",
    country: "United States",
    quote:
      "We were paying Glean $60K/year. OpenBeam gave us the same search quality, self-hosted, for free. Our security team was thrilled.",
  },
  {
    name: "Marcus Johnson",
    company: "500-person SaaS",
    country: "United Kingdom",
    quote:
      "Setup took 10 minutes, not the weeks our Glean POC required. The AI agents have saved our support team hours every day.",
  },
  {
    name: "Priya Patel",
    company: "Healthcare Tech",
    country: "India",
    quote:
      "Data residency was non-negotiable for us. OpenBeam self-hosted was the only option that met our compliance requirements while still giving us AI search.",
  },
  {
    name: "David Kim",
    company: "Open Source Contributor",
    country: "South Korea",
    quote:
      "Finally, enterprise search that I can actually read the source code of. The connector SDK is clean and well-documented.",
  },
] as const;

const ROTATIONS = [-1, 1, 2, -2] as const;

export function TestimonialsSection() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-[1400px] py-12 sm:py-16 lg:py-24">
        <div className="flex flex-col items-center gap-4">
          <div className="flex max-w-3xl flex-col items-center gap-4 text-center">
            <h2 className="font-serif text-2xl text-foreground">
              Built alongside our users
            </h2>
            <p className="hidden font-sans text-base text-muted-foreground leading-normal sm:block">
              For teams who refuse to send their data to yet another vendor.
              Every feature earns its place.
            </p>
          </div>
        </div>

        {/* Desktop */}
        <div className="mx-auto mt-10 hidden w-full max-w-5xl justify-center gap-3 lg:flex">
          {TESTIMONIALS.map((t, i) => (
            <div
              className="flex w-64 flex-shrink-0 flex-col gap-4 border border-border bg-background p-6 transition-all duration-200 hover:border-muted-foreground"
              key={t.name}
              style={{ transform: `rotate(${ROTATIONS[i]}deg)` }}
            >
              <div className="flex flex-col gap-3">
                <p className="text-left font-sans text-[10px] text-muted-foreground uppercase tracking-wider">
                  {t.country}
                </p>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-muted" />
                  <span className="font-sans text-foreground text-sm">
                    {t.name}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-left">
                <span className="font-sans text-muted-foreground text-sm">
                  {t.company}
                </span>
                <div className="font-sans text-muted-foreground text-sm leading-relaxed">
                  &quot;{t.quote}&quot;
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile */}
        <div className="-mx-4 sm:-mx-6 md:-mx-8 mt-10 w-screen pl-4 lg:hidden">
          <div className="scrollbar-hide snap-x snap-mandatory overflow-x-auto scroll-smooth py-3">
            <div
              className="flex gap-4 pr-4 pl-4"
              style={{ width: "max-content" }}
            >
              {TESTIMONIALS.map((t, i) => (
                <div
                  className="w-[280px] flex-shrink-0 snap-start"
                  key={t.name}
                >
                  <div
                    className="flex min-h-[240px] flex-col gap-4 border border-border bg-background p-8 transition-all duration-200 hover:border-muted-foreground sm:min-h-0 sm:p-6"
                    style={{ transform: `rotate(${ROTATIONS[i]}deg)` }}
                  >
                    <div className="flex flex-col gap-3">
                      <p className="text-left font-sans text-[10px] text-muted-foreground uppercase tracking-wider">
                        {t.country}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-muted" />
                        <span className="font-sans text-foreground text-sm">
                          {t.name}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 text-left">
                      <span className="font-sans text-muted-foreground text-sm">
                        {t.company}
                      </span>
                      <div className="font-sans text-muted-foreground text-sm leading-relaxed">
                        &quot;{t.quote}&quot;
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 text-center sm:mt-8">
          <a
            className="font-sans text-muted-foreground text-sm underline underline-offset-4 transition-colors hover:text-foreground"
            href="/testimonials/"
          >
            View all stories
          </a>
        </div>
      </div>
    </section>
  );
}
