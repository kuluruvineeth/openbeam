"use client";

import {
  Icons,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@openbeam/ui";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type Theme = "dark" | "system" | "light";

type Props = {
  currentTheme?: Theme;
};

const ThemeIcon = ({ currentTheme }: Props) => {
  switch (currentTheme) {
    case "dark":
      return <Icons.Moon size={12} />;
    case "system":
      return <Icons.Monitor size={12} />;
    default:
      return <Icons.Sun size={12} />;
  }
};

export const ThemeSwitch = () => {
  const { theme, setTheme, themes, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // After mounting, we have access to the theme
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-[32px]" />;
  }

  return (
    <div className="relative flex items-center">
      <Select onValueChange={(value: Theme) => setTheme(value)} value={theme}>
        <SelectTrigger className="h-[32px] w-full bg-transparent py-1.5 pr-3 pl-6 text-xs capitalize outline-none">
          <SelectValue>
            {theme
              ? theme.charAt(0).toUpperCase() + theme.slice(1)
              : "Select theme"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {themes.map((_theme) => (
              <SelectItem className="capitalize" key={_theme} value={_theme}>
                {_theme}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <div className="pointer-events-none absolute left-2">
        <ThemeIcon currentTheme={resolvedTheme as Theme} />
      </div>
    </div>
  );
};
