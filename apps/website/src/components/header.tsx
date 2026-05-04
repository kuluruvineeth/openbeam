"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const FEATURES = [
  {
    title: "Search",
    description: "Type once. Results from every tool.",
    href: "/#features",
  },
  {
    title: "Agents",
    description: "They find, verify, then act.",
    href: "/#features",
  },
  {
    title: "Connectors",
    description: "Slack, GitHub, Notion — plus MQTT, OPC-UA, Samsara.",
    href: "/connectors/",
  },
  {
    title: "Live Sync",
    description: "Never search yesterday's version.",
    href: "/#features",
  },
  {
    title: "Self-Hosted",
    description: "Your servers. Your data. MIT licensed.",
    href: "https://docs.openbeam.work/docs/self-hosting",
    external: true,
  },
  {
    title: "Open Source",
    description: "Read every line. Change any line.",
    href: "https://github.com/kuluruvineeth/openbeam",
    external: true,
  },
];

const NAV_ITEMS = [
  { label: "Connectors", href: "/connectors/" },
  { label: "Computer", href: "/computer/" },
  { label: "Changelog", href: "/changelog/" },
  { label: "Pitch", href: "/pitch/" },
  { label: "Memo", href: "/memo/" },
  { label: "Docs", href: "https://docs.openbeam.work/docs", external: true },
  {
    label: "GitHub",
    href: "https://github.com/kuluruvineeth/openbeam",
    external: true,
    icon: "star" as const,
  },
];

function HamburgerIcon({ open }: { open: boolean }) {
  const spring = { type: "spring" as const, stiffness: 300, damping: 25 };
  return (
    <div className="flex h-5 w-5 flex-col items-center justify-center gap-[5px]">
      <motion.span
        animate={open ? { rotate: 45, y: 3.25 } : { rotate: 0, y: 0 }}
        className="block h-[1.5px] w-4 bg-current"
        transition={spring}
      />
      <motion.span
        animate={open ? { opacity: 0 } : { opacity: 1 }}
        className="block h-[1.5px] w-4 bg-current"
        transition={{ duration: 0.1 }}
      />
      <motion.span
        animate={open ? { rotate: -45, y: -3.25 } : { rotate: 0, y: 0 }}
        className="block h-[1.5px] w-4 bg-current"
        transition={spring}
      />
    </div>
  );
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("transition-transform duration-200", open && "rotate-180")}
      fill="none"
      height="12"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="12"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function SearchPreviewCard() {
  return (
    <Link
      className="flex flex-1 flex-col overflow-hidden border border-border transition-all duration-200 hover:scale-[1.02] hover:border-foreground/20 hover:opacity-90"
      href="/#features"
    >
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-secondary/50">
        <Image
          alt="Enterprise search across all your tools"
          className="h-full w-full object-cover"
          height={240}
          quality={85}
          src="/images/examples/a21.png"
          width={320}
        />
      </div>
      <div className="border-border border-t bg-background p-2.5">
        <div className="font-sans text-foreground text-xs">
          Enterprise Search
        </div>
        <div className="font-sans text-[10px] text-muted-foreground">
          Search once. Sources cited.
        </div>
      </div>
    </Link>
  );
}

function DeployPreviewCard() {
  return (
    <Link
      className="flex flex-1 flex-col overflow-hidden border border-border transition-all duration-200 hover:scale-[1.02] hover:border-foreground/20 hover:opacity-90"
      href="/#features"
    >
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-secondary/50">
        <Image
          alt="AI agents and multi-step missions"
          className="h-full w-full object-cover"
          height={240}
          quality={85}
          src="/images/examples/a16.png"
          width={320}
        />
      </div>
      <div className="border-border border-t bg-background p-2.5">
        <div className="font-sans text-foreground text-xs">Agents</div>
        <div className="font-sans text-[10px] text-muted-foreground">
          Tasks, not just answers.
        </div>
      </div>
    </Link>
  );
}

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const [isMobileFeaturesOpen, setIsMobileFeaturesOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const featuresTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setIsFeaturesOpen(false);
    setIsMobileFeaturesOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const openFeatures = useCallback(() => {
    if (featuresTimeoutRef.current) {
      clearTimeout(featuresTimeoutRef.current);
    }
    setIsFeaturesOpen(true);
  }, []);

  const closeFeatures = useCallback(() => {
    featuresTimeoutRef.current = setTimeout(
      () => setIsFeaturesOpen(false),
      200
    );
  }, []);

  return (
    <>
      <nav className="fixed top-0 right-0 left-0 z-50 w-full">
        <div className="relative">
          <div
            className={cn(
              "relative z-10 px-4 py-3 sm:px-6 lg:px-8 xl:py-4",
              "flex items-center justify-between",
              "transition-[background-color,backdrop-filter] duration-300",
              isScrolled || isFeaturesOpen
                ? "bg-background-semi-transparent backdrop-blur-md"
                : "bg-transparent"
            )}
          >
            <Link
              className="flex items-center gap-2 transition-opacity duration-200 hover:opacity-80"
              href="/"
            >
              <Image
                alt=""
                className="block dark:hidden"
                height={24}
                priority
                src="/logo.png"
                width={24}
              />
              <Image
                alt=""
                className="hidden dark:block"
                height={24}
                priority
                src="/logo_dark.png"
                width={24}
              />
              <span className="font-medium font-sans text-base text-foreground">
                OpenBeam
              </span>
            </Link>

            <div className="hidden items-center gap-6 xl:flex">
              <button
                className={cn(
                  "flex items-center gap-1 text-sm transition-colors",
                  isFeaturesOpen
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onMouseEnter={openFeatures}
                onMouseLeave={closeFeatures}
                type="button"
              >
                Features
                <ChevronDown open={isFeaturesOpen} />
              </button>

              {NAV_ITEMS.map((item) => (
                <Link
                  className="flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
                  href={item.href}
                  key={item.label}
                  {...(item.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {item.label}
                  {item.icon === "star" && (
                    <span className="text-muted-foreground text-xs">★</span>
                  )}
                </Link>
              ))}
            </div>

            <div className="hidden items-center xl:flex">
              <Link
                className="bg-primary px-4 py-2 text-primary-foreground text-sm transition-colors hover:bg-primary/90"
                href="https://docs.openbeam.work/docs/getting-started"
              >
                Get Started
              </Link>
            </div>

            <button
              aria-label={isOpen ? "Close menu" : "Open menu"}
              className="flex h-10 w-10 items-center justify-center text-foreground xl:hidden"
              onClick={() => setIsOpen(!isOpen)}
              type="button"
            >
              <HamburgerIcon open={isOpen} />
            </button>
          </div>

          {isFeaturesOpen && (
            <div
              className="absolute top-full right-0 left-0 z-50"
              onMouseEnter={openFeatures}
              onMouseLeave={closeFeatures}
              role="menu"
            >
              <div className="h-1" />
              <div className="mx-4 animate-[dropdown-fade_0.15s_ease-out_forwards] border border-border bg-background p-4 sm:mx-6 lg:mx-8">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                  <div className="lg:col-span-2">
                    <div className="grid grid-cols-2 gap-0.5">
                      {FEATURES.map((feature, index) => (
                        <Link
                          className="group flex animate-[dropdown-slide_0.2s_ease-out_forwards] flex-col px-3 py-3 opacity-0 transition-colors duration-200 hover:bg-secondary"
                          href={feature.href}
                          key={feature.title}
                          onClick={() => setIsFeaturesOpen(false)}
                          style={{ animationDelay: `${index * 30}ms` }}
                          {...("external" in feature && feature.external
                            ? {
                                target: "_blank",
                                rel: "noopener noreferrer",
                              }
                            : {})}
                        >
                          <span className="font-sans text-foreground text-sm">
                            {feature.title}
                          </span>
                          <span className="font-sans text-muted-foreground text-xs transition-colors group-hover:text-foreground">
                            {feature.description}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="hidden h-[240px] lg:col-span-2 lg:flex lg:gap-4">
                    <SearchPreviewCard />
                    <DeployPreviewCard />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      <div
        className={cn(
          "fixed right-0 bottom-0 left-0 z-40 transition-opacity duration-150",
          isFeaturesOpen
            ? "visible bg-black/40 opacity-100"
            : "pointer-events-none invisible opacity-0"
        )}
        style={{ top: "56px" }}
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-40 bg-background pt-20 xl:hidden"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="px-6 pt-8">
              <div className="flex flex-col space-y-4 text-left">
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  initial={{ opacity: 0, y: -10 }}
                  transition={{ delay: 0, duration: 0.2 }}
                >
                  <button
                    className="flex w-full items-center justify-between py-2 font-sans text-2xl text-foreground"
                    onClick={() =>
                      setIsMobileFeaturesOpen(!isMobileFeaturesOpen)
                    }
                    type="button"
                  >
                    Features
                    <ChevronDown open={isMobileFeaturesOpen} />
                  </button>
                  <AnimatePresence>
                    {isMobileFeaturesOpen && (
                      <motion.div
                        animate={{ height: "auto", opacity: 1 }}
                        className="overflow-hidden"
                        exit={{ height: 0, opacity: 0 }}
                        initial={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="space-y-2 py-2 pl-4">
                          {FEATURES.map((feature) => (
                            <Link
                              className="block py-1.5 font-sans text-base text-muted-foreground transition-colors hover:text-foreground"
                              href={feature.href}
                              key={feature.title}
                              onClick={() => setIsOpen(false)}
                              {...("external" in feature && feature.external
                                ? {
                                    target: "_blank",
                                    rel: "noopener noreferrer",
                                  }
                                : {})}
                            >
                              {feature.title}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {NAV_ITEMS.map((item, i) => (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    initial={{ opacity: 0, y: -10 }}
                    key={item.label}
                    transition={{ delay: (i + 1) * 0.05, duration: 0.2 }}
                  >
                    <Link
                      className="block py-2 font-sans text-2xl text-foreground"
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      {...(item.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 border-border border-t pt-8">
                <Link
                  className="flex h-11 w-full items-center justify-center bg-primary px-5 text-primary-foreground text-sm transition-colors hover:bg-primary/90"
                  href="https://docs.openbeam.work/docs/getting-started"
                  onClick={() => setIsOpen(false)}
                >
                  Get Started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
