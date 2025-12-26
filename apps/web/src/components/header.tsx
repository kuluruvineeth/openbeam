"use client";

import type { ReactNode } from "react";
import { Icons } from "@/components/icons";
import { UserMenu } from "@/components/user-menu";
import { useSidebar } from "@/hooks/use-sidebar";

type Props = {
  breadcrumbs?: ReactNode;
};

export function Header({ breadcrumbs }: Props) {
  const { open } = useSidebar();

  return (
    <header className="sticky top-0 z-50 flex h-[70px] shrink-0 items-center gap-4 border-b bg-background/70 px-6 backdrop-blur-xl">
      <button
        className="flex size-8 items-center justify-center text-foreground/60 transition-colors hover:text-foreground md:hidden"
        onClick={open}
        type="button"
      >
        <Icons.Menu size={20} />
      </button>

      {breadcrumbs && (
        <nav
          aria-label="Breadcrumb"
          className="hidden items-center gap-2 text-sm md:flex"
        >
          {breadcrumbs}
        </nav>
      )}

      <div className="ml-auto flex items-center gap-3">
        <UserMenu />
      </div>
    </header>
  );
}
