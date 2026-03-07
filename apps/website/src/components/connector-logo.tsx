import { appLogos } from "@openbeam/integrations/logos";
import { cn } from "@/lib/cn";

interface ConnectorLogoProps {
  appId: string;
  className?: string;
}

export function ConnectorLogo({ appId, className }: ConnectorLogoProps) {
  const LogoComponent = appLogos[appId];

  if (LogoComponent) {
    return (
      <div
        className={cn(
          "flex items-center justify-center [&>svg]:h-full [&>svg]:w-full",
          className
        )}
      >
        <LogoComponent size={40} />
      </div>
    );
  }

  const initial = appId.charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-muted font-sans text-muted-foreground text-sm",
        className
      )}
    >
      {initial}
    </div>
  );
}
