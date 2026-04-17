"use client";

import { motion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

const STEPS = [
  {
    number: "01",
    title: "Describe",
    description:
      "Tell OpenBeam what you need in plain language. The system generates an agent with a plan, schedule, and the right tools.",
  },
  {
    number: "02",
    title: "Review",
    description:
      "Inspect the generated plan before deployment. See which tools it uses, what schedule it runs on, and what actions it can take.",
  },
  {
    number: "03",
    title: "Automate",
    description:
      "The agent runs on schedule, accumulates memory across executions, and gets smarter with every run. Silent when nothing is noteworthy.",
  },
  {
    number: "04",
    title: "Control",
    description:
      "See every step the agent took. Approve or reject proposed actions individually. Full audit trail across all runs.",
  },
];

export function ComputerHowItWorks() {
  return (
    <section className="bg-background py-16 lg:py-24">
      <div className="mx-auto max-w-[1400px] px-4">
        <div className="mb-10">
          <h2 className="font-serif text-2xl text-foreground sm:text-3xl">
            How it works
          </h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0, y: 12 }}
              key={step.number}
              transition={{ duration: 0.5, ease: EASE, delay: i * 0.1 }}
              viewport={{ once: true, margin: "-40px" }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <span className="block font-mono text-3xl text-muted-foreground/20">
                {step.number}
              </span>
              <h3 className="font-sans text-foreground text-lg">
                {step.title}
              </h3>
              <p className="font-sans text-muted-foreground text-xs leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
