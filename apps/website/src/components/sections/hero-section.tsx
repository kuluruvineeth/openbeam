"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";

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
  return (
    <div className="relative min-h-screen">
      <HeroBackground />
      <div className="relative z-10 flex min-h-screen flex-col overflow-hidden pt-32 pb-12 sm:py-32 md:pt-24 lg:pt-0">
        <div className="z-20 flex flex-1 flex-col items-center justify-center space-y-8 px-3 sm:px-4 md:justify-start md:pt-16 lg:mx-auto lg:mb-12 lg:w-full lg:max-w-[1400px] lg:flex-none lg:items-stretch lg:space-y-0 lg:px-0 lg:pt-56 xl:mb-12">
          <div className="flex w-full flex-col space-y-8 lg:flex-row lg:items-end lg:justify-between lg:space-y-0">
            <div className="mx-auto max-w-xl space-y-4 px-2 text-center lg:mx-0 lg:space-y-3 lg:px-0 lg:text-left">
              <h1 className="font-serif text-3xl leading-tight lg:leading-tight xl:leading-[1.3]">
                <span className="text-foreground">
                  The open-source alternative to Glean.
                </span>
              </h1>
              <p className="mx-auto max-w-md text-center font-sans text-base text-muted-foreground leading-normal lg:mx-0 lg:max-w-none lg:text-left">
                Enterprise AI search that runs on your infrastructure. Connect
                every tool, search everything, own your data.
              </p>
            </div>

            <div className="w-full space-y-4 text-center lg:flex lg:w-auto lg:flex-col lg:items-end lg:text-right">
              <div className="mx-auto flex w-full max-w-md flex-col gap-3 lg:mx-0 lg:w-auto">
                <a
                  className="flex h-11 w-full items-center justify-center bg-primary px-5 font-sans text-primary-foreground text-sm transition-colors hover:bg-primary/90 lg:w-auto lg:px-4"
                  href="https://docs.openbeam.work/quickstart"
                >
                  Deploy your instance
                </a>
              </div>
              <p className="font-sans text-muted-foreground text-xs">
                <span className="lg:hidden">
                  Free and open source · MIT License
                </span>
                <span className="hidden lg:inline">
                  Free and open source. MIT License. Self-hosted.
                </span>
              </p>
            </div>
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
              alt="OpenBeam — AI-powered enterprise search with sources from Slack, Gmail, and Google Drive"
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
