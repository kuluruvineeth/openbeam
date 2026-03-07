import { DocsAnalyticsProvider } from "@/components/analytics-provider";
import { RootProvider } from "fumadocs-ui/provider/next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import localFont from "next/font/local";
import "./global.css";

const F37Stout = localFont({
  src: [
    {
      path: "../../public/fonts/F37Stout-Regular.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-f37-stout",
  display: "swap",
});

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html
      className={`${GeistSans.variable} ${GeistMono.variable} ${F37Stout.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <DocsAnalyticsProvider>
          <RootProvider>{children}</RootProvider>
        </DocsAnalyticsProvider>
      </body>
    </html>
  );
}
