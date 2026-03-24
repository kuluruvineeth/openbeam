import type { AhaClient } from "../client";

export interface AhaProduct {
  id: string;
  reference_num: string;
  name: string;
  product_line: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductsResponse {
  products: AhaProduct[];
  pagination: {
    total_records: number;
    total_pages: number;
    current_page: number;
  };
}

export async function listProducts(client: AhaClient): Promise<AhaProduct[]> {
  const products: AhaProduct[] = [];
  let page = 1;

  while (true) {
    const response = await client.get<ProductsResponse>("/products", {
      page: String(page),
      per_page: "200",
    });

    products.push(...response.products);

    if (page >= response.pagination.total_pages) {
      break;
    }
    page += 1;
  }

  return products;
}
