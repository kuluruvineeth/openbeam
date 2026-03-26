import { z } from "zod";

const EXTERNAL_SKILLS_CACHE_TTL_MS = 60_000;
const EXTERNAL_FETCH_TIMEOUT_MS = 4500;

const EXTERNAL_PROVIDER_SCHEMA = z.enum(["skills.sh", "clawhub"]);

const SKILLS_SH_RESPONSE_SCHEMA = z.object({
  skills: z.array(
    z.object({
      source: z.string().min(1),
      skillId: z.string().min(1),
      name: z.string().min(1),
      installs: z.coerce.number().int().nonnegative(),
    })
  ),
});

const CLAWHUB_RESPONSE_SCHEMA = z.object({
  items: z.array(
    z.object({
      slug: z.string().min(1),
      displayName: z.string().min(1),
      summary: z.string().nullable().optional(),
      tags: z.record(z.string(), z.string()).optional(),
      stats: z
        .object({
          downloads: z.coerce.number().int().nonnegative().optional(),
          installsAllTime: z.coerce.number().int().nonnegative().optional(),
          stars: z.coerce.number().int().nonnegative().optional(),
        })
        .optional(),
    })
  ),
});

const EXTERNAL_SKILL_CATALOG_ITEM_SCHEMA = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().nullable(),
  source: z.string().min(1),
  provider: EXTERNAL_PROVIDER_SCHEMA,
  providers: z.array(EXTERNAL_PROVIDER_SCHEMA).min(1),
  installs: z.number().int().nonnegative().nullable(),
  downloads: z.number().int().nonnegative().nullable(),
  stars: z.number().int().nonnegative().nullable(),
  tags: z.array(z.string()),
  url: z.string().url().nullable(),
});

const EXTERNAL_SKILL_PROVIDER_STATUS_SCHEMA = z.object({
  provider: EXTERNAL_PROVIDER_SCHEMA,
  status: z.enum(["ok", "error"]),
  total: z.number().int().nonnegative(),
  latencyMs: z.number().int().nonnegative(),
  error: z.string().optional(),
});

const EXTERNAL_SKILLS_CATALOG_SCHEMA = z.object({
  fetchedAt: z.iso.datetime(),
  skills: z.array(EXTERNAL_SKILL_CATALOG_ITEM_SCHEMA),
  providers: z.array(EXTERNAL_SKILL_PROVIDER_STATUS_SCHEMA),
});

type ExternalProvider = z.infer<typeof EXTERNAL_PROVIDER_SCHEMA>;
type ExternalSkillCatalogItem = z.infer<
  typeof EXTERNAL_SKILL_CATALOG_ITEM_SCHEMA
>;
type ExternalSkillProviderStatus = z.infer<
  typeof EXTERNAL_SKILL_PROVIDER_STATUS_SCHEMA
>;
type ExternalSkillsCatalog = z.infer<typeof EXTERNAL_SKILLS_CATALOG_SCHEMA>;

type ProviderFetchResult = {
  items: ExternalSkillCatalogItem[];
  provider: ExternalSkillProviderStatus;
};

const SKILLS_SH_URL = "https://skills.sh/api/skills/all-time/1";
const CLAWHUB_URL =
  "https://clawhub.ai/api/v1/skills?sort=downloads&dir=desc&nonSuspiciousOnly=true&limit=100";

let cachedCatalog: ExternalSkillsCatalog | null = null;
let cacheExpiresAt = 0;
let inFlightCatalogPromise: Promise<ExternalSkillsCatalog> | null = null;

function normalizeSkillName(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug.length > 0 ? slug : "unknown-skill";
}

function formatFetchError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown provider error";
}

function scoreCatalogItem(item: ExternalSkillCatalogItem): number {
  const installs = item.installs ?? 0;
  const downloads = item.downloads ?? 0;
  const stars = item.stars ?? 0;
  return installs * 2 + downloads + stars * 25;
}

function mergeNullableMetric(
  left: number | null,
  right: number | null
): number | null {
  if (left === null) {
    return right;
  }
  if (right === null) {
    return left;
  }
  return Math.max(left, right);
}

function dedupeStrings(values: string[]): string[] {
  const normalized = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return Array.from(new Set(normalized));
}

function dedupeProviders(values: ExternalProvider[]): ExternalProvider[] {
  return Array.from(new Set(values));
}

export function mapSkillsShCatalogResponse(
  payload: unknown
): ExternalSkillCatalogItem[] {
  const parsed = SKILLS_SH_RESPONSE_SCHEMA.parse(payload);

  return parsed.skills.map((skill) => ({
    name: normalizeSkillName(skill.skillId),
    displayName: skill.name.trim(),
    description: null,
    source: skill.source,
    provider: "skills.sh",
    providers: ["skills.sh"],
    installs: skill.installs,
    downloads: null,
    stars: null,
    tags: dedupeStrings(skill.source.split("/")),
    url: "https://skills.sh",
  }));
}

function mapClawhubTags(tags: Record<string, string> | undefined): string[] {
  if (!tags) {
    return [];
  }

  return dedupeStrings(Object.keys(tags).filter((tag) => tag !== "latest"));
}

export function mapClawhubCatalogResponse(
  payload: unknown
): ExternalSkillCatalogItem[] {
  const parsed = CLAWHUB_RESPONSE_SCHEMA.parse(payload);

  return parsed.items.map((item) => ({
    name: normalizeSkillName(item.slug),
    displayName: item.displayName.trim(),
    description: item.summary?.trim() || null,
    source: "clawhub.ai",
    provider: "clawhub",
    providers: ["clawhub"],
    installs: item.stats?.installsAllTime ?? null,
    downloads: item.stats?.downloads ?? null,
    stars: item.stats?.stars ?? null,
    tags: mapClawhubTags(item.tags),
    url: `https://clawhub.ai/skills?q=${encodeURIComponent(item.slug)}`,
  }));
}

export function mergeExternalCatalogEntries(
  items: ExternalSkillCatalogItem[]
): ExternalSkillCatalogItem[] {
  const merged = new Map<string, ExternalSkillCatalogItem>();

  for (const item of items) {
    const existing = merged.get(item.name);

    if (!existing) {
      merged.set(item.name, item);
      continue;
    }

    const currentScore = scoreCatalogItem(existing);
    const nextScore = scoreCatalogItem(item);
    const primary = nextScore > currentScore ? item : existing;
    const secondary = primary === item ? existing : item;

    merged.set(item.name, {
      ...primary,
      description: primary.description ?? secondary.description,
      source: primary.source || secondary.source,
      providers: dedupeProviders([
        ...primary.providers,
        ...secondary.providers,
      ]),
      installs: mergeNullableMetric(primary.installs, secondary.installs),
      downloads: mergeNullableMetric(primary.downloads, secondary.downloads),
      stars: mergeNullableMetric(primary.stars, secondary.stars),
      tags: dedupeStrings([...primary.tags, ...secondary.tags]),
    });
  }

  return Array.from(merged.values()).sort((left, right) => {
    const byScore = scoreCatalogItem(right) - scoreCatalogItem(left);
    if (byScore !== 0) {
      return byScore;
    }
    return left.name.localeCompare(right.name);
  });
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    EXTERNAL_FETCH_TIMEOUT_MS
  );

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchProvider(
  provider: ExternalProvider,
  fetcher: () => Promise<ExternalSkillCatalogItem[]>
): Promise<ProviderFetchResult> {
  const startedAt = Date.now();

  try {
    const items = await fetcher();
    return {
      items,
      provider: {
        provider,
        status: "ok",
        total: items.length,
        latencyMs: Date.now() - startedAt,
      },
    };
  } catch (error) {
    return {
      items: [],
      provider: {
        provider,
        status: "error",
        total: 0,
        latencyMs: Date.now() - startedAt,
        error: formatFetchError(error),
      },
    };
  }
}

async function refreshExternalSkillsCatalog(): Promise<ExternalSkillsCatalog> {
  const [skillsShResult, clawhubResult] = await Promise.all([
    fetchProvider("skills.sh", async () => {
      const payload = await fetchJson(SKILLS_SH_URL);
      return mapSkillsShCatalogResponse(payload);
    }),
    fetchProvider("clawhub", async () => {
      const payload = await fetchJson(CLAWHUB_URL);
      return mapClawhubCatalogResponse(payload);
    }),
  ]);

  const skills = mergeExternalCatalogEntries([
    ...skillsShResult.items,
    ...clawhubResult.items,
  ]);

  return EXTERNAL_SKILLS_CATALOG_SCHEMA.parse({
    fetchedAt: new Date().toISOString(),
    skills,
    providers: [skillsShResult.provider, clawhubResult.provider],
  });
}

export async function getExternalSkillsCatalog(): Promise<ExternalSkillsCatalog> {
  const now = Date.now();
  if (cachedCatalog && now < cacheExpiresAt) {
    return cachedCatalog;
  }

  if (!inFlightCatalogPromise) {
    inFlightCatalogPromise = refreshExternalSkillsCatalog().finally(() => {
      inFlightCatalogPromise = null;
    });
  }

  const catalog = await inFlightCatalogPromise;
  cachedCatalog = catalog;
  cacheExpiresAt = Date.now() + EXTERNAL_SKILLS_CACHE_TTL_MS;

  return catalog;
}

export function resetExternalSkillsCatalogCache(): void {
  cachedCatalog = null;
  cacheExpiresAt = 0;
  inFlightCatalogPromise = null;
}

export type {
  ExternalSkillCatalogItem,
  ExternalSkillProviderStatus,
  ExternalSkillsCatalog,
};
