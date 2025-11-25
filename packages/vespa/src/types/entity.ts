/**
 * Entity Types for entity schema
 *
 * Knowledge graph entities - users, channels, groups, projects, etc.
 */

import type { BaseDocument, Embedding } from "./common";

// === Entity Types ===

export type EntityType =
  | "user"
  | "channel"
  | "group"
  | "workspace"
  | "org"
  | "team"
  | "folder"
  | "repository"
  | "board"
  | "space"
  | "topic"
  | "product"
  | "company"
  | "location"
  | "event"
  | "custom";

export type EntityStatus = "active" | "inactive" | "archived" | "deleted";

// === Main Entity Interface ===

export interface Entity extends BaseDocument {
  external_id: string;

  // === Classification ===
  entity_type: EntityType | string;
  entity_subtype?: string;

  // === Core Information ===
  name: string;
  display_name?: string;
  description?: string;
  short_name?: string;

  // === Contact/Identity ===
  email?: string;
  emails?: string[];
  username?: string;
  phone?: string;

  // === Visual ===
  avatar_url?: string;
  icon?: string;
  color?: string;

  // === Hierarchy ===
  parent_id?: string;
  parent_ids?: string[];
  child_ids?: string[];
  member_ids?: string[];
  member_count?: number;
  owner_ids?: string[];

  // === Knowledge Graph ===
  related_entity_ids?: string[];
  related_project_ids?: string[];
  related_document_ids?: string[];
  tags?: string[];
  topics?: string[];

  // === Semantic ===
  entity_embedding?: Embedding;

  // === Activity ===
  document_count?: number;
  message_count?: number;
  activity_score?: number;
  last_activity_at?: number;

  // === Status ===
  status?: EntityStatus;
  is_active?: boolean;
  is_archived?: boolean;
  is_public?: boolean;
  visibility?: "public" | "internal" | "private";

  // === Access Control ===
  access_control?: string[];

  // === URL ===
  url?: string;

  // === Metadata ===
  metadata?: string | Record<string, unknown>;
  properties?: string;
}

// === Input Types ===

export interface EntityInput {
  id: string;
  team_id: string;
  connector_id: string;
  external_id: string;
  entity_type: EntityType | string;
  name: string;

  // Optional
  entity_subtype?: string;
  display_name?: string;
  description?: string;
  short_name?: string;
  email?: string;
  emails?: string[];
  username?: string;
  avatar_url?: string;
  icon?: string;
  color?: string;
  parent_id?: string;
  parent_ids?: string[];
  member_ids?: string[];
  member_count?: number;
  owner_ids?: string[];
  related_entity_ids?: string[];
  related_project_ids?: string[];
  tags?: string[];
  topics?: string[];
  entity_embedding?: Embedding;
  is_active?: boolean;
  is_public?: boolean;
  visibility?: "public" | "internal" | "private";
  access_control?: string[];
  url?: string;
  metadata?: Record<string, unknown>;
  created_at?: number;
  updated_at?: number;
}

// === Update Types ===

export interface EntityUpdate {
  name?: string;
  display_name?: string;
  description?: string;
  email?: string;
  avatar_url?: string;
  member_ids?: string[];
  member_count?: number;
  related_entity_ids?: string[];
  related_project_ids?: string[];
  tags?: string[];
  topics?: string[];
  entity_embedding?: Embedding;
  document_count?: number;
  message_count?: number;
  activity_score?: number;
  last_activity_at?: number;
  status?: EntityStatus;
  is_active?: boolean;
  is_archived?: boolean;
  updated_at?: number;
}

// === Search Options ===

export interface EntitySearchOptions {
  query?: string;
  teamId: string;
  entityType?: EntityType | string;
  entityTypes?: (EntityType | string)[];
  parentId?: string;
  isActive?: boolean;
  tags?: string[];
  limit?: number;
  offset?: number;
  rankProfile?:
    | "default"
    | "by_name"
    | "by_description"
    | "semantic"
    | "hybrid"
    | "active"
    | "popular";
  embedding?: Embedding;
}

// === Search Result ===

export interface EntitySearchHit {
  id: string;
  relevance: number;
  entity: Entity;
}
