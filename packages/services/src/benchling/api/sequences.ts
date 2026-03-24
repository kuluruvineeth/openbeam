import type { BenchlingClient } from "../client";

interface BenchlingAnnotation {
  name: string;
  type: string;
  start: number;
  end: number;
  strand: number;
  color?: string;
}

export interface BenchlingDnaSequence {
  id: string;
  name: string;
  bases: string;
  length: number;
  folderId?: string | null;
  isCircular: boolean;
  annotations: BenchlingAnnotation[];
  schema?: { id: string; name: string } | null;
  createdAt: string;
  modifiedAt: string;
  archiveRecord?: { reason: string } | null;
  webURL: string;
  entityRegistryId?: string | null;
}

export interface BenchlingAaSequence {
  id: string;
  name: string;
  aminoAcids: string;
  length: number;
  folderId?: string | null;
  annotations: BenchlingAnnotation[];
  schema?: { id: string; name: string } | null;
  createdAt: string;
  modifiedAt: string;
  archiveRecord?: { reason: string } | null;
  webURL: string;
  entityRegistryId?: string | null;
}

interface DnaSequencesResponse {
  dnaSequences: BenchlingDnaSequence[];
  nextToken?: string;
}

interface AaSequencesResponse {
  aaSequences: BenchlingAaSequence[];
  nextToken?: string;
}

interface ListSequencesOptions {
  modifiedAt?: string;
}

export async function* listDnaSequences(
  client: BenchlingClient,
  options: ListSequencesOptions = {}
): AsyncGenerator<BenchlingDnaSequence[], void, undefined> {
  let nextToken: string | undefined;

  while (true) {
    const params: Record<string, string> = {
      pageSize: "100",
      sort: "modifiedAt:asc",
    };

    if (nextToken) {
      params.nextToken = nextToken;
    }

    if (options.modifiedAt) {
      params["modifiedAt.gte"] = options.modifiedAt;
    }

    const response = await client.get<DnaSequencesResponse>(
      "/dna-sequences",
      params
    );

    if (response.dnaSequences.length > 0) {
      yield response.dnaSequences;
    }

    if (!response.nextToken) {
      break;
    }
    nextToken = response.nextToken;
  }
}

export async function* listAaSequences(
  client: BenchlingClient,
  options: ListSequencesOptions = {}
): AsyncGenerator<BenchlingAaSequence[], void, undefined> {
  let nextToken: string | undefined;

  while (true) {
    const params: Record<string, string> = {
      pageSize: "100",
      sort: "modifiedAt:asc",
    };

    if (nextToken) {
      params.nextToken = nextToken;
    }

    if (options.modifiedAt) {
      params["modifiedAt.gte"] = options.modifiedAt;
    }

    const response = await client.get<AaSequencesResponse>(
      "/aa-sequences",
      params
    );

    if (response.aaSequences.length > 0) {
      yield response.aaSequences;
    }

    if (!response.nextToken) {
      break;
    }
    nextToken = response.nextToken;
  }
}
