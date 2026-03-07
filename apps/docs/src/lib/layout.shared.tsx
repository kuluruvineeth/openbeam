import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import Image from "next/image";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <div className="flex items-center gap-2">
          <Image
            alt="OpenBeam"
            className="dark:hidden"
            height={24}
            src="/assets/logo.png"
            width={24}
          />
          <Image
            alt="OpenBeam"
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
            OpenBeam
          </span>
        </div>
      ),
      url: "/docs",
    },
    links: [
      {
        text: "GitHub",
        url: "https://github.com/kuluruvineeth/openbeam",
        external: true,
      },
    ],
    githubUrl: "https://github.com/kuluruvineeth/openbeam",
  };
}
