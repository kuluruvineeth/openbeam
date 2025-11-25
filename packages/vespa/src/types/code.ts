/**
 * Code Types for code schema
 *
 * Code search - finding code snippets, functions, and files.
 */

import type { BaseDocument, Embedding } from "./common";

// === Programming Languages ===

export type ProgrammingLanguage =
  | "typescript"
  | "javascript"
  | "python"
  | "go"
  | "rust"
  | "java"
  | "kotlin"
  | "swift"
  | "c"
  | "cpp"
  | "csharp"
  | "ruby"
  | "php"
  | "scala"
  | "haskell"
  | "elixir"
  | "clojure"
  | "r"
  | "sql"
  | "shell"
  | "dockerfile"
  | "yaml"
  | "json"
  | "markdown"
  | "html"
  | "css"
  | "scss"
  | "other";

// === Main Code Interface ===

export interface CodeDocument extends BaseDocument {
  // === Repository Context ===
  repo_id: string;
  repo_name: string;
  repo_owner?: string;
  repo_url?: string;
  default_branch?: string;

  // === File Location ===
  file_path: string;
  file_name: string;
  directory?: string;
  branch?: string;
  commit_sha?: string;

  // === Code Content ===
  language: ProgrammingLanguage | string;
  content: string;
  content_ngram?: string;
  content_embedding?: Embedding;

  // === Code Structure (AST-derived) ===
  symbols?: string[];
  imports?: string[];
  exports?: string[];
  definitions?: string[];
  references?: string[];

  // === Documentation ===
  docstring?: string;
  comments?: string;

  // === Quality ===
  line_count?: number;
  complexity_score?: number;
  test_coverage?: number;
  has_tests?: boolean;

  // === Authorship ===
  author_id?: string;
  author_name?: string;
  author_email?: string;
  contributors?: string[];
  last_modified_by?: string;
  commit_count?: number;

  // === Timestamps ===
  last_commit_at?: number;

  // === File Metadata ===
  file_size?: number;
  mime_type?: string;
  encoding?: string;

  // === Access Control ===
  access_control?: string[];
  is_public?: boolean;
  visibility?: "public" | "internal" | "private";

  // === URLs ===
  url?: string;
  permalink?: string;

  // === Metadata ===
  metadata?: string | Record<string, unknown>;
}

// === Input Types ===

export interface CodeInput {
  id: string;
  team_id: string;
  connector_id: string;
  repo_id: string;
  repo_name: string;
  file_path: string;
  file_name: string;
  language: ProgrammingLanguage | string;
  content: string;

  // Optional
  repo_owner?: string;
  repo_url?: string;
  default_branch?: string;
  directory?: string;
  branch?: string;
  commit_sha?: string;
  content_embedding?: Embedding;
  symbols?: string[];
  imports?: string[];
  exports?: string[];
  definitions?: string[];
  docstring?: string;
  comments?: string;
  line_count?: number;
  complexity_score?: number;
  has_tests?: boolean;
  author_id?: string;
  author_name?: string;
  author_email?: string;
  contributors?: string[];
  commit_count?: number;
  file_size?: number;
  is_public?: boolean;
  visibility?: "public" | "internal" | "private";
  access_control?: string[];
  url?: string;
  permalink?: string;
  metadata?: Record<string, unknown>;
  created_at?: number;
  updated_at?: number;
  last_commit_at?: number;
}

// === Update Types ===

export interface CodeUpdate {
  content?: string;
  content_embedding?: Embedding;
  symbols?: string[];
  imports?: string[];
  exports?: string[];
  definitions?: string[];
  docstring?: string;
  line_count?: number;
  complexity_score?: number;
  test_coverage?: number;
  has_tests?: boolean;
  commit_sha?: string;
  last_modified_by?: string;
  commit_count?: number;
  last_commit_at?: number;
  updated_at?: number;
}

// === Search Options ===

export interface CodeSearchOptions {
  query?: string;
  teamId: string;
  repoId?: string;
  repoName?: string;
  language?: ProgrammingLanguage | string;
  filePath?: string;
  symbols?: string[];
  limit?: number;
  offset?: number;
  rankProfile?:
    | "default"
    | "ngram"
    | "symbols"
    | "documentation"
    | "semantic"
    | "hybrid"
    | "recent"
    | "quality";
  embedding?: Embedding;
}

// === Search Result ===

export interface CodeSearchHit {
  id: string;
  relevance: number;
  code: CodeDocument;
}
