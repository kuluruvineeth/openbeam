/** @jsxImportSource react */
import type { LogoProps } from "../../types";

export function Logo({ size = 32 }: LogoProps) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: Icon
    <svg
      height={size}
      viewBox="75 155 95 95"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          gradientTransform="matrix(25.837,-40.959,40.959,25.837,110.183,245.668)"
          gradientUnits="userSpaceOnUse"
          id="pg1"
          x1="0"
          x2="1"
          y1="0"
          y2="0"
        >
          <stop offset="0" stopColor="#c6de89" />
          <stop offset=".31" stopColor="#92bc71" />
          <stop offset=".63" stopColor="#539453" />
          <stop offset="1" stopColor="#11773d" />
        </linearGradient>
        <linearGradient
          gradientTransform="matrix(49.093,0,0,49.093,112,186.849)"
          gradientUnits="userSpaceOnUse"
          id="pg2"
          x1="0"
          x2="1"
          y1="0"
          y2="0"
        >
          <stop offset="0" stopColor="#11773d" />
          <stop offset=".5" stopColor="#428a4c" />
          <stop offset="1" stopColor="#c6de89" />
        </linearGradient>
        <linearGradient
          gradientTransform="matrix(.123,-39.016,39.016,.123,98.916,210.493)"
          gradientUnits="userSpaceOnUse"
          id="pg3"
          x1="0"
          x2="1"
          y1="0"
          y2="0"
        >
          <stop offset="0" stopColor="#11773d" />
          <stop offset="1" stopColor="#c6de89" />
        </linearGradient>
      </defs>
      <path
        d="M86.93 224.333l25.113 14.506 7.331 4.211c2.183 1.248 4.679 1.95 7.331 1.95s5.225-.702 7.331-1.95l19.731-11.386c4.367-2.574 7.331-7.331 7.331-12.713v-8.812l-17.002-10.529-32.053 18.562-10.607 6.161c-2.106 1.17-4.601 1.949-7.253 1.949-2.652-.077-5.147-.701-7.253-1.949z"
        fill="url(#pg1)"
      />
      <path
        d="M161.098 181.127v37.513c0-5.46-2.964-10.217-7.331-12.791l-10.217-5.927-31.585-18.172v-20.433l8.11-4.679a13.48 13.48 0 0 1 6.708-1.638c2.651 0 5.225.702 7.331 1.95l19.263 11.152c4.679 2.574 7.721 7.487 7.721 13.025z"
        fill="url(#pg2)"
      />
      <path
        d="M86.93 224.333c-4.446-2.496-7.409-7.253-7.409-12.713v-23.084c0-5.148 2.651-9.671 6.629-12.323l8.189-4.679 24.177-13.96c-3.9 2.651-6.551 7.175-6.551 12.322v48.354l-10.607 6.161c-2.106 1.248-4.601 1.949-7.253 1.949-2.574-.155-5.069-.779-7.175-2.027z"
        fill="url(#pg3)"
      />
    </svg>
  );
}
