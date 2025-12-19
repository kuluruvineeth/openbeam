import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import Image from "next/image";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <div className="flex items-center gap-2">
          <Image
            alt="OpenPlane"
            className="dark:hidden"
            height={24}
            src="/assets/logo.png"
            width={24}
          />
          <Image
            alt="OpenPlane"
            className="hidden dark:block"
            height={24}
            src="/assets/logo_dark.png"
            width={24}
          />
          <span
            style={{
              fontFamily: "var(--font-f37-stout)",
              fontSize: "1.125rem",
            }}
          >
            OpenPlane
          </span>
        </div>
      ),
      url: "/docs",
    },
    links: [
      {
        text: "GitHub",
        url: "https://github.com/kuluruvineeth/openplane",
        external: true,
      },
    ],
    githubUrl: "https://github.com/kuluruvineeth/openplane",
  };
}
