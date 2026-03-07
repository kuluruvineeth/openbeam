"use client";

import { motion } from "motion/react";
import Image from "next/image";

function DotGrid() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
    </div>
  );
}

export function SectionTitle() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <DotGrid />

      <div className="absolute top-8 right-8 lg:top-12 lg:right-12">
        <p className="font-mono text-muted-foreground text-sm tracking-widest">
          Seed Round / 2026
        </p>
      </div>

      <div className="relative flex flex-col items-center px-6">
        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          initial={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.5 }}
        >
          <Image
            alt="OpenBeam"
            className="hidden dark:block"
            height={48}
            src="/logo_dark.png"
            width={48}
          />
          <Image
            alt="OpenBeam"
            className="dark:hidden"
            height={48}
            src="/logo.png"
            width={48}
          />
        </motion.div>

        <motion.h1
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 text-center font-serif text-[64px] text-foreground leading-none tracking-tight sm:text-[100px] md:text-[140px] lg:text-[180px]"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          OpenBeam
        </motion.h1>

        <motion.p
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-center font-sans text-foreground/80 text-xl leading-relaxed tracking-wide lg:text-2xl"
          initial={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          Intelligence for the physical world
        </motion.p>

        <motion.p
          animate={{ opacity: 1 }}
          className="mt-10 font-mono text-muted-foreground/60 text-xs uppercase tracking-widest"
          initial={{ opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          Solo builder &middot; 25+ connectors &middot; 100+ AI tools
        </motion.p>
      </div>
    </section>
  );
}
