"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const FOOTER_COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "Search", href: "/#features" },
      { label: "Agents", href: "/#features" },
      { label: "Connectors", href: "/connectors/" },
      { label: "Live Sync", href: "/#features" },
      {
        label: "Self-Hosted",
        href: "https://docs.openbeam.work/docs/self-hosting",
      },
    ],
  },
  {
    heading: "Developers",
    links: [
      { label: "Documentation", href: "https://docs.openbeam.work" },
      { label: "API Reference", href: "https://docs.openbeam.work/docs/api" },
      {
        label: "GitHub",
        href: "https://github.com/kuluruvineeth/openbeam",
        external: true,
      },
      {
        label: "Discord",
        href: "https://discord.gg/openbeam",
        external: true,
        soon: true,
      },
    ],
  },
  {
    heading: "Company",
    links: [
      {
        label: "X / Twitter",
        href: "https://x.com/kuluruvineeth",
        external: true,
      },
      {
        label: "LinkedIn",
        href: "https://linkedin.com/in/kuluruvineeth",
        external: true,
      },
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
          <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3 sm:gap-x-12 sm:gap-y-12 lg:col-span-1">
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
                    const isSoon = "soon" in link && link.soon;
                    if (isSoon) {
                      return (
                        <span
                          className="flex items-center gap-1.5 font-sans text-muted-foreground/50 text-sm"
                          key={link.label}
                        >
                          {link.label}
                          <span className="rounded-sm bg-muted px-1 py-0.5 text-[10px] text-muted-foreground leading-none">
                            Soon
                          </span>
                        </span>
                      );
                    }
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
              Find anything. Depend on no one.
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

        <div className="relative z-10">
          <p className="font-sans text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()} OpenBeam. MIT Licensed. Built in
            the open.
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
          className="select-none whitespace-nowrap font-sans text-[56px] leading-none sm:text-[340px] min-[480px]:text-[80px]"
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
