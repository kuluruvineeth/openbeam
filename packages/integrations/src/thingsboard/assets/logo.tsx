/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export const Logo = ({ size = 32, className }: LogoProps) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: Logo component
  <svg
    className={className}
    fill="none"
    height={size}
    viewBox="0 0 54 54"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      clipRule="evenodd"
      d="M6.923 15.226.458 26.424a1.2 1.2 0 0 0-.138.315 1.2 1.2 0 0 0 .151.821l6.452 11.174a1.2 1.2 0 0 0 1.366.366l1.73-.999a1.2 1.2 0 0 0 .365-1.366l-5.632-9.754 5.633-9.756a1.2 1.2 0 0 0-.366-1.366l-1.73-.999a1.2 1.2 0 0 0-1.366.366Z"
      fill="#305680"
      fillRule="evenodd"
    />
    <path
      clipRule="evenodd"
      d="M47.231 15.226l6.466 11.198c.064.097.111.203.138.315a1.2 1.2 0 0 1-.152.821l-6.451 11.174a1.2 1.2 0 0 1-1.366.366l-1.73-.999a1.2 1.2 0 0 1-.366-1.366l5.633-9.754-5.633-9.756a1.2 1.2 0 0 1 .366-1.366l1.73-.999a1.2 1.2 0 0 1 1.365.366Z"
      fill="#305680"
      fillRule="evenodd"
    />
    <path
      clipRule="evenodd"
      d="M27 38c6.075 0 11-4.925 11-11S33.075 16 27 16 16 20.925 16 27s4.925 11 11 11Zm0 2c7.18 0 13-5.82 13-13S34.18 14 27 14 14 19.82 14 27s5.82 13 13 13Z"
      fill="#305680"
      fillRule="evenodd"
    />
    <path
      clipRule="evenodd"
      d="m19.074 27.576 8.503-8.503a1 1 0 0 1 1.414 0l6.052 6.053a1 1 0 0 1 0 1.414l-8.502 8.503a1 1 0 0 1-1.414 0l-6.053-6.053a1 1 0 0 1 0-1.414Zm10.404-4.258a.5.5 0 0 0-.91-.546l-.546 1.75-4.129 2.064a.5.5 0 0 0-.392.341l.583 2.334a.5.5 0 0 0 .91.545l.437-1.75 4.129-2.064a.5.5 0 0 0 .392-.341l-.474-2.333Z"
      fill="#305680"
      fillRule="evenodd"
    />
  </svg>
);
