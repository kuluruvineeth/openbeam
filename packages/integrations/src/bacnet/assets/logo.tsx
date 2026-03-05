import type { LogoProps } from "../../types";

export const Logo = ({ size = 32, className }: LogoProps) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Logo component
  <svg
    className={className}
    fill="none"
    height={size}
    viewBox="0 0 48 48"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect fill="#00843D" height="40" rx="4" width="40" x="4" y="4" />
    <path
      d="M16 14h6c2.761 0 5 1.79 5 4s-2.239 4-5 4h-6v-8Zm0 8h7c2.761 0 5 1.79 5 4s-2.239 4-5 4h-7v-8Z"
      fill="none"
      stroke="#FFFFFF"
      strokeLinejoin="round"
      strokeWidth="2"
    />
    <circle cx="36" cy="18" fill="#FFFFFF" r="2" />
    <circle cx="36" cy="30" fill="#FFFFFF" r="2" />
    <path d="M28 18h6M28 30h6" stroke="#FFFFFF" strokeWidth="1.5" />
  </svg>
);
