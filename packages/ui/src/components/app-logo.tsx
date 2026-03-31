"use client";

import type { UnifiedApp } from "@openbeam/integrations";
import { appLogos } from "@openbeam/integrations/logos";
import { cn } from "../utils/cn";

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
        <LogoComponent size={size} />
      </div>
    );
  }

  if (typeof app.logo === "string") {
    return (
      <span
        className={cn(
          "block bg-center bg-cover bg-no-repeat object-contain",
          className
        )}
        role="img"
        style={{
          width: size,
          height: size,
          backgroundImage: `url(${app.logo})`,
        }}
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
