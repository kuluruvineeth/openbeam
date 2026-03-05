import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConnectorDetailPage } from "@/components/connector-detail-page";
import { getAllSlugs, getConnectorBySlug } from "@/data/connectors";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const connector = getConnectorBySlug(slug);

  if (!connector) {
    return { title: "Connector not found" };
  }

  const title = `${connector.name} Integration`;
  const description = `Connect ${connector.name} to OpenBeam. ${connector.short_description}`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | OpenBeam`,
      description,
      url: `https://openbeam.work/connectors/${slug}/`,
    },
    twitter: {
      title: `${title} | OpenBeam`,
      description,
    },
    alternates: {
      canonical: `https://openbeam.work/connectors/${slug}/`,
    },
  };
}

export default async function ConnectorPage({ params }: PageProps) {
  const { slug } = await params;
  const connector = getConnectorBySlug(slug);

  if (!connector) {
    notFound();
  }

  return <ConnectorDetailPage connector={connector} />;
}
