import {
  connectorLogos,
  type LogoComponent,
} from "@openbeam/integrations/logos";
import { SourceIcon } from "@openbeam/ui/components/source-icon";

type ConnectorLogoProps = {
  type: string;
  size?: number;
};

export function ConnectorLogo({ type, size = 24 }: ConnectorLogoProps) {
  const normalized = type.toLowerCase().replace(/_/g, "-");
  const Logo: LogoComponent | undefined =
    connectorLogos[normalized as keyof typeof connectorLogos];

  if (Logo) {
    return <Logo size={size} />;
  }

  return <SourceIcon size={size} type={type} />;
}
