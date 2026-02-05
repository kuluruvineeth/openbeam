"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useOnClickOutside } from "usehooks-ts";
import { Icons } from "@/components/icons";
import { MainMenu } from "@/components/main-menu";
import { TeamDropdown } from "@/components/team-dropdown";
import { UserMenu } from "@/components/user-menu";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";

const SIDEBAR_WIDTH = 240;
const EDGE_TRIGGER_WIDTH = 8;

function isInsideRadixPortal(element: Element | null): boolean {
  if (!element) {
    return false;
  }
  return Boolean(
    element.closest("[data-radix-popper-content-wrapper]") ||
      element.closest("[data-radix-menu-content]") ||
      element.closest("[role='menu']")
  );
}

export function Sidebar() {
  const { isOpen, isPinned, open, close, togglePin } = useSidebar();
  const sidebarRef = useRef<HTMLElement>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useOnClickOutside(sidebarRef as React.RefObject<HTMLElement>, (event) => {
    if (isOpen && !isPinned && !isUserMenuOpen) {
      const target = event.target as HTMLElement;
      if (!isInsideRadixPortal(target)) {
        close();
      }
    }
  });

  const handleMouseLeave = useCallback(
    (event: React.MouseEvent) => {
      if (isPinned || isUserMenuOpen) {
        return;
      }
      const relatedTarget = event.relatedTarget as Element | null;
      if (isInsideRadixPortal(relatedTarget)) {
        return;
      }
      close();
    },
    [isPinned, isUserMenuOpen, close]
  );

  const showSidebar = isOpen || isPinned;

  return (
    <>
      {!isPinned && (
        <div
          aria-hidden="true"
          className="fixed top-0 left-0 z-60 hidden h-screen md:block"
          onMouseEnter={open}
          style={{ width: EDGE_TRIGGER_WIDTH }}
        />
      )}

      {isOpen && !isPinned && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-50 bg-black/50 md:hidden"
          onClick={close}
        />
      )}

      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: aside tracks mouse for auto-pin behavior */}
      <aside
        aria-label="Main navigation"
        className={cn(
          "fixed top-0 left-0 z-55 flex h-screen flex-col pb-4",
          "border-border border-r bg-background",
          "transition-all duration-200 ease-in-out",
          showSidebar ? "translate-x-0" : "-translate-x-full"
        )}
        onMouseLeave={handleMouseLeave}
        ref={sidebarRef}
        style={{ width: SIDEBAR_WIDTH }}
      >
        <div className="flex h-[70px] w-full items-center justify-between border-border border-b bg-background px-4">
          <Link className="ml-[6px]" href="/">
            <Icons.LogoSmall />
          </Link>

          <button
            className={cn(
              "hidden size-7 items-center justify-center md:flex",
              "border border-border bg-background transition-all",
              "text-foreground/60 hover:border-foreground/30 hover:bg-foreground/5 hover:text-foreground",
              isPinned &&
                "border-foreground/30 bg-foreground/10 text-foreground"
            )}
            onClick={togglePin}
            title={isPinned ? "Unpin sidebar" : "Pin sidebar open"}
            type="button"
          >
            <Icons.Pin
              className={cn("transition-transform", isPinned && "rotate-45")}
              size={14}
            />
          </button>

          <button
            className="flex size-7 items-center justify-center text-foreground/60 hover:text-foreground md:hidden"
            onClick={close}
            type="button"
          >
            <Icons.Close size={18} />
          </button>
        </div>

        <div className="flex w-full flex-1 flex-col">
          <MainMenu isExpanded />
        </div>

        <div className="absolute bottom-14 left-[19px]">
          <UserMenu onOpenChange={setIsUserMenuOpen} />
        </div>

        <TeamDropdown isExpanded />
      </aside>

      <div
        className="hidden shrink-0 transition-all duration-200 ease-in-out md:block"
        style={{ width: isPinned ? SIDEBAR_WIDTH : 0 }}
      />
    </>
  );
}
