import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ConnectorsGrid } from "@/components/connectors-grid";
import { getAllCategoryIds, getCategoryName } from "@/data/connectors";

interface PageProps {
  params: Promise<{ category: string }>;
}

export function generateStaticParams() {
  return getAllCategoryIds().map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { category } = await params;
  const name = getCategoryName(category);
  const title = `${name} Connectors`;
  const description = `Browse OpenBeam ${name.toLowerCase()} connectors. Connect your ${name.toLowerCase()} tools and search across everything.`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | OpenBeam`,
      description,
      url: `https://openbeam.work/connectors/category/${category}/`,
    },
    alternates: {
      canonical: `https://openbeam.work/connectors/category/${category}/`,
    },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { category } = await params;
  const validCategories = getAllCategoryIds();

  if (!validCategories.includes(category)) {
    notFound();
  }

  return (
    <Suspense>
      <ConnectorsGrid initialCategory={category} />
    </Suspense>
  );
}
