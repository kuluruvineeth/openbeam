"use client";

import { motion } from "motion/react";
import { useCallback, useState } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

type TabId = "macos" | "linux" | "windows" | "docker";

type Tab = {
  label: string;
  prompt: string;
  command: string;
  hint: string;
};

const TAB_ORDER: readonly TabId[] = ["macos", "linux", "windows", "docker"];

const TABS: Record<TabId, Tab> = {
  macos: {
    label: "macOS",
    prompt: "$",
    command: "brew install kuluruvineeth/tap/openbeam",
    hint: "Requires Homebrew. Installs the signed binary and shell completions.",
  },
  linux: {
    label: "Linux",
    prompt: "$",
    command: "curl -fsSL https://openbeam.work/install.sh | bash",
    hint: ".deb, .rpm, .apk, Arch packages also available on the GitHub release.",
  },
  windows: {
    label: "Windows",
    prompt: "PS>",
    command:
      "scoop bucket add openbeam https://github.com/kuluruvineeth/scoop-bucket; scoop install openbeam",
    hint: "Or via Winget once the microsoft/winget-pkgs PR lands.",
  },
  docker: {
    label: "Docker",
    prompt: "$",
    command:
      "docker run --rm ghcr.io/kuluruvineeth/openbeam-cli:latest version",
    hint: "Multi-arch: linux/amd64 + linux/arm64. Distroless base, <15 MB.",
  },
};

type CliInstallProps = {
  title?: string;
  subtitle?: string;
  showNextSteps?: boolean;
};

export function CliInstall({
  title = "Install the CLI",
  subtitle = "One binary, every terminal. Signed with cosign, attested with SLSA Level 3.",
  showNextSteps = true,
}: CliInstallProps) {
  const [active, setActive] = useState<TabId>("macos");
  const [copiedId, setCopiedId] = useState<TabId | null>(null);

  const activeTab = TABS[active];

  const handleTabKey = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }
      event.preventDefault();
      const delta = event.key === "ArrowLeft" ? -1 : 1;
      const next = (index + delta + TAB_ORDER.length) % TAB_ORDER.length;
      setActive(TAB_ORDER[next]);
      document.getElementById(`cli-install-tab-${TAB_ORDER[next]}`)?.focus();
    },
    []
  );

  const handleCopy = useCallback((id: TabId, command: string) => {
    navigator.clipboard
      .writeText(command)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch(Function.prototype as () => void);
  }, []);

  return (
    <section className="bg-background py-16 lg:py-24">
      <div className="mx-auto max-w-[1400px] px-4">
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.5, ease: EASE }}
          viewport={{ once: true, margin: "-40px" }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <h2 className="font-serif text-2xl text-foreground sm:text-3xl">
            {title}
          </h2>
          <p className="mt-2 max-w-xl text-muted-foreground text-sm leading-relaxed">
            {subtitle}
          </p>
        </motion.div>

        <motion.div
          className="mx-auto max-w-2xl"
          initial={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
          viewport={{ once: true, margin: "-40px" }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <div
            aria-label="Install method"
            className="flex items-center gap-px border border-border/40 border-b-0"
            role="tablist"
          >
            {TAB_ORDER.map((id, index) => {
              const selected = id === active;
              return (
                <button
                  aria-controls={`cli-install-panel-${id}`}
                  aria-selected={selected}
                  className={
                    selected
                      ? "flex-1 bg-background px-4 py-2.5 font-medium text-foreground text-sm"
                      : "flex-1 bg-muted/30 px-4 py-2.5 text-muted-foreground text-sm transition-colors hover:bg-muted/50 hover:text-foreground"
                  }
                  id={`cli-install-tab-${id}`}
                  key={id}
                  onClick={() => setActive(id)}
                  onKeyDown={(event) => handleTabKey(event, index)}
                  role="tab"
                  tabIndex={selected ? 0 : -1}
                  type="button"
                >
                  {TABS[id].label}
                </button>
              );
            })}
          </div>

          <div
            aria-labelledby={`cli-install-tab-${active}`}
            className="border border-border/40 bg-[#0a0a0a]"
            id={`cli-install-panel-${active}`}
            role="tabpanel"
          >
            <button
              aria-label={`Copy ${activeTab.label} install command`}
              className="group flex w-full items-start justify-between gap-4 px-5 py-4 text-left font-mono text-sm"
              onClick={() => handleCopy(active, activeTab.command)}
              type="button"
            >
              <span className="min-w-0 flex-1">
                <span className="text-white/30">{activeTab.prompt} </span>
                <span className="break-all text-white/80">
                  {activeTab.command}
                </span>
              </span>
              {copiedId === active ? (
                <svg
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <title>Copied</title>
                  <path d="M5 12l5 5L20 7" />
                </svg>
              ) : (
                <svg
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-white/30 transition-colors group-hover:text-white/60"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                >
                  <title>Copy</title>
                  <rect height="13" rx="2" width="13" x="9" y="9" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          </div>

          <p className="mt-3 font-sans text-muted-foreground/80 text-xs leading-relaxed">
            {activeTab.hint}
          </p>
        </motion.div>

        {showNextSteps && (
          <motion.div
            className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-center"
            initial={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.2 }}
            viewport={{ once: true, margin: "-40px" }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <a
              className="inline-flex h-10 items-center justify-center gap-2 border border-border px-5 font-sans text-foreground text-sm transition-colors hover:bg-muted"
              href="https://docs.openbeam.work/docs/cli/install"
            >
              All install methods
              <svg
                aria-hidden="true"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <title>External link</title>
                <path d="M7 17L17 7M7 7h10v10" />
              </svg>
            </a>
            <a
              className="inline-flex h-10 items-center justify-center gap-2 font-sans text-muted-foreground text-sm transition-colors hover:text-foreground"
              href="https://github.com/kuluruvineeth/openbeam/releases/latest"
              rel="noopener noreferrer"
              target="_blank"
            >
              <svg
                aria-hidden="true"
                className="h-3.5 w-3.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <title>GitHub</title>
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
              </svg>
              View release
            </a>
          </motion.div>
        )}
      </div>
    </section>
  );
}
