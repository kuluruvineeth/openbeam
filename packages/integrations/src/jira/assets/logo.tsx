/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export const Logo = ({ size = 32, className }: LogoProps) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: This is a logo
  <svg
    className={className}
    height={size}
    viewBox="0 0 256 256"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient
        id="jira-a"
        x1="98.03%"
        x2="58.89%"
        y1="0.22%"
        y2="40.77%"
      >
        <stop offset="18%" stopColor="#0052CC" />
        <stop offset="100%" stopColor="#2684FF" />
      </linearGradient>
      <linearGradient
        id="jira-b"
        x1="100.17%"
        x2="55.35%"
        y1="0.05%"
        y2="44.72%"
      >
        <stop offset="18%" stopColor="#0052CC" />
        <stop offset="100%" stopColor="#2684FF" />
      </linearGradient>
    </defs>
    <path
      d="M244.66 0H121.72a55.33 55.33 0 0 0 55.33 55.33h22.39v21.59a55.34 55.34 0 0 0 55.33 55.34V11.11A11.11 11.11 0 0 0 244.66 0z"
      fill="#2684FF"
    />
    <path
      d="M183.82 61.45H60.88a55.34 55.34 0 0 0 55.34 55.33h22.38v21.6a55.33 55.33 0 0 0 55.33 55.33V72.56a11.11 11.11 0 0 0-11.11-11.11z"
      fill="url(#jira-a)"
    />
    <path
      d="M122.98 122.9H.04a55.33 55.33 0 0 0 55.33 55.34h22.39v21.59A55.33 55.33 0 0 0 133.1 255.17V134.02a11.11 11.11 0 0 0-11.12-11.12z"
      fill="url(#jira-b)"
    />
  </svg>
);
