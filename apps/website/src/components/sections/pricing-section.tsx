"use client";

import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/cn";

const PLANS = [
  {
    name: "Community",
    price: "Free",
    period: "forever",
    description: "For teams getting started with enterprise search.",
    features: [
      "All 20+ connectors",
      "AI search",
      "AI agents",
      "Community support",
      "MIT License",
    ],
    cta: "Deploy Now",
    ctaHref: "https://docs.openbeam.work/quickstart",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/user/month",
    description: "For teams that need security and support.",
    features: [
      "Everything in Community",
      "SSO / SAML",
      "Audit logs",
      "Priority support (48hr SLA)",
      "Advanced analytics",
    ],
    cta: "Start Free Trial",
    ctaHref: "https://app.openbeam.work/billing",
    highlighted: true,
    badge: "Most popular",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For organizations with advanced requirements.",
    features: [
      "Everything in Pro",
      "Dedicated support",
      "Custom connectors",
      "SLA 99.9%",
      "Security review",
    ],
    cta: "Contact Sales",
    ctaHref: "mailto:hello@openbeam.work",
    highlighted: false,
  },
] as const;

export function PricingSection() {
  return (
    <section className="bg-background py-12 sm:py-16 lg:py-24" id="pricing">
      <div className="mx-auto max-w-[1400px] px-4">
        <div className="mb-10 space-y-4 text-center sm:mb-12">
          <h2 className="font-serif text-2xl text-foreground">
            Simple, transparent pricing
          </h2>
          <p className="hidden font-sans text-base text-muted-foreground leading-normal sm:block">
            Start free. Scale when you&apos;re ready.
          </p>
        </div>
        <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              className={cn(
                "relative flex flex-col border bg-background p-5 sm:p-6",
                plan.highlighted ? "border-primary" : "border-border"
              )}
              key={plan.name}
            >
              {"badge" in plan && plan.badge && (
                <span className="-translate-y-1/2 absolute top-0 right-4 border border-primary bg-background px-2 py-1 font-sans text-foreground text-xs">
                  {plan.badge}
                </span>
              )}
              <div className="mb-6">
                <h3 className="mb-1 font-sans text-base text-foreground">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="font-sans text-3xl text-foreground">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="font-sans text-muted-foreground text-sm">
                      {plan.period}
                    </span>
                  )}
                </div>
                <p className="mt-2 font-sans text-muted-foreground text-sm">
                  {plan.description}
                </p>
              </div>
              <div className="mb-8 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <div className="flex items-start gap-2" key={feature}>
                    <span className="text-muted-foreground leading-[1.5rem]">
                      ·
                    </span>
                    <span className="font-sans text-foreground text-sm leading-relaxed">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
              <a
                className={cn(
                  "flex h-11 w-full items-center justify-center px-6 font-sans text-sm transition-colors",
                  plan.highlighted
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border bg-background text-foreground hover:bg-secondary"
                )}
                href={plan.ctaHref}
                onClick={() => {
                  analytics.ctaClicked(plan.cta, `pricing-${plan.name}`);
                  if (plan.name === "Enterprise") {
                    analytics.enterpriseInterest("pricing-section");
                  }
                }}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
