"use client";

import { motion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

const TESTIMONIALS = [
  {
    name: "Sarah Chen",
    role: "Head of Engineering",
    company: "Series B Startup",
    quote:
      "We were paying Glean $60K/year. OpenBeam gave us the same search quality, self-hosted, for free. Our security team was thrilled.",
    highlight: "Same quality. $60K saved.",
  },
  {
    name: "Marcus Johnson",
    role: "VP of Operations",
    company: "500-person SaaS",
    quote:
      "Setup took 10 minutes, not the weeks our Glean POC required. The AI agents have saved our support team hours every day.",
    highlight: "10 minutes to deploy.",
  },
  {
    name: "Priya Patel",
    role: "CTO",
    company: "Healthcare Tech",
    quote:
      "Data residency was non-negotiable for us. OpenBeam self-hosted was the only option that met our compliance requirements while still giving us AI search.",
    highlight: "Full data sovereignty.",
  },
  {
    name: "David Kim",
    role: "Staff Engineer",
    company: "Open Source Contributor",
    quote:
      "Finally, enterprise search that I can actually read the source code of. The connector SDK is clean and well-documented.",
    highlight: "Open source done right.",
  },
] as const;

export function TestimonialsSection() {
  return (
    <section className="bg-background py-16 lg:py-24">
      <div className="mx-auto max-w-[1400px] px-4">
        <motion.div
          className="mb-10 text-center"
          initial={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.5, ease: EASE }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <p className="mb-3 font-sans text-muted-foreground text-xs uppercase tracking-widest">
            Testimonials
          </p>
          <h2 className="font-serif text-2xl text-foreground">
            Built alongside our users
          </h2>
          <p className="mx-auto mt-3 hidden max-w-md font-sans text-muted-foreground text-sm leading-relaxed sm:block">
            For teams who refuse to send their data to yet another vendor.
          </p>
        </motion.div>

        <div className="mx-auto hidden max-w-5xl gap-4 lg:grid lg:grid-cols-4">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              className="group flex flex-col gap-4 border border-border/40 bg-background p-6 transition-colors duration-200 hover:border-border"
              initial={{ opacity: 0, y: 16 }}
              key={t.name}
              transition={{ delay: i * 0.08, duration: 0.5, ease: EASE }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <p className="font-medium font-sans text-foreground text-sm">
                {t.highlight}
              </p>
              <p className="flex-1 font-sans text-muted-foreground text-sm leading-relaxed">
                &quot;{t.quote}&quot;
              </p>
              <div className="border-border/40 border-t pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center bg-muted font-sans text-muted-foreground text-xs">
                    {t.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="font-sans text-foreground text-sm">
                      {t.name}
                    </p>
                    <p className="font-sans text-muted-foreground text-xs">
                      {t.role} · {t.company}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="-mx-4 sm:-mx-6 md:-mx-8 mt-0 w-screen pl-4 lg:hidden">
          <div className="scrollbar-hide snap-x snap-mandatory overflow-x-auto scroll-smooth py-3">
            <div
              className="flex gap-4 pr-4 pl-4"
              style={{ width: "max-content" }}
            >
              {TESTIMONIALS.map((t) => (
                <div
                  className="w-[300px] flex-shrink-0 snap-start"
                  key={t.name}
                >
                  <div className="flex min-h-[260px] flex-col gap-4 border border-border/40 bg-background p-6 sm:min-h-0">
                    <p className="font-medium font-sans text-foreground text-sm">
                      {t.highlight}
                    </p>
                    <p className="flex-1 font-sans text-muted-foreground text-sm leading-relaxed">
                      &quot;{t.quote}&quot;
                    </p>
                    <div className="border-border/40 border-t pt-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center bg-muted font-sans text-muted-foreground text-xs">
                          {t.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div>
                          <p className="font-sans text-foreground text-sm">
                            {t.name}
                          </p>
                          <p className="font-sans text-muted-foreground text-xs">
                            {t.role} · {t.company}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
