import type { MindtouchClient } from "../client";

export interface MindtouchCategory {
  "@id": string;
  "@href": string;
  title: string;
  path?: string;
  "uri.ui"?: string;
  "date.created"?: string;
  pages?: {
    "@totalcount": string;
  };
  "category.parent"?: {
    "@id": string;
    title: string;
  };
}

interface CategoriesResponse {
  category?: MindtouchCategory[] | MindtouchCategory;
  "@totalcount"?: string;
}

function normalizeCategoryArray(
  data: MindtouchCategory[] | MindtouchCategory | undefined
): MindtouchCategory[] {
  if (!data) {
    return [];
  }
  return Array.isArray(data) ? data : [data];
}

export async function* listCategories(
  client: MindtouchClient
): AsyncGenerator<MindtouchCategory[], void, undefined> {
  const response = await client.get<CategoriesResponse>("/site/tags", {
    type: "wiki",
  });

  const categories = normalizeCategoryArray(response.category);

  if (categories.length > 0) {
    yield categories;
  }
}
