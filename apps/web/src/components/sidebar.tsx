"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Icons } from "./icons";
import { MainMenu } from "./main-menu";
import { OrgDropdown } from "./org-dropdown";

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: This is a sidebar
    <aside
      className={cn(
        "fixed top-0 z-50 hidden h-screen shrink-0 flex-col items-center justify-between pb-4 transition-all duration-200 ease-&lsqb;cubic-bezier(0.4,0,0.2,1)&rsqb; md:flex",
        "border-border border-r bg-background",
        isExpanded ? "w-[240px]" : "w-[70px]"
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div
        className={cn(
          "absolute top-0 left-0 flex h-[70px] items-center justify-center border-border border-b bg-background transition-all duration-200 ease-&lsqb;cubic-bezier(0.4,0,0.2,1)&rsqb;",
          isExpanded ? "w-full" : "w-[69px]"
        )}
      >
        <Link className="absolute left-[22px] transition-none" href="/">
          <Icons.LogoSmall />
        </Link>
      </div>

      <div className="flex w-full flex-1 flex-col pt-[70px]">
        <MainMenu isExpanded={isExpanded} />
      </div>

      <OrgDropdown isExpanded={isExpanded} />
    </aside>
  );
}
