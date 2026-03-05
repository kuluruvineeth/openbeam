"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const features = [
  {
    title: "Search across everything",
    subtitle:
      "Connect your tools and search across all your company's knowledge from a single place.",
    mobileSubtitle: "Search all your company's knowledge from one place.",
    media: { type: "image" as const, src: "/images/examples/a9.png" },
  },
  {
    title: "AI agents that take action",
    subtitle:
      "100+ tools, multi-agent workflows. AI that doesn't just find answers — it acts on them.",
    mobileSubtitle: "AI that finds answers and takes action.",
    media: {
      type: "video" as const,
      src: "/images/examples/openbeam_agents.mp4",
      poster: "/images/examples/a17.png",
    },
  },
  {
    title: "Missions that orchestrate work",
    subtitle:
      "Multi-step workflows with squads of specialized agents. Parse RFPs, draft responses, match requirements — autonomously.",
    mobileSubtitle: "Multi-agent squads that orchestrate complex work.",
    media: {
      type: "video" as const,
      src: "/images/examples/openbeam_mission.mp4",
      poster: "/images/examples/Screenshot 2026-02-12 at 10.22.23 PM.png",
    },
  },
  {
    title: "Always in sync, always current",
    subtitle:
      "Full and incremental sync keeps your search index fresh. Never search stale data again.",
    mobileSubtitle: "Full and incremental sync keeps data fresh.",
    media: { type: "image" as const, src: "/images/examples/a14.png" },
  },
  {
    title: "Your infrastructure, your data",
    subtitle:
      "Deploy on your own servers with Docker. No vendor lock-in, no data leaving your network.",
    mobileSubtitle: "Deploy on your own servers, own your data.",
    media: { type: "component" as const, component: "docker" as const },
  },
];

interface TerminalLine {
  prompt?: boolean;
  prefix?: string;
  color?: string;
  text: string;
  suffix?: string;
  suffixColor?: string;
}

const DOCKER_LINES: TerminalLine[] = [
  {
    prompt: true,
    text: "git clone https://github.com/openbeam/openbeam.git",
  },
  { prompt: true, text: "cd openbeam" },
  { prompt: true, text: "docker compose up -d" },
  { text: "" },
  {
    prefix: "[+]",
    color: "text-emerald-400",
    text: "Container openbeam-db-1        Started",
  },
  {
    prefix: "[+]",
    color: "text-emerald-400",
    text: "Container openbeam-redis-1      Started",
  },
  {
    prefix: "[+]",
    color: "text-emerald-400",
    text: "Container openbeam-vespa-1      Started",
  },
  {
    prefix: "[+]",
    color: "text-emerald-400",
    text: "Container openbeam-temporal-1   Started",
  },
  {
    prefix: "[+]",
    color: "text-emerald-400",
    text: "Container openbeam-worker-1     Started",
  },
  {
    prefix: "[+]",
    color: "text-emerald-400",
    text: "Container openbeam-server-1     Started",
  },
  {
    prefix: "[+]",
    color: "text-emerald-400",
    text: "Container openbeam-web-1        Started",
  },
  { text: "" },
  {
    text: "OpenBeam is running at ",
    suffix: "http://localhost:3001",
    suffixColor: "text-blue-400",
  },
];

function DockerTerminal({ active }: { active: boolean }) {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const reset = useCallback(() => {
    setLineIndex(0);
    setCharIndex(0);
    setDone(false);
  }, []);

  useEffect(() => {
    if (active) {
      reset();
    }
  }, [active, reset]);

  useEffect(() => {
    if (!active || done) {
      return;
    }

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };

    if (lineIndex >= DOCKER_LINES.length) {
      setDone(true);
      timerRef.current = setTimeout(reset, 4000);
      return clearTimer;
    }

    const line = DOCKER_LINES[lineIndex];
    const fullText = line.text + (line.suffix ?? "");

    if (line.prompt && charIndex < fullText.length) {
      timerRef.current = setTimeout(() => {
        setCharIndex((c) => c + 1);
      }, 25);
    } else {
      let delay = 120;
      if (line.prompt) {
        delay = 400;
      } else if (line.text === "") {
        delay = 100;
      }
      timerRef.current = setTimeout(() => {
        setLineIndex((l) => l + 1);
        setCharIndex(0);
      }, delay);
    }

    return clearTimer;
  }, [active, done, lineIndex, charIndex, reset]);

  return (
    <div className="flex h-full flex-col bg-[#0a0a0a] font-mono text-[13px] leading-relaxed">
      <div className="flex items-center gap-2 border-white/[0.06] border-b px-4 py-3">
        <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-2 text-white/30 text-xs">Terminal</span>
      </div>
      <div className="flex-1 p-4 sm:p-5">
        {DOCKER_LINES.slice(0, lineIndex + 1).map((line, i) => {
          const isCurrent = i === lineIndex;
          const isTyping =
            isCurrent &&
            line.prompt &&
            charIndex < line.text.length + (line.suffix?.length ?? 0);
          const fullText = line.text + (line.suffix ?? "");
          const visibleText =
            isCurrent && line.prompt ? fullText.slice(0, charIndex) : fullText;

          if (isCurrent && lineIndex >= DOCKER_LINES.length) {
            return null;
          }

          return (
            <div className="whitespace-pre" key={i}>
              {line.prompt && <span className="text-white/40">{"~ ▸ "}</span>}
              {line.prefix && (
                <span className={line.color}>{line.prefix} </span>
              )}
              {line.prompt ? (
                <span className="text-white/80">{visibleText}</span>
              ) : (
                <>
                  <span className="text-white/80">{line.text}</span>
                  {line.suffix && (
                    <span className={line.suffixColor}>{line.suffix}</span>
                  )}
                </>
              )}
              {isTyping && (
                <span className="animate-pulse text-white/60">▌</span>
              )}
              {isCurrent && !isTyping && !done && line.prompt && (
                <span className="animate-pulse text-white/60">▌</span>
              )}
            </div>
          );
        })}
        {lineIndex === 0 && charIndex === 0 && !done && (
          <div className="whitespace-pre">
            <span className="text-white/40">{"~ ▸ "}</span>
            <span className="animate-pulse text-white/60">▌</span>
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureMedia({
  media,
  active,
}: {
  media: (typeof features)[number]["media"];
  active: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }
    if (active) {
      videoRef.current.play().catch(Function.prototype as () => void);
    } else {
      videoRef.current.pause();
    }
  }, [active]);

  if (media.type === "component") {
    return <DockerTerminal active={active} />;
  }

  if (media.type === "video") {
    return (
      <video
        className="h-auto w-full"
        loop
        muted
        playsInline
        poster={media.poster}
        ref={videoRef}
        src={media.src}
      />
    );
  }

  return (
    <Image
      alt=""
      className="h-auto w-full"
      height={900}
      quality={95}
      src={media.src}
      width={1200}
    />
  );
}

export function HowItWorksSection() {
  const [activeFeature, setActiveFeature] = useState(0);

  return (
    <section className="bg-background py-16 lg:py-24">
      <div className="mx-auto max-w-[1400px] px-4">
        <div className="mb-10 lg:hidden">
          <h2 className="text-center font-serif text-2xl text-foreground">
            How it works
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-10 sm:gap-14 lg:hidden">
          {features.map((feature) => (
            <div className="space-y-4" key={feature.title}>
              <div className="space-y-1.5 text-center">
                <h3 className="mx-auto max-w-md font-sans text-foreground text-lg">
                  {feature.title}
                </h3>
                <p className="mx-auto max-w-md font-sans text-muted-foreground text-sm leading-normal">
                  <span className="sm:hidden">{feature.mobileSubtitle}</span>
                  <span className="hidden sm:inline">{feature.subtitle}</span>
                </p>
              </div>
              <div className="relative overflow-hidden border border-border/50 bg-[#0a0a0a]">
                <FeatureMedia active media={feature.media} />
              </div>
            </div>
          ))}
        </div>

        <div className="hidden lg:block">
          <div className="grid grid-cols-[340px_1fr] gap-12 xl:grid-cols-[380px_1fr] xl:gap-16">
            <div className="flex flex-col justify-center">
              <h2 className="mb-10 font-serif text-2xl text-foreground">
                How it works
              </h2>

              <div className="flex flex-col">
                {features.map((feature, index) => (
                  <div className="flex gap-5" key={feature.title}>
                    <div className="flex flex-col items-center">
                      <button
                        aria-label={`Go to feature: ${feature.title}`}
                        className="relative z-10 mt-1.5 cursor-pointer p-1"
                        onClick={() => setActiveFeature(index)}
                        type="button"
                      >
                        <div
                          className={cn(
                            "h-2 w-2 transition-all duration-200 ease-out",
                            activeFeature === index
                              ? "scale-125 bg-foreground"
                              : "scale-100 bg-border hover:bg-muted-foreground"
                          )}
                        />
                      </button>
                      {index < features.length - 1 && (
                        <div className="w-px flex-1 bg-border/60" />
                      )}
                    </div>
                    <button
                      className={cn(
                        "cursor-pointer pb-6 text-left transition-all duration-300 xl:pb-8",
                        index === features.length - 1 ? "pb-0 xl:pb-0" : "",
                        activeFeature === index
                          ? "opacity-100"
                          : "opacity-40 hover:opacity-60"
                      )}
                      onClick={() => setActiveFeature(index)}
                      type="button"
                    >
                      <h3
                        className={cn(
                          "font-sans text-lg transition-colors duration-300",
                          activeFeature === index
                            ? "text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {feature.title}
                      </h3>
                      <div
                        className={cn(
                          "grid transition-all duration-300 ease-out",
                          activeFeature === index
                            ? "mt-1.5 grid-rows-[1fr] opacity-100"
                            : "grid-rows-[0fr] opacity-0"
                        )}
                      >
                        <div className="overflow-hidden">
                          <p className="max-w-[300px] font-sans text-muted-foreground text-sm leading-relaxed">
                            {feature.subtitle}
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="relative overflow-hidden border border-border/50 bg-[#0a0a0a]">
                <div
                  className="animate-[fadeInScale_0.4s_ease-out_forwards]"
                  key={activeFeature}
                >
                  <FeatureMedia active media={features[activeFeature].media} />
                </div>
              </div>

              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
                style={{
                  background:
                    "linear-gradient(to top, hsl(var(--background)), transparent)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
