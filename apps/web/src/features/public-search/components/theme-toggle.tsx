"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Icons } from "@/components/icons";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="size-8" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      type="button"
    >
      {isDark ? <Icons.Sun size={14} /> : <Icons.Moon size={14} />}
    </button>
  );
}
