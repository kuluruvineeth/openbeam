import type { LogoComponent } from "@openbeam/integrations";
import { appLogos, connectorLogos } from "@openbeam/integrations/logos";
import { SourceIcon } from "@openbeam/ui/components/source-icon";

type ConnectorLogoProps = {
  type: string;
  size?: number;
};

export function ConnectorLogo({ type, size = 24 }: ConnectorLogoProps) {
  const upper = type.toUpperCase().replace(/-/g, "_");
  const lower = type.toLowerCase().replace(/_/g, "-");

  const Logo: LogoComponent | undefined =
    appLogos[upper as keyof typeof appLogos] ??
    connectorLogos[lower as keyof typeof connectorLogos];

  if (Logo) {
    return <Logo size={size} />;
  }

  return <SourceIcon size={size} type={type} />;
}
