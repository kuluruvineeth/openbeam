"use client";

import type { ProviderId } from "@openbeam/types/ai";
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export function OpenAIIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
    </svg>
  );
}

export function AnthropicIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.258 0h3.767L16.906 20.48h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.569 3.52zm2.327 10.239 2.788-7.198 2.787 7.198H8.896z" />
    </svg>
  );
}

export function GoogleIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GeminiIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M12 24A14.304 14.304 0 0 0 0 12 14.304 14.304 0 0 0 12 0a14.305 14.305 0 0 0 12 12 14.305 14.305 0 0 0-12 12" />
    </svg>
  );
}

export function AzureIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M13.05 4.24 6.56 18.05a.5.5 0 0 1-.46.29H2.5a.5.5 0 0 1-.46-.71l6.5-14a.5.5 0 0 1 .46-.29h3.59a.5.5 0 0 1 .46.71v.19z"
        fill="#0078D4"
      />
      <path
        d="m21.96 18.05-4.12-7.21a.5.5 0 0 0-.87 0l-4.13 7.21H4.81l8.85-2.67a.5.5 0 0 0 .34-.47V3.66a.5.5 0 0 1 .5-.5h2.88a.5.5 0 0 1 .43.25l4.61 14.35a.5.5 0 0 1-.46.71h-3.59a.5.5 0 0 1-.46-.29l.05-.13z"
        fill="#0078D4"
      />
    </svg>
  );
}

export function OllamaIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-9.5c0 .83-.67 1.5-1.5 1.5S7 11.33 7 10.5 7.67 9 8.5 9s1.5.67 1.5 1.5zm6 0c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5 1.5.67 1.5 1.5zm-3 5.5c-1.66 0-3-1.12-3-2.5h6c0 1.38-1.34 2.5-3 2.5z" />
    </svg>
  );
}

export function CohereIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M7.273 8.727A5.455 5.455 0 1 0 7.273 19.637h4.364a6.545 6.545 0 0 0 6.545-6.546 3.273 3.273 0 0 0-3.273-3.272H7.273a.546.546 0 0 1 0-1.092h8a3.273 3.273 0 0 0 0-6.545h-8a5.455 5.455 0 1 0 0 6.545" />
    </svg>
  );
}

export function MistralIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M3 3h4v4H3V3zm14 0h4v4h-4V3zM3 10h4v4H3v-4zm7 0h4v4h-4v-4zm7 0h4v4h-4v-4zM3 17h4v4H3v-4zm7 0h4v4h-4v-4zm7 0h4v4h-4v-4z" />
    </svg>
  );
}

export function GroqIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c3.87 0 7 3.13 7 7s-3.13 7-7 7-7-3.13-7-7 3.13-7 7-7zm0 2.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z" />
    </svg>
  );
}

export function DefaultProviderIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
      <circle cx="8" cy="14" fill="currentColor" r="1" />
      <circle cx="16" cy="14" fill="currentColor" r="1" />
    </svg>
  );
}

const PROVIDER_ICONS: Record<ProviderId, React.ComponentType<IconProps>> = {
  openai: OpenAIIcon,
  anthropic: AnthropicIcon,
  google: GeminiIcon,
  azure: AzureIcon,
  ollama: OllamaIcon,
  twelvelabs: DefaultProviderIcon,
  cohere: CohereIcon,
  voyage: DefaultProviderIcon,
  openbeam: DefaultProviderIcon,
  elevenlabs: DefaultProviderIcon,
  cartesia: DefaultProviderIcon,
  playht: DefaultProviderIcon,
  deepgram: DefaultProviderIcon,
  assemblyai: DefaultProviderIcon,
  stability: DefaultProviderIcon,
  blackforestlabs: DefaultProviderIcon,
  runway: DefaultProviderIcon,
  jina: DefaultProviderIcon,
};

export function getProviderIcon(
  providerId: ProviderId
): React.ComponentType<IconProps> {
  return PROVIDER_ICONS[providerId] ?? DefaultProviderIcon;
}

export function ProviderIcon({
  providerId,
  size = 24,
  ...props
}: IconProps & { providerId: ProviderId }) {
  const Icon = getProviderIcon(providerId);
  return <Icon size={size} {...props} />;
}
