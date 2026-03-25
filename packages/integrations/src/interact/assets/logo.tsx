/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export function Logo({ size = 32 }: LogoProps) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
    <svg
      height={size}
      viewBox="0 0 32 32"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#326ebd" height="32" rx="6" width="32" />
      <path
        d="M8 10a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4v-4h-4a2 2 0 01-2-2v-8z"
        fill="#ffffff"
      />
      <circle cx="12.5" cy="14" fill="#326ebd" r="1.2" />
      <circle cx="16" cy="14" fill="#326ebd" r="1.2" />
      <circle cx="19.5" cy="14" fill="#326ebd" r="1.2" />
    </svg>
  );
}
