import type {
  CompilationResult,
  SourceContribution,
} from "@openbeam/types/context";
import type { RelationService } from "./relation-service";
import type { ContextSearchService } from "./search-service";
import type { ContextStore } from "./store";

export interface CompileArticleOptions {
  teamId: string;
  topic: string;
  category: string;
  maxSources?: number;
}

export class KnowledgeCompiler {
  private readonly store: ContextStore;
  private readonly search: ContextSearchService;
  private readonly relations: RelationService;

  constructor(
    store: ContextStore,
    search: ContextSearchService,
    relations: RelationService
  ) {
    this.store = store;
    this.search = search;
    this.relations = relations;
  }

  async compile(options: CompileArticleOptions): Promise<CompilationResult> {
    const maxSources = options.maxSources ?? 20;

    const sources = await this.search.find(options.topic, options.teamId, {
      limit: maxSources,
    });

    if (sources.length === 0) {
      throw new Error(`No sources found for topic: ${options.topic}`);
    }

    const sourceContents = await Promise.all(
      sources.map((s) => this.store.read(options.teamId, s.uri))
    );

    const validSources = sourceContents.filter(
      (s): s is NonNullable<typeof s> => s !== null
    );

    const claims = validSources.map((source) => ({
      uri: source.uri,
      content: source.content ?? source.overview ?? source.abstractText,
      title: source.abstractText,
      connectorType: source.category ?? "unknown",
    }));

    const synthesized = this.synthesizeContent(options.topic, claims);

    const articleUri = `openbeam://wiki/${options.teamId}/${options.category}/${this.slugify(options.topic)}`;

    await this.store.create(options.teamId, {
      uri: articleUri,
      parentUri: `openbeam://wiki/${options.teamId}/${options.category}/`,
      abstractText: `Compiled article about ${options.topic}`,
      overview: synthesized.slice(0, 500),
      content: synthesized,
      contextType: "resource",
      category: options.category,
      isLeaf: true,
      ownerType: "team",
      ownerId: options.teamId,
    });

    const contributions: SourceContribution[] = claims.map((c) => ({
      sourceUri: c.uri,
      connectorType: c.connectorType,
      title: c.title,
      claimCount: 1,
      confidence: 0.8,
    }));

    for (const contribution of contributions) {
      await this.relations.link(
        options.teamId,
        articleUri,
        contribution.sourceUri,
        `source: ${contribution.title}`
      );
    }

    return {
      articleUri,
      title: options.topic,
      abstractText: `Compiled article about ${options.topic}`,
      sourceCount: validSources.length,
      claimCount: claims.length,
      overallConfidence: 0.8,
      tokensSaved: this.estimateTokenSavings(claims, synthesized),
    };
  }

  private synthesizeContent(
    topic: string,
    claims: Array<{ uri: string; content: string; title: string }>
  ): string {
    const sections = claims
      .filter((c) => c.content)
      .map((c, i) => `[${i + 1}] ${c.title}\n${c.content}`)
      .join("\n\n---\n\n");

    return `# ${topic}\n\n${sections}`;
  }

  private estimateTokenSavings(
    claims: Array<{ content: string }>,
    synthesized: string
  ): number {
    const rawTokens = claims.reduce(
      (sum, c) => sum + Math.ceil(c.content.length / 4),
      0
    );
    const compiledTokens = Math.ceil(synthesized.length / 4);
    return Math.max(0, rawTokens - compiledTokens);
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }
}
