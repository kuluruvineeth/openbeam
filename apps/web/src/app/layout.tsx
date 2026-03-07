import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@openbeam/ui/styles/globals.css";
import localFont from "next/font/local";
import Providers from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

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

export const metadata: Metadata = {
  title: "openbeam",
  description: "openbeam",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${F37Stout.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
