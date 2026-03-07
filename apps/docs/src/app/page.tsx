import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "OpenBeam Docs",
  description: "OpenBeam documentation",
};

export default function RootPage() {
  redirect("/docs");
}
