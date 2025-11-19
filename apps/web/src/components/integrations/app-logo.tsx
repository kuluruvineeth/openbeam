"use client";

import type { UnifiedApp } from "@openplane/integrations";
import { appLogos } from "@openplane/integrations/logos";
import Image from "next/image";
import { cn } from "@/lib/utils";

type AppLogoProps = {
  app: UnifiedApp;
  className?: string;
  size?: number;
};

export function AppLogo({ app, className, size = 32 }: AppLogoProps) {
  const LogoComponent =
    typeof app.logo === "string" ? appLogos[app.logo] : app.logo;

  if (LogoComponent) {
    return (
      <div
        className={cn("relative flex items-center justify-center", className)}
      >
        <LogoComponent />
      </div>
    );
  }

  if (typeof app.logo === "string") {
    return (
      <Image
        alt={app.name}
        className={cn("object-contain", className)}
        height={size}
        src={app.logo}
        width={size}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded bg-muted",
        className
      )}
      style={{ width: size, height: size }}
    />
  );
}
