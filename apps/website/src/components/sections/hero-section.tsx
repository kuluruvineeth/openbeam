"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";

const EASE = [0.16, 1, 0.3, 1] as const;

const wordVariants = {
  hidden: { opacity: 0, filter: "blur(6px)", y: 8 },
  show: {
    opacity: 1,
    filter: "blur(0px)",
    y: 0,
    transition: { duration: 0.5, ease: EASE },
  },
};

function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="-translate-x-1/2 absolute top-[-30%] left-1/2 h-[700px] w-[900px] rounded-full bg-white/[0.07] blur-[150px]" />
      <div className="absolute top-[-15%] left-[15%] h-[500px] w-[600px] rounded-full bg-white/[0.04] blur-[120px]" />
      <div className="absolute top-[-10%] right-[10%] h-[400px] w-[500px] rounded-full bg-white/[0.03] blur-[100px]" />
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full opacity-[0.04] dark:opacity-[0.20]"
      >
        <filter id="hero-noise">
          <feTurbulence
            baseFrequency="0.55"
            numOctaves="4"
            stitchTiles="stitch"
            type="fractalNoise"
          />
        </filter>
        <rect filter="url(#hero-noise)" height="100%" width="100%" />
      </svg>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground) / 0.05) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground) / 0.05) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 20%, black 10%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 20%, black 10%, transparent 70%)",
        }}
      />
      <div
        className="-translate-x-1/2 absolute top-0 left-1/2 h-px w-[60%]"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent)",
        }}
      />
    </div>
  );
}

export function HeroSection() {
  const headline = ["Search", "like", "Google.", "Own", "like", "Linux."];

  return (
    <div className="relative min-h-screen">
      <HeroBackground />
      <div className="relative z-10 flex min-h-screen flex-col overflow-hidden pt-32 pb-12 sm:py-32 md:pt-24 lg:pt-0">
        <div className="z-20 flex flex-1 flex-col items-center justify-center px-3 sm:px-4 md:justify-start md:pt-16 lg:mx-auto lg:mb-12 lg:w-full lg:max-w-[1400px] lg:flex-none lg:items-center lg:px-0 lg:pt-48 xl:mb-12">
          <div className="mx-auto max-w-3xl space-y-6 text-center">
            <motion.h1
              animate="show"
              className="font-serif text-4xl leading-tight sm:text-5xl sm:leading-tight lg:text-6xl lg:leading-tight xl:text-7xl xl:leading-[1.1]"
              initial="hidden"
              variants={{
                hidden: {},
                show: {
                  transition: { staggerChildren: 0.1 },
                },
              }}
            >
              {headline.map((word, i) => (
                <motion.span
                  className="inline-block text-foreground"
                  key={`${word}-${i}`}
                  variants={wordVariants}
                >
                  {word}&nbsp;
                </motion.span>
              ))}
            </motion.h1>

            <motion.p
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto max-w-2xl font-sans text-base text-muted-foreground leading-relaxed sm:text-lg"
              initial={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.6, duration: 0.5, ease: EASE }}
            >
              Connects every tool your team uses. Searches them all in under
              200ms. Runs on your servers. Costs nothing.
            </motion.p>

            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-4 pt-2"
              initial={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.8, duration: 0.4, ease: EASE }}
            >
              <div className="flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
                <a
                  className="flex h-12 items-center justify-center bg-primary px-8 font-sans text-primary-foreground text-sm transition-colors hover:bg-primary/90"
                  href="https://docs.openbeam.work/quickstart"
                >
                  Get started — free
                </a>
                <a
                  className="flex h-12 items-center justify-center gap-2 border border-border bg-background px-6 font-sans text-foreground text-sm transition-colors hover:bg-secondary"
                  href="https://github.com/openbeam/openbeam"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <GitHubIcon />
                  Star on GitHub
                </a>
              </div>
              <p className="font-sans text-muted-foreground/60 text-xs">
                MIT licensed · Open source · No vendor lock-in
              </p>
            </motion.div>
          </div>
        </div>

        <HeroScreenshot />
      </div>
    </div>
  );
}

function HeroScreenshot() {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="mt-8 mb-8 overflow-visible md:mt-12 lg:mt-0 lg:mb-4 lg:w-full">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 z-[2] flex items-center justify-center p-0 lg:p-4">
          <div
            className={cn(
              "relative w-full max-w-[85%] overflow-hidden border border-border/50 bg-background md:scale-[0.85] lg:scale-100 2xl:max-w-[75%]",
              "transition-all duration-700 ease-out"
            )}
            style={{
              filter: isLoaded
                ? "blur(0px) drop-shadow(0 40px 80px rgba(0,0,0,0.35))"
                : "blur(20px)",
              transform: isLoaded ? undefined : "scale(1.02)",
            }}
          >
            <Image
              alt="OpenBeam — AI-powered enterprise search across Slack, Gmail, Notion, and GitHub"
              className="h-auto w-full"
              height={900}
              onLoad={() => setIsLoaded(true)}
              priority
              quality={95}
              src="/hero-screenshot.png"
              width={1440}
            />
          </div>
        </div>
        <div className="h-[420px] sm:h-[520px] md:h-[600px] lg:h-[800px] xl:h-[900px]" />
      </div>
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
    </svg>
  );
}
