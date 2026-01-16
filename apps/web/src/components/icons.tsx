import { Icons as BaseIcons } from "@openplane/ui";
import Image from "next/image";

type LogoProps = {
  size?: number;
  className?: string;
};

export const Icons = {
  ...BaseIcons,
  LogoSmall: ({ size = 20, className }: LogoProps) => (
    <div
      className={`relative ${className || ""}`}
      style={{ width: size, height: size }}
    >
      <Image
        alt="OpenPlane Logo"
        className="dark:hidden"
        height={size}
        src="/assets/logo.png"
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
        width={size}
      />
      <Image
        alt="OpenPlane Logo"
        className="hidden dark:block"
        height={size}
        src="/assets/logo_dark.png"
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
        width={size}
      />
    </div>
  ),
  Logo: ({ size = 40, className }: LogoProps) => (
    <div
      className={`relative ${className || ""}`}
      style={{ width: size, height: size }}
    >
      <Image
        alt="OpenPlane Logo"
        className="dark:hidden"
        height={size}
        src="/assets/logo.png"
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
        width={size}
      />
      <Image
        alt="OpenPlane Logo"
        className="hidden dark:block"
        height={size}
        src="/assets/logo_dark.png"
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
        width={size}
      />
    </div>
  ),
};
