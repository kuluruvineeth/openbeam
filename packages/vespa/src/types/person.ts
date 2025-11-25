/**
 * Person Types for person schema
 *
 * People search - finding colleagues, experts, and collaborators.
 */

import type { BaseDocument, Embedding } from "./common";

// === Person Status ===

export type PersonStatus =
  | "active"
  | "away"
  | "dnd"
  | "offline"
  | "deactivated";

// === Main Person Interface ===

export interface Person extends BaseDocument {
  external_id: string;

  // === Identity ===
  email: string;
  name: string;
  display_name?: string;
  username?: string;
  avatar_url?: string;

  // === Professional Profile ===
  job_title?: string;
  department?: string;
  location?: string;
  timezone?: string;
  manager_id?: string;
  reports_to?: string[];

  // === Skills & Expertise ===
  skills?: string[];
  expertise_areas?: string[];
  certifications?: string[];
  languages?: string[];

  // === Work Activity ===
  project_ids?: string[];
  active_project_ids?: string[];
  channel_ids?: string[];
  group_ids?: string[];

  // === Engagement Metrics ===
  document_count?: number;
  message_count?: number;
  contribution_score?: number;
  last_active_at?: number;

  // === Semantic ===
  profile_embedding?: Embedding;

  // === Contact ===
  phone?: string;
  social_links?: string; // JSON
  bio?: string;

  // === Status ===
  status?: PersonStatus;
  status_message?: string;
  is_active?: boolean;
  is_bot?: boolean;

  // === Timestamps ===
  joined_at?: number;

  // === Metadata ===
  metadata?: string | Record<string, unknown>;
}

// === Input Types ===

export interface PersonInput {
  id: string;
  team_id: string;
  connector_id: string;
  external_id: string;
  email: string;
  name: string;

  // Optional fields
  display_name?: string;
  username?: string;
  avatar_url?: string;
  job_title?: string;
  department?: string;
  location?: string;
  timezone?: string;
  manager_id?: string;
  skills?: string[];
  expertise_areas?: string[];
  certifications?: string[];
  bio?: string;
  profile_embedding?: Embedding;
  is_active?: boolean;
  is_bot?: boolean;
  metadata?: Record<string, unknown>;
  created_at?: number;
  updated_at?: number;
}

// === Update Types ===

export interface PersonUpdate {
  name?: string;
  display_name?: string;
  job_title?: string;
  department?: string;
  location?: string;
  skills?: string[];
  expertise_areas?: string[];
  certifications?: string[];
  bio?: string;
  profile_embedding?: Embedding;
  document_count?: number;
  message_count?: number;
  contribution_score?: number;
  last_active_at?: number;
  status?: PersonStatus;
  is_active?: boolean;
  updated_at?: number;
}

// === Search Options ===

export interface PersonSearchOptions {
  query?: string;
  teamId: string;
  department?: string;
  skills?: string[];
  location?: string;
  isActive?: boolean;
  excludeBots?: boolean;
  limit?: number;
  offset?: number;
  rankProfile?:
    | "default"
    | "skills"
    | "organizational"
    | "semantic"
    | "hybrid"
    | "active_contributors"
    | "recently_active";
}

// === Search Result ===

export interface PersonSearchHit {
  id: string;
  relevance: number;
  person: Person;
}
