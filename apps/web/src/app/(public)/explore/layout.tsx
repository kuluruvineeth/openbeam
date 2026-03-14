import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore — OpenBeam",
  description:
    "Search public knowledge bases — CVEs, ATT&CK techniques, OWASP guides, and more.",
};

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen bg-background font-sans text-foreground antialiased">
      {children}
    </div>
  );
}
