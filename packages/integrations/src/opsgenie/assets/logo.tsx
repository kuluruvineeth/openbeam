/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export const Logo = ({ size = 32, className }: LogoProps) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: This is a logo
  <svg
    className={className}
    fill="none"
    height={size}
    viewBox="0 0 64 64"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M32 0C27.024 0 22.144 1.344 17.92 3.872L32 32 46.08 3.872C41.856 1.344 36.976 0 32 0Z"
      fill="#2684FF"
    />
    <path
      d="M17.92 3.872C6.88 10.496 0 22.528 0 36.16c0 2.88.32 5.696.896 8.416L32 32 17.92 3.872Z"
      fill="url(#og_a)"
    />
    <path
      d="M63.104 44.576c.576-2.72.896-5.536.896-8.416 0-13.632-6.88-25.664-17.92-32.288L32 32l31.104 12.576Z"
      fill="url(#og_b)"
    />
    <path
      d="M.896 44.576C4.192 56.32 14.816 64.96 27.52 64.96c1.504 0 2.976-.096 4.48-.288V32L.896 44.576Z"
      fill="url(#og_c)"
    />
    <path
      d="M32 31.68v33.28c1.504.192 2.976.288 4.48.288 12.704 0 23.328-8.64 26.624-20.384L32 31.68Z"
      fill="url(#og_d)"
    />
    <defs>
      <linearGradient
        gradientUnits="userSpaceOnUse"
        id="og_a"
        x1="16"
        x2="16"
        y1="3.872"
        y2="44.576"
      >
        <stop stopColor="#2684FF" />
        <stop offset="1" stopColor="#0052CC" />
      </linearGradient>
      <linearGradient
        gradientUnits="userSpaceOnUse"
        id="og_b"
        x1="48"
        x2="48"
        y1="3.872"
        y2="44.576"
      >
        <stop stopColor="#2684FF" />
        <stop offset="1" stopColor="#0052CC" />
      </linearGradient>
      <linearGradient
        gradientUnits="userSpaceOnUse"
        id="og_c"
        x1="16"
        x2="16"
        y1="32"
        y2="64.96"
      >
        <stop stopColor="#2684FF" />
        <stop offset="1" stopColor="#0052CC" />
      </linearGradient>
      <linearGradient
        gradientUnits="userSpaceOnUse"
        id="og_d"
        x1="48"
        x2="48"
        y1="31.68"
        y2="64.96"
      >
        <stop stopColor="#2684FF" />
        <stop offset="1" stopColor="#0052CC" />
      </linearGradient>
    </defs>
  </svg>
);
