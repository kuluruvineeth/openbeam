import {
  type BitbucketSnippet,
  BitbucketSnippetSchema,
} from "@openbeam/types/services/connectors/bitbucket";
import { z } from "zod";
import type { BitbucketClient } from "../client";

const SnippetPageSchema = z.object({
  pagelen: z.number(),
  values: z.array(BitbucketSnippetSchema),
  next: z.string().optional(),
});

export async function* getAllSnippets(
  client: BitbucketClient,
  since?: string
): AsyncGenerator<BitbucketSnippet> {
  let url: string | undefined = `/snippets/${client.workspace}`;

  const query: Record<string, string> = { pagelen: "100" };

  if (since) {
    query.q = `updated_on>="${since}"`;
    query.sort = "-updated_on";
  }

  while (url) {
    const raw = url.startsWith("http")
      ? await client.getFullUrl<unknown>(url)
      : await client.get<unknown>(url, query);

    const page = SnippetPageSchema.parse(raw);

    for (const snippet of page.values) {
      yield snippet;
    }

    url = page.next;
  }
}
