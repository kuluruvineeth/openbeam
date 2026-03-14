import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Early Access — OpenBeam",
};

export default function EarlyAccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
