"use client";

import Link from "next/link";
import { Icons } from "@/components/icons";

export default function EarlyAccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center">
          <Icons.LogoSmall size={40} />

          <h1 className="mt-8 text-center font-serif text-[32px] text-foreground leading-none tracking-tight sm:text-[40px]">
            Not yet public
          </h1>

          <p className="mt-4 max-w-sm text-center text-muted-foreground text-sm leading-relaxed">
            OpenBeam is in early access. We&apos;re onboarding teams one at a
            time to ensure quality.
          </p>

          <div className="mt-10 w-full space-y-3">
            <Link
              className="flex h-11 w-full items-center justify-center gap-2 border border-foreground bg-foreground font-medium text-background text-sm transition-colors hover:bg-foreground/90"
              href="/explore"
            >
              <Icons.Search size={16} />
              Try public security search
            </Link>

            <a
              className="flex h-11 w-full items-center justify-center gap-2 border border-border bg-card font-medium text-foreground text-sm transition-colors hover:bg-accent"
              href="https://github.com/kuluruvineeth/openbeam"
              rel="noopener noreferrer"
              target="_blank"
            >
              <Icons.GitBranch size={16} />
              Star on GitHub
            </a>

            <Link
              className="flex h-11 w-full items-center justify-center border border-border/50 text-muted-foreground text-sm transition-colors hover:border-border hover:text-foreground"
              href="/login"
            >
              Already have access? Sign in
            </Link>
          </div>

          <div className="mt-12 flex items-center gap-4 font-mono text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em]">
            <span>25+ connectors</span>
            <span className="h-3 w-px bg-border" />
            <span>AI agents</span>
            <span className="h-3 w-px bg-border" />
            <span>Open source</span>
          </div>
        </div>
      </div>
    </div>
  );
}
