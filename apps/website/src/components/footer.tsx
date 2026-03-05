"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const FOOTER_COLUMNS = [
  {
    heading: "Features",
    links: [
      { label: "Search", href: "/#features" },
      { label: "AI Agents", href: "/#features" },
      { label: "Missions", href: "/#features" },
      { label: "Connectors", href: "/connectors/" },
      { label: "Real-Time Sync", href: "/#features" },
      { label: "Video Search", href: "/#features" },
    ],
  },
  {
    heading: "Product",
    links: [
      {
        label: "Self-Hosting",
        href: "https://docs.openbeam.work/self-hosting",
      },
      { label: "Docker", href: "https://hub.docker.com/r/openbeam/openbeam" },
      { label: "Changelog", href: "/changelog/" },
      { label: "Status", href: "https://status.openbeam.work" },
    ],
  },
  {
    heading: "Compare",
    links: [
      { label: "vs Glean", href: "/compare/glean/" },
      { label: "vs Onyx", href: "/compare/onyx/" },
      { label: "vs Microsoft Copilot", href: "/compare/microsoft-copilot/" },
      { label: "View all", href: "/compare/" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about/" },
      { label: "Blog", href: "/blog/" },
      {
        label: "X / Twitter",
        href: "https://twitter.com/openbeam",
        external: true,
      },
      {
        label: "LinkedIn",
        href: "https://linkedin.com/company/openbeam",
        external: true,
      },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Documentation", href: "https://docs.openbeam.work" },
      { label: "API", href: "https://docs.openbeam.work/api" },
      {
        label: "GitHub",
        href: "https://github.com/openbeam/openbeam",
        external: true,
      },
      {
        label: "Discord",
        href: "https://discord.gg/openbeam",
        external: true,
      },
      { label: "Support", href: "/support/" },
    ],
  },
] as const;

export function Footer() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <footer className="relative overflow-hidden bg-background">
      <div className="h-px w-full border-border border-t" />

      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-8 sm:pb-56">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3 sm:gap-x-8 sm:gap-y-12 md:grid-cols-5 lg:col-span-1">
            {FOOTER_COLUMNS.map((col) => (
              <div className="space-y-3" key={col.heading}>
                <h3 className="mb-4 font-sans text-foreground text-sm">
                  {col.heading}
                </h3>
                <div className="space-y-2.5">
                  {col.links.map((link) => {
                    const isExternal =
                      "external" in link
                        ? link.external
                        : link.href.startsWith("http") &&
                          !link.href.includes("openbeam.work") &&
                          !link.href.includes("docs.openbeam.work");
                    return (
                      <Link
                        className="block font-sans text-muted-foreground text-sm transition-colors hover:text-foreground"
                        href={link.href}
                        key={link.label}
                        {...(isExternal
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-start gap-6 lg:items-end lg:gap-10">
            <p className="text-left font-sans text-base text-foreground sm:text-xl lg:text-right">
              Enterprise search that runs on your infrastructure.
            </p>

            <button
              aria-label="Toggle theme"
              className="flex items-center gap-2 border border-border px-3 py-1.5 text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
              type="button"
            >
              {mounted ? (
                resolvedTheme === "dark" ? (
                  <SunIcon />
                ) : (
                  <MoonIcon />
                )
              ) : (
                <div className="h-4 w-4" />
              )}
              <span className="font-sans text-sm">
                {!mounted && "Toggle theme"}
                {mounted && resolvedTheme === "dark" && "Light mode"}
                {mounted && resolvedTheme !== "dark" && "Dark mode"}
              </span>
            </button>
          </div>
        </div>

        <div className="my-16">
          <div className="h-px w-full border-border border-t" />
        </div>

        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <a
            className="hidden items-center gap-2 transition-opacity hover:opacity-80 md:flex"
            href="https://status.openbeam.work"
          >
            <span className="font-sans text-muted-foreground text-sm">
              System status:
            </span>
            <span className="font-sans text-foreground text-sm">
              Operational
            </span>
            <div className="relative flex items-center justify-center">
              <div className="relative z-10 h-2 w-2 rounded-full bg-green-500" />
              <div
                className="absolute h-2 w-2 rounded-full bg-green-500"
                style={{
                  animation:
                    "pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                }}
              />
            </div>
          </a>
          <p className="font-sans text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()} OpenBeam. MIT License.
          </p>
        </div>
      </div>

      <div
        className={cn(
          "absolute bottom-0 left-0 translate-y-[10%] overflow-hidden bg-background",
          "sm:-translate-x-1/2 sm:left-1/2 sm:translate-y-[15%]"
        )}
      >
        <h1
          className="select-none font-sans text-[120px] leading-none sm:text-[340px]"
          style={{
            WebkitTextStroke: "1.5px hsl(var(--muted-foreground) / 0.6)",
            color: "transparent",
          }}
        >
          openbeam
        </h1>
      </div>
    </footer>
  );
}

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="16"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="16"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}
