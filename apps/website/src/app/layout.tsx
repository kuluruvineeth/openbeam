import { GeistMono } from "geist/font/mono";
import type { Metadata } from "next";
import { Hedvig_Letters_Sans, Hedvig_Letters_Serif } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/cn";
import "@/styles/globals.css";

const hedvigSans = Hedvig_Letters_Sans({
  weight: "400",
  subsets: ["latin"],
  display: "optional",
  variable: "--font-hedvig-sans",
  preload: true,
  adjustFontFallback: true,
  fallback: ["system-ui", "arial"],
});

const hedvigSerif = Hedvig_Letters_Serif({
  weight: "400",
  subsets: ["latin"],
  display: "optional",
  variable: "--font-hedvig-serif",
  preload: true,
  adjustFontFallback: true,
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://openbeam.work"),
  title: {
    default: "OpenBeam — Open-Source Enterprise AI Search",
    template: "%s | OpenBeam",
  },
  description:
    "The open-source Glean alternative. Self-hosted enterprise AI search with 20+ connectors, AI agents, and real-time sync.",
  openGraph: {
    title: "OpenBeam — Open-Source Enterprise AI Search",
    description:
      "Self-hosted Glean alternative with 20+ connectors, AI agents, and real-time sync. Own your data.",
    url: "https://openbeam.work",
    siteName: "OpenBeam",
    locale: "en_US",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenBeam — Open-Source Enterprise AI Search",
    description: "Self-hosted Glean alternative with 20+ connectors",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "OpenBeam",
  url: "https://openbeam.work",
  logo: "https://openbeam.work/logo.png",
  sameAs: [
    "https://github.com/kuluruvineeth/openbeam",
    "https://twitter.com/openbeam",
    "https://linkedin.com/company/openbeam",
  ],
  description: "Open-source enterprise AI search platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data, static object
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          type="application/ld+json"
        />
      </head>
      <body
        className={cn(
          `${hedvigSans.variable} ${hedvigSerif.variable} ${GeistMono.variable}`,
          "overflow-x-hidden bg-background font-sans antialiased"
        )}
      >
        <AnalyticsProvider>
          <NuqsAdapter>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              disableTransitionOnChange
              enableSystem
            >
              {children}
            </ThemeProvider>
          </NuqsAdapter>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
