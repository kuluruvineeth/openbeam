import type { Metadata } from "next";
import { Suspense } from "react";
import { ConnectorsGrid } from "@/components/connectors-grid";

export const metadata: Metadata = {
  title: "Connectors",
  description:
    "Connect OpenBeam with Gmail, Slack, Notion, GitHub, Linear, and 20+ more tools. Search across everything from a single place.",
  openGraph: {
    title: "Connectors | OpenBeam",
    description:
      "Connect OpenBeam with Gmail, Slack, Notion, GitHub, Linear, and 20+ more tools.",
    url: "https://openbeam.work/connectors/",
  },
  twitter: {
    title: "Connectors | OpenBeam",
    description:
      "Connect OpenBeam with Gmail, Slack, Notion, GitHub, Linear, and 20+ more tools.",
  },
  alternates: {
    canonical: "https://openbeam.work/connectors/",
  },
};

export default function ConnectorsPage() {
  return (
    <Suspense>
      <ConnectorsGrid />
    </Suspense>
  );
}
