/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export const Logo = ({ size = 32, className }: LogoProps) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: This is a logo
  <svg
    className={className}
    height={size}
    viewBox="0 0 21 25"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M19.8966 0.055L4.8925 3.061C4.7695 3.089 4.6738 3.198 4.6738 3.335V9.115C4.6738 9.252 4.7695 9.361 4.8925 9.388L19.8966 12.395C20.0606 12.422 20.2246 12.299 20.2246 12.121V0.315C20.2246 0.151 20.0606 0.014 19.8966 0.055Z"
      fill="#FE5000"
    />
    <path
      d="M0.328 23.942L15.332 20.936C15.455 20.908 15.551 20.799 15.551 20.662V14.882C15.551 14.746 15.455 14.636 15.332 14.609L0.328 11.602C0.164 11.575 0 11.698 0 11.876V23.655C0 23.846 0.15 23.969 0.328 23.942Z"
      fill="#FE5000"
    />
  </svg>
);
