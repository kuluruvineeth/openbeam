import type {
  ExtractedEntity,
  QueryAnalysis,
  TemporalContext,
} from "@openbeam/types/ai";

export interface PromptContext {
  query: QueryAnalysis;
  conversationSummary?: string;
  citationStyle?: "inline" | "footnote" | "endnote";
}

export interface XMLSection {
  tag: string;
  content: string;
  attributes?: Record<string, string>;
}

export function buildXMLSection(section: XMLSection): string {
  const attrs = section.attributes
    ? Object.entries(section.attributes)
        .map(([k, v]) => ` ${k}="${v}"`)
        .join("")
    : "";
  return `<${section.tag}${attrs}>\n${section.content}\n</${section.tag}>`;
}

export function buildXMLPrompt(sections: XMLSection[]): string {
  return sections.map(buildXMLSection).join("\n\n");
}

const RAG_INSTRUCTIONS = `You are an enterprise search assistant. Answer questions using ONLY the provided context documents.

<rules>
1. Answer from context only. If information is insufficient, say so clearly
2. Cite sources using [N] notation where N corresponds to the document number
3. Be concise and direct. Prefer bullet points for lists
4. Never fabricate information not present in the context
5. If asked about something outside the context, acknowledge the limitation
6. When uncertain, express your confidence level
</rules>`;

const RAG_OUTPUT_FORMAT = `<output_format>
<answer>Your response here, with inline citations [1], [2], etc.</answer>
<confidence>high|medium|low</confidence>
</output_format>`;

export function buildRAGSystemPrompt(context: PromptContext): string {
  const sections: XMLSection[] = [];

  sections.push({
    tag: "instructions",
    content: RAG_INSTRUCTIONS,
  });

  if (context.conversationSummary) {
    sections.push({
      tag: "conversation_context",
      content: context.conversationSummary,
    });
  }

  if (context.query.temporalContext) {
    sections.push({
      tag: "temporal_focus",
      content: formatTemporalContext(context.query.temporalContext),
    });
  }

  if (context.query.entities.length > 0) {
    sections.push({
      tag: "key_entities",
      content: formatEntities(context.query.entities),
    });
  }

  sections.push({
    tag: "output_format",
    content: RAG_OUTPUT_FORMAT,
  });

  return buildXMLPrompt(sections);
}

const QUERY_ANALYSIS_INSTRUCTIONS = `Analyze the user query to understand intent and optimize retrieval strategy.

<analysis_tasks>
1. Identify the query type (question, command, search, comparison, definition, how-to)
2. Extract named entities (people, products, technologies, organizations, dates)
3. Detect temporal references (last week, Q3, yesterday)
4. Decompose complex queries into sub-queries if needed
5. Identify key search terms excluding stopwords
</analysis_tasks>`;

const QUERY_ANALYSIS_OUTPUT = `<analysis>
<intent>question|command|search|comparison|definition|howto|followup|clarification</intent>
<entities>
  <entity type="person|product|technology|organization|date" confidence="0.0-1.0">entity text</entity>
</entities>
<temporal>
  <reference type="relative|absolute">time description</reference>
</temporal>
<sub_queries>
  <query>decomposed query 1</query>
  <query>decomposed query 2</query>
</sub_queries>
<keywords>keyword1, keyword2, keyword3</keywords>
<requires_context>true|false</requires_context>
</analysis>`;

export function buildQueryAnalysisPrompt(): string {
  return buildXMLPrompt([
    { tag: "instructions", content: QUERY_ANALYSIS_INSTRUCTIONS },
    { tag: "output_format", content: QUERY_ANALYSIS_OUTPUT },
  ]);
}

const GROUNDING_VERIFICATION_INSTRUCTIONS = `Verify that each claim in the response is grounded in the source documents.

<verification_tasks>
1. Extract individual factual claims from the response
2. For each claim, find supporting evidence in the source documents
3. Assign a confidence score (0-1) based on evidence strength
4. Identify any claims that cannot be verified
5. Compute overall grounding score
</verification_tasks>

<grounding_criteria>
- High confidence (0.8-1.0): Claim directly stated in source
- Medium confidence (0.5-0.8): Claim implied or partially supported
- Low confidence (0.3-0.5): Weak or tangential evidence
- Unsupported (0-0.3): No evidence found
</grounding_criteria>`;

const GROUNDING_OUTPUT = `<verification>
<overall_score>0.0-1.0</overall_score>
<confidence>high|medium|low|uncertain</confidence>
<claims>
  <claim supported="true|false" confidence="0.0-1.0">
    <text>The claim text</text>
    <evidence>Supporting text from source document</evidence>
    <source_id>document_id</source_id>
  </claim>
</claims>
<unsupported_claims>
  <claim>Claim that could not be verified</claim>
</unsupported_claims>
</verification>`;

export function buildGroundingVerificationPrompt(): string {
  return buildXMLPrompt([
    { tag: "instructions", content: GROUNDING_VERIFICATION_INSTRUCTIONS },
    { tag: "output_format", content: GROUNDING_OUTPUT },
  ]);
}

const ENTITY_EXTRACTION_INSTRUCTIONS = `Extract named entities from the given text.

<entity_types>
- person: Names of individuals (@mentions, full names)
- organization: Company names, teams, departments
- product: Software products, tools, services
- technology: Programming languages, frameworks, platforms
- date: Temporal expressions (Q3 2024, last week, January 2025)
- project: Project names, codenames, initiatives
- location: Physical or virtual locations
</entity_types>

<extraction_rules>
1. Extract entities with their exact text as it appears
2. Normalize common abbreviations (k8s → kubernetes, postgres → postgresql)
3. Assign confidence based on context clarity
4. Avoid extracting common nouns unless clearly entity references
</extraction_rules>`;

const ENTITY_OUTPUT = `<entities>
<entity type="person|organization|product|technology|date|project|location">
  <text>original text</text>
  <normalized>normalized form if applicable</normalized>
  <confidence>0.0-1.0</confidence>
  <context>brief context explaining why this is an entity</context>
</entity>
</entities>`;

export function buildEntityExtractionPrompt(): string {
  return buildXMLPrompt([
    { tag: "instructions", content: ENTITY_EXTRACTION_INSTRUCTIONS },
    { tag: "output_format", content: ENTITY_OUTPUT },
  ]);
}

function formatTemporalContext(temporal: TemporalContext): string {
  const parts: string[] = [`Type: ${temporal.type}`];
  if (temporal.start) {
    parts.push(`Start: ${temporal.start.toISOString()}`);
  }
  if (temporal.end) {
    parts.push(`End: ${temporal.end.toISOString()}`);
  }
  if (temporal.description) {
    parts.push(`Description: ${temporal.description}`);
  }
  return parts.join("\n");
}

function formatEntities(entities: ExtractedEntity[]): string {
  return entities
    .map((e) => `- ${e.text} (${e.type}, confidence: ${e.confidence})`)
    .join("\n");
}

export const RAG_MULTISHOT_EXAMPLES = [
  {
    context: `[1] Employee Handbook - Remote Work Policy
Our company supports remote work for all eligible employees. Employees may work remotely up to 3 days per week with manager approval.`,
    question: "What is the remote work policy?",
    answer: `<answer>
According to the Employee Handbook, the company supports remote work for eligible employees. Employees may work remotely up to 3 days per week, but this requires manager approval [1].
</answer>
<confidence>high</confidence>`,
  },
  {
    context: `[1] Q3 Planning Notes
The team decided to prioritize the new authentication system.

[2] Engineering Roadmap
No mention of authentication priorities.`,
    question: "What are the team's priorities for authentication?",
    answer: `<answer>
Based on the Q3 Planning Notes, the team has decided to prioritize the new authentication system [1]. However, I could not find specific details about implementation priorities or timelines in the available documents.
</answer>
<confidence>medium</confidence>`,
  },
  {
    context: `[1] Product Documentation
The API supports OAuth 2.0 authentication.`,
    question: "What is the company's vacation policy?",
    answer: `<answer>
I could not find information about vacation policy in the provided documents. The available context only contains product documentation about API authentication [1]. You may want to check the Employee Handbook or HR policies for vacation information.
</answer>
<confidence>low</confidence>`,
  },
];

export const QUERY_ANALYSIS_EXAMPLES = [
  {
    query: "Show me what John worked on last quarter",
    analysis: `<analysis>
<intent>command</intent>
<entities>
  <entity type="person" confidence="0.95">John</entity>
  <entity type="date" confidence="0.9">last quarter</entity>
</entities>
<temporal>
  <reference type="relative">last quarter (Q4 2024)</reference>
</temporal>
<sub_queries>
  <query>John's work contributions</query>
  <query>Q4 2024 activity</query>
</sub_queries>
<keywords>worked, contributions, activity</keywords>
<requires_context>false</requires_context>
</analysis>`,
  },
  {
    query: "What's the difference between Kubernetes and Docker?",
    analysis: `<analysis>
<intent>comparison</intent>
<entities>
  <entity type="technology" confidence="0.95">Kubernetes</entity>
  <entity type="technology" confidence="0.95">Docker</entity>
</entities>
<temporal/>
<sub_queries>
  <query>Kubernetes features and purpose</query>
  <query>Docker features and purpose</query>
  <query>Kubernetes vs Docker comparison</query>
</sub_queries>
<keywords>difference, container, orchestration</keywords>
<requires_context>false</requires_context>
</analysis>`,
  },
];

export const GROUNDING_EXAMPLES = [
  {
    response:
      "The API rate limit is 100 requests per minute according to the documentation.",
    sources:
      "API Documentation: Rate limiting is set to 100 requests per minute per API key.",
    verification: `<verification>
<overall_score>0.95</overall_score>
<confidence>high</confidence>
<claims>
  <claim supported="true" confidence="0.95">
    <text>The API rate limit is 100 requests per minute</text>
    <evidence>Rate limiting is set to 100 requests per minute per API key</evidence>
    <source_id>api_docs_1</source_id>
  </claim>
</claims>
<unsupported_claims/>
</verification>`,
  },
];

export const ENTITY_EXTRACTION_EXAMPLES = [
  {
    text: "John Smith from Anthropic announced the new Claude model last week",
    extraction: `<entities>
<entity type="person">
  <text>John Smith</text>
  <confidence>0.95</confidence>
  <context>Named individual mentioned as announcer</context>
</entity>
<entity type="organization">
  <text>Anthropic</text>
  <confidence>0.95</confidence>
  <context>Company name, AI research organization</context>
</entity>
<entity type="product">
  <text>Claude</text>
  <confidence>0.9</confidence>
  <context>AI model product name</context>
</entity>
<entity type="date">
  <text>last week</text>
  <normalized>relative temporal reference</normalized>
  <confidence>0.85</confidence>
  <context>Relative time reference</context>
</entity>
</entities>`,
  },
  {
    text: "The Q3 planning meeting discussed migrating from PostgreSQL to MongoDB",
    extraction: `<entities>
<entity type="date">
  <text>Q3</text>
  <normalized>Q3 of current year</normalized>
  <confidence>0.9</confidence>
  <context>Quarterly time reference</context>
</entity>
<entity type="technology">
  <text>PostgreSQL</text>
  <confidence>0.95</confidence>
  <context>Database technology</context>
</entity>
<entity type="technology">
  <text>MongoDB</text>
  <confidence>0.95</confidence>
  <context>Database technology</context>
</entity>
</entities>`,
  },
  {
    text: "@alice Can you review the PR for the Kubernetes deployment on GitHub?",
    extraction: `<entities>
<entity type="person">
  <text>alice</text>
  <confidence>0.95</confidence>
  <context>@mention indicating person reference</context>
</entity>
<entity type="technology">
  <text>Kubernetes</text>
  <normalized>kubernetes</normalized>
  <confidence>0.95</confidence>
  <context>Container orchestration platform</context>
</entity>
<entity type="product">
  <text>GitHub</text>
  <confidence>0.95</confidence>
  <context>Code hosting platform</context>
</entity>
</entities>`,
  },
];

export function buildRAGPromptWithExamples(context: PromptContext): string {
  const basePrompt = buildRAGSystemPrompt(context);

  const examplesSection = RAG_MULTISHOT_EXAMPLES.map(
    (ex, i) => `<example id="${i + 1}">
<context>${ex.context}</context>
<question>${ex.question}</question>
<response>${ex.answer}</response>
</example>`
  ).join("\n\n");

  return `${basePrompt}\n\n<examples>\n${examplesSection}\n</examples>`;
}
