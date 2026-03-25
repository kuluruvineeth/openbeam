/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export function Logo({ size = 32 }: LogoProps) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
    <svg
      height={size}
      viewBox="0 0 100 100"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#1a1a1a" height="100" rx="12" width="100" />
      <text
        dominantBaseline="central"
        fill="#ffffff"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="52"
        fontWeight="800"
        textAnchor="middle"
        x="50"
        y="52"
      >
        k
      </text>
    </svg>
  );
}
