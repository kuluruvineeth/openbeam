/**
 * Vespa Constants
 *
 * Shared constants for Vespa operations.
 */

// === Schema Names ===

export const SCHEMAS = {
  DOCUMENT: "openplane_document",
  PERSON: "person",
  CODE: "code",
  ENTITY: "entity",
  PROJECT: "project",
  RELATIONSHIP: "relationship",
} as const;

export type SchemaName = (typeof SCHEMAS)[keyof typeof SCHEMAS];

// === Default Namespace ===

export const DEFAULT_NAMESPACE = "default";

// === Embedding Dimensions ===

export const EMBEDDING_DIMENSIONS = {
  DEFAULT: 768, // OpenAI text-embedding-ada-002, Cohere embed-english-v3.0
  OPENAI_SMALL: 1536, // OpenAI text-embedding-3-small
  OPENAI_LARGE: 3072, // OpenAI text-embedding-3-large
  COHERE_ENGLISH: 768, // Cohere embed-english-v3.0
  SENTENCE_TRANSFORMERS: 768, // Most sentence-transformers models
} as const;

// === Rank Profiles ===

export const DOCUMENT_RANK_PROFILES = {
  DEFAULT: "default",
  BM25: "bm25",
  SEMANTIC: "semantic",
  SEMANTIC_TITLE: "semantic_title",
  HYBRID: "hybrid",
  HYBRID_ADVANCED: "hybrid_advanced",
  HYBRID_RECENCY: "hybrid_recency",
  RECENCY: "recency",
  ENGAGEMENT: "engagement",
  POPULAR: "popular",
  QUALITY: "quality",
  BY_AUTHOR: "by_author",
  TOPICS: "topics",
  ISSUES: "issues",
  FILES: "files",
  PERSONALIZED: "personalized",
  ENTERPRISE: "enterprise",
} as const;

export const PERSON_RANK_PROFILES = {
  DEFAULT: "default",
  SKILLS: "skills",
  ORGANIZATIONAL: "organizational",
  SEMANTIC: "semantic",
  HYBRID: "hybrid",
  ACTIVE_CONTRIBUTORS: "active_contributors",
  RECENTLY_ACTIVE: "recently_active",
} as const;

export const CODE_RANK_PROFILES = {
  DEFAULT: "default",
  NGRAM: "ngram",
  SYMBOLS: "symbols",
  DOCUMENTATION: "documentation",
  SEMANTIC: "semantic",
  HYBRID: "hybrid",
  RECENT: "recent",
  QUALITY: "quality",
  LANGUAGE_SPECIFIC: "language_specific",
} as const;

export const ENTITY_RANK_PROFILES = {
  DEFAULT: "default",
  BY_NAME: "by_name",
  BY_DESCRIPTION: "by_description",
  SEMANTIC: "semantic",
  HYBRID: "hybrid",
  ACTIVE: "active",
  POPULAR: "popular",
} as const;

// === Document Types ===

export const DOCUMENT_TYPES = {
  MESSAGE: "message",
  FILE: "file",
  PAGE: "page",
  ISSUE: "issue",
  TICKET: "ticket",
  EMAIL: "email",
  NOTE: "note",
  PR: "pr",
  REVIEW: "review",
  COMMENT: "comment",
  WIKI: "wiki",
  TASK: "task",
  MEETING: "meeting",
  RECORDING: "recording",
  TRANSCRIPT: "transcript",
  SPREADSHEET: "spreadsheet",
  PRESENTATION: "presentation",
} as const;

// === Connector Types ===

export const CONNECTOR_TYPES = {
  SLACK: "slack",
  GOOGLE_DRIVE: "google_drive",
  NOTION: "notion",
  GITHUB: "github",
  JIRA: "jira",
  CONFLUENCE: "confluence",
  LINEAR: "linear",
  ASANA: "asana",
  DROPBOX: "dropbox",
  MICROSOFT_TEAMS: "microsoft_teams",
  SHAREPOINT: "sharepoint",
  ZENDESK: "zendesk",
  INTERCOM: "intercom",
  HUBSPOT: "hubspot",
  SALESFORCE: "salesforce",
} as const;

// === Entity Types ===

export const ENTITY_TYPES = {
  USER: "user",
  CHANNEL: "channel",
  GROUP: "group",
  WORKSPACE: "workspace",
  ORG: "org",
  TEAM: "team",
  FOLDER: "folder",
  REPOSITORY: "repository",
  BOARD: "board",
  SPACE: "space",
  TOPIC: "topic",
  PRODUCT: "product",
  COMPANY: "company",
  LOCATION: "location",
  EVENT: "event",
  CUSTOM: "custom",
} as const;

// === Programming Languages ===

export const PROGRAMMING_LANGUAGES = {
  TYPESCRIPT: "typescript",
  JAVASCRIPT: "javascript",
  PYTHON: "python",
  GO: "go",
  RUST: "rust",
  JAVA: "java",
  KOTLIN: "kotlin",
  SWIFT: "swift",
  C: "c",
  CPP: "cpp",
  CSHARP: "csharp",
  RUBY: "ruby",
  PHP: "php",
  SCALA: "scala",
  HASKELL: "haskell",
  ELIXIR: "elixir",
  CLOJURE: "clojure",
  R: "r",
  SQL: "sql",
  SHELL: "shell",
  DOCKERFILE: "dockerfile",
  YAML: "yaml",
  JSON: "json",
  MARKDOWN: "markdown",
  HTML: "html",
  CSS: "css",
  SCSS: "scss",
} as const;

// === Status Values ===

export const DOCUMENT_STATUSES = {
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  DONE: "done",
  CLOSED: "closed",
  ARCHIVED: "archived",
} as const;

export const PRIORITIES = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  NONE: "none",
} as const;

export const VISIBILITY_LEVELS = {
  PUBLIC: "public",
  INTERNAL: "internal",
  TEAM: "team",
  PRIVATE: "private",
  RESTRICTED: "restricted",
} as const;

// === Timeouts ===

export const TIMEOUTS = {
  DEFAULT_MS: 30_000,
  SEARCH_MS: 10_000,
  BULK_FEED_MS: 60_000,
  HEALTH_CHECK_MS: 5000,
} as const;

// === Batch Sizes ===

export const BATCH_SIZES = {
  DEFAULT: 100,
  SMALL: 10,
  MEDIUM: 50,
  LARGE: 200,
  BULK: 500,
} as const;

// === Concurrency Limits ===

export const CONCURRENCY = {
  DEFAULT: 10,
  LOW: 5,
  HIGH: 20,
  BULK: 50,
} as const;
