/** @jsxImportSource react */
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
    <g fill="#027DAD" transform="translate(5 5) scale(1.4)">
      <path d="m8.227 13.638 13.44-13.421c.287-.287.758-.287 1.045 0l4.384 4.375c.289.29.289.759 0 1.045l-12.916 12.898c-.29.289-.76.289-1.049 0l-4.905-4.9v.003z" />
      <path d="M.217 5.64C.078 5.502 0 5.314 0 5.118c0-.197.078-.385.217-.523l4.383-4.378c.29-.29.76-.29 1.049 0l6.795 6.783-5.43 5.423L.217 5.64z" />
    </g>
  </svg>
);
