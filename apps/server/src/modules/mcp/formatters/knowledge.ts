import { num, numbered, plural } from "./helpers";

type EntityResult = {
  id: string;
  name?: string | null;
  type?: string | null;
  aliases?: string[] | null;
  expertiseScore?: number | null;
  mentionCount?: number | null;
};

type EntityPanel = {
  entity: EntityResult;
  relations: {
    outgoing: RelationResult[];
    incoming: RelationResult[];
  };
  expertise: ExpertiseEntry[];
  recentMentions: MentionResult[];
};

type RelationResult = {
  id: string;
  relationType: string;
  weight?: number | null;
  fromEntity?: EntityResult | null;
  toEntity?: EntityResult | null;
};

type ExpertiseEntry = {
  topic: EntityResult;
  score?: number | null;
};

type ExpertResult = {
  person: EntityResult;
  score?: number | null;
};

type MentionResult = {
  id: string;
  documentId?: string | null;
  createdAt?: string | null;
};

type TopicCluster = {
  id: string;
  name: string;
  documentCount?: number | null;
  children?: TopicCluster[] | unknown[];
};

export function formatEntitySearch(
  query: string,
  entities: EntityResult[]
): string {
  if (entities.length === 0) {
    return [
      `No entities found matching "${query}".`,
      "",
      "Next steps:",
      "- Broaden the name or omit the type filter and try entity_search again.",
      "- Search documents instead: search_documents with the same query.",
      "- Browse topics: topic_list to discover known entities.",
    ].join("\n");
  }

  const rows = numbered(
    entities.map((e) => {
      const parts = [`${e.name ?? "Unknown"} [${e.type ?? "UNKNOWN"}]`];
      if (e.aliases && e.aliases.length > 0) {
        parts.push(`aliases: ${e.aliases.join(", ")}`);
      }
      const stats: string[] = [];
      if (e.mentionCount != null && e.mentionCount > 0) {
        stats.push(`${num(e.mentionCount)} mentions`);
      }
      if (e.expertiseScore != null && e.expertiseScore > 0) {
        stats.push(`expertise: ${e.expertiseScore.toFixed(1)}`);
      }
      if (stats.length > 0) {
        parts.push(stats.join(" · "));
      }
      return parts.join("\n   ");
    })
  );

  const hints = [
    "",
    "Next steps:",
    "- Get full details: entity_get with an entity's ID.",
    "- See relationships: entity_relations with entityId.",
    "- Find experts on a topic: topic_experts with a TOPIC entity's ID.",
    "- Search documents: search_documents to find content about an entity.",
  ].join("\n");

  return `Found ${plural(entities.length, "entity", "entities")} matching "${query}":\n\n${rows}${hints}`;
}

export function formatEntityPanel(panel: EntityPanel): string {
  const e = panel.entity;
  const parts: string[] = [];

  parts.push(`${e.name ?? "Unknown"} [${e.type ?? "UNKNOWN"}]`);
  if (e.aliases && e.aliases.length > 0) {
    parts.push(`Aliases: ${e.aliases.join(", ")}`);
  }
  const stats: string[] = [];
  if (e.mentionCount != null) {
    stats.push(`${num(e.mentionCount)} mentions`);
  }
  if (e.expertiseScore != null && e.expertiseScore > 0) {
    stats.push(`expertise score: ${e.expertiseScore.toFixed(1)}`);
  }
  if (stats.length > 0) {
    parts.push(stats.join(" · "));
  }

  if (panel.expertise.length > 0) {
    parts.push("");
    parts.push("Expertise:");
    for (const exp of panel.expertise) {
      const score = exp.score != null ? ` (${exp.score.toFixed(2)})` : "";
      parts.push(`  - ${exp.topic.name ?? "Unknown"}${score}`);
    }
  }

  const totalRelations =
    panel.relations.outgoing.length + panel.relations.incoming.length;
  if (totalRelations > 0) {
    parts.push("");
    parts.push(`Relationships (${totalRelations}):`);
    for (const r of panel.relations.outgoing.slice(0, 10)) {
      const target = r.toEntity?.name ?? "Unknown";
      parts.push(`  -> ${r.relationType} -> ${target}`);
    }
    for (const r of panel.relations.incoming.slice(0, 10)) {
      const source = r.fromEntity?.name ?? "Unknown";
      parts.push(`  <- ${r.relationType} <- ${source}`);
    }
    if (totalRelations > 20) {
      parts.push(`  ... and ${totalRelations - 20} more`);
    }
  }

  if (panel.recentMentions.length > 0) {
    parts.push("");
    parts.push(
      `Recent mentions: ${plural(panel.recentMentions.length, "document")}`
    );
  }

  parts.push("");
  parts.push("Next steps:");
  parts.push(
    "- See all relationships: entity_relations with this entity's ID."
  );
  parts.push(
    "- Find related documents: search_documents with the entity name."
  );
  if (e.type === "TOPIC") {
    parts.push("- Find experts: topic_experts with this entity's ID.");
  }
  if (e.type === "PERSON") {
    parts.push(
      "- See expertise areas: person_expertise with this entity's ID."
    );
  }

  return parts.join("\n");
}

export function formatEntityRelations(
  entityId: string,
  outgoing: RelationResult[],
  incoming: RelationResult[]
): string {
  const total = outgoing.length + incoming.length;
  if (total === 0) {
    return [
      `No relationships found for entity "${entityId}".`,
      "",
      "Next steps:",
      "- Get entity details: entity_get with this entity ID.",
      "- Search for related content: search_documents with the entity name.",
      "- Browse all topics: topic_list to explore the knowledge graph.",
    ].join("\n");
  }

  const parts: string[] = [];
  parts.push(`${plural(total, "relationship")} for entity "${entityId}":`);

  if (outgoing.length > 0) {
    parts.push("");
    parts.push(`Outgoing (${outgoing.length}):`);
    for (const r of outgoing) {
      const weight =
        r.weight != null ? ` (weight: ${r.weight.toFixed(2)})` : "";
      parts.push(
        `  -> ${r.relationType} -> ${r.toEntity?.name ?? "Unknown"}${weight}`
      );
    }
  }

  if (incoming.length > 0) {
    parts.push("");
    parts.push(`Incoming (${incoming.length}):`);
    for (const r of incoming) {
      const weight =
        r.weight != null ? ` (weight: ${r.weight.toFixed(2)})` : "";
      parts.push(
        `  <- ${r.relationType} <- ${r.fromEntity?.name ?? "Unknown"}${weight}`
      );
    }
  }

  parts.push("");
  parts.push("Next steps:");
  parts.push("- Get full panel: entity_get with the entity ID.");
  parts.push(
    "- Explore a related entity: entity_get with a related entity's ID."
  );
  parts.push("- Search documents: search_documents with entity names.");

  return parts.join("\n");
}

export function formatTopicExperts(
  topicId: string,
  experts: ExpertResult[]
): string {
  if (experts.length === 0) {
    return [
      `No experts found for topic "${topicId}".`,
      "",
      "Next steps:",
      "- Verify the topic: entity_get with this ID to confirm it exists.",
      "- Search for people: search_people with the topic name.",
      "- Browse all topics: topic_list to find related topics with experts.",
    ].join("\n");
  }

  const rows = numbered(
    experts.map((exp) => {
      const score =
        exp.score != null ? ` (score: ${exp.score.toFixed(2)})` : "";
      return `${exp.person.name ?? "Unknown"}${score}`;
    })
  );

  const hints = [
    "",
    "Next steps:",
    "- Get expert details: entity_get with a person's ID.",
    "- See full expertise: person_expertise with a person's ID.",
    "- Find their documents: search_documents with the person's name.",
  ].join("\n");

  return `${plural(experts.length, "expert")} for topic "${topicId}":\n\n${rows}${hints}`;
}

export function formatPersonExpertise(
  personId: string,
  expertise: ExpertiseEntry[]
): string {
  if (expertise.length === 0) {
    return [
      `No expertise found for person "${personId}".`,
      "",
      "Next steps:",
      "- Get person details: entity_get with this person's ID.",
      "- Search their documents: search_by_author with this person's ID.",
      "- Browse topics: topic_list to explore known expertise areas.",
    ].join("\n");
  }

  const rows = numbered(
    expertise.map((exp) => {
      const score =
        exp.score != null ? ` (score: ${exp.score.toFixed(2)})` : "";
      return `${exp.topic.name ?? "Unknown"} [${exp.topic.type ?? "TOPIC"}]${score}`;
    })
  );

  const hints = [
    "",
    "Next steps:",
    "- Get person details: entity_get with this person's ID.",
    "- Find experts on a specific topic: topic_experts with a topic ID.",
    "- Search their documents: search_documents with the person's name.",
  ].join("\n");

  return `${plural(expertise.length, "expertise area")} for person "${personId}":\n\n${rows}${hints}`;
}

export function formatTopicList(topics: TopicCluster[]): string {
  if (topics.length === 0) {
    return [
      "No topic clusters found.",
      "",
      "Next steps:",
      "- Check connector status: connector_list to ensure sources are active and synced.",
      "- Trigger a sync: sync_trigger to refresh data and generate topics.",
      "- Search documents: search_documents to verify content exists.",
    ].join("\n");
  }

  function renderCluster(cluster: TopicCluster, indent: number): string {
    const prefix = "  ".repeat(indent);
    const count =
      cluster.documentCount != null
        ? ` (${num(cluster.documentCount)} docs)`
        : "";
    let line = `${prefix}- ${cluster.name}${count}`;
    const children = cluster.children as TopicCluster[] | undefined;
    if (children && children.length > 0) {
      for (const child of children.slice(0, 5)) {
        line += `\n${renderCluster(child, indent + 1)}`;
      }
      if (children.length > 5) {
        line += `\n${"  ".repeat(indent + 1)}- ... and ${children.length - 5} more`;
      }
    }
    return line;
  }

  const tree = topics.map((t) => renderCluster(t, 0)).join("\n");

  const hints = [
    "",
    "Next steps:",
    "- Browse subtopics: topic_list with a topic's ID as parentId.",
    "- Find experts: topic_experts with a topic entity's ID.",
    "- Search topic content: search_documents with the topic name.",
  ].join("\n");

  return `${plural(topics.length, "topic cluster")}:\n\n${tree}${hints}`;
}
