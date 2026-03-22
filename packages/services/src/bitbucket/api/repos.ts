import {
  type BitbucketRepository,
  BitbucketRepositorySchema,
} from "@openbeam/types/services/connectors/bitbucket";
import { z } from "zod";
import type { BitbucketClient } from "../client";

const RepoPageSchema = z.object({
  pagelen: z.number(),
  values: z.array(BitbucketRepositorySchema),
  next: z.string().optional(),
});

export async function* getAllRepos(
  client: BitbucketClient
): AsyncGenerator<BitbucketRepository> {
  let url: string | undefined = `/repositories/${client.workspace}`;
  const query: Record<string, string> = {
    pagelen: "100",
    sort: "-updated_on",
  };

  while (url) {
    const raw = url.startsWith("http")
      ? await client.getFullUrl<unknown>(url)
      : await client.get<unknown>(url, query);

    const page = RepoPageSchema.parse(raw);

    for (const repo of page.values) {
      yield repo;
    }

    url = page.next;
  }
}

export async function getRepo(
  client: BitbucketClient,
  repoSlug: string
): Promise<BitbucketRepository> {
  const raw = await client.get<unknown>(
    `/repositories/${client.workspace}/${repoSlug}`
  );
  return BitbucketRepositorySchema.parse(raw);
}
