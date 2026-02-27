import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "OpenPlane Docs",
  description: "OpenPlane documentation",
};

export default function RootPage() {
  redirect("/docs");
}
