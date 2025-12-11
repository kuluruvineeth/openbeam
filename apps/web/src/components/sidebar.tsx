"use client";

import Link from "next/link";
import { useRef } from "react";
import { useOnClickOutside } from "usehooks-ts";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";
import { Icons } from "./icons";
import { MainMenu } from "./main-menu";
import { TeamDropdown } from "./team-dropdown";

const SIDEBAR_WIDTH = 240;
const EDGE_TRIGGER_WIDTH = 8;

export function Sidebar() {
  const { isOpen, isPinned, open, close, togglePin } = useSidebar();
  const sidebarRef = useRef<HTMLElement>(null);

  useOnClickOutside(sidebarRef as React.RefObject<HTMLElement>, () => {
    if (isOpen && !isPinned) {
      close();
    }
  });

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

      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: Sidebar hover detection */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-55 flex h-screen flex-col pb-4",
          "border-border border-r bg-background",
          "transition-all duration-200 ease-in-out",
          showSidebar ? "translate-x-0" : "-translate-x-full"
        )}
        onMouseLeave={isPinned ? undefined : close}
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

        <TeamDropdown isExpanded />
      </aside>

      <div
        className="hidden shrink-0 transition-all duration-200 ease-in-out md:block"
        style={{ width: isPinned ? SIDEBAR_WIDTH : 0 }}
      />
    </>
  );
}
