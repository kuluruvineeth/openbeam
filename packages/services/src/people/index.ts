/**
 * People/Directory Service
 * Business logic for people search and directory operations
 *
 * Uses @openplane/vespa personClient for type-safe operations.
 */

import {
  documentClient,
  type Person,
  personClient,
  type VespaHit,
} from "@openplane/vespa";
import type { DocumentSummary, PersonDetail, PersonSummary } from "../types";

// ============================================================================
// Types
// ============================================================================

export interface ListPeopleOptions {
  query?: string;
  department?: string;
  connectorType?: string;
  excludeBots?: boolean;
  limit?: number;
  offset?: number;
}

export interface PersonDocumentsOptions {
  limit?: number;
  offset?: number;
  accessControlIds?: string[];
}

// ============================================================================
// People Service Functions
// ============================================================================

/**
 * List/search people in the team directory
 */
export async function listPeople(
  teamId: string,
  options: ListPeopleOptions = {}
): Promise<{ people: PersonSummary[]; total: number }> {
  const {
    query,
    department,
    connectorType,
    excludeBots = true,
    limit = 20,
    offset = 0,
  } = options;

  const result = await personClient.search({
    teamId,
    query,
    department,
    connectorType,
    excludeBots,
    limit,
    offset,
  });

  const people = result.items.map((hit) => mapPersonHitToSummary(hit));

  return { people, total: result.total };
}

/**
 * Get a single person by ID
 */
export async function getPerson(
  personId: string,
  teamId: string
): Promise<PersonDetail | null> {
  const person = await personClient.get(personId);

  if (!person || person.team_id !== teamId) {
    return null;
  }

  return mapPersonToDetail(person);
}

/**
 * Search people by name or email
 */
export async function searchPeople(
  query: string,
  teamId: string,
  options: { limit?: number; excludeBots?: boolean } = {}
): Promise<PersonSummary[]> {
  const { limit = 10, excludeBots = true } = options;

  const result = await personClient.search({
    teamId,
    query,
    excludeBots,
    limit,
  });

  return result.items.map((hit) => mapPersonHitToSummary(hit));
}

/**
 * Get documents authored by a person
 */
export async function getPersonDocuments(
  personId: string,
  teamId: string,
  options: PersonDocumentsOptions = {}
): Promise<{
  documents: DocumentSummary[];
  total: number;
  documentTypeBreakdown: Array<{ type: string; count: number }>;
}> {
  const { limit = 20, offset = 0, accessControlIds } = options;

  const result = await documentClient.getByAuthor(personId, teamId, {
    limit: limit + 20, // Get extra for filtering
    offset,
  });

  // Filter by access control
  const filtered = result.items.filter((hit) => {
    if (hit.fields.is_public) {
      return true;
    }
    if (!accessControlIds?.length) {
      return false;
    }
    const acl = hit.fields.access_control || [];
    return accessControlIds.some((id) => acl.includes(id));
  });

  const documents = filtered.slice(0, limit).map((hit) => ({
    id: hit.fields.id,
    title: hit.fields.title || "Untitled",
    documentType: hit.fields.document_type || "document",
    connectorType: hit.fields.connector_type || "UNKNOWN",
    connectorId: hit.fields.connector_id || "",
    url: hit.fields.url,
    createdAt: hit.fields.created_at || Date.now(),
    accessControl: hit.fields.access_control || [],
  }));

  // Calculate document type breakdown
  const typeCount = new Map<string, number>();
  for (const doc of documents) {
    const count = typeCount.get(doc.documentType) || 0;
    typeCount.set(doc.documentType, count + 1);
  }

  const documentTypeBreakdown = Array.from(typeCount.entries()).map(
    ([type, count]) => ({ type, count })
  );

  return {
    documents,
    total: filtered.length,
    documentTypeBreakdown,
  };
}

/**
 * Get organization chart / direct reports for a person
 */
export async function getOrgChart(
  personId: string,
  teamId: string
): Promise<{
  person: PersonDetail | null;
  manager?: PersonSummary;
  directReports: PersonSummary[];
  peers: PersonSummary[];
}> {
  const person = await getPerson(personId, teamId);

  if (!person) {
    return { person: null, directReports: [], peers: [] };
  }

  // Get manager if available
  let manager: PersonSummary | undefined;
  if (person.manager?.id) {
    const managerPerson = await getPerson(person.manager.id, teamId);
    if (managerPerson) {
      manager = {
        id: managerPerson.id,
        name: managerPerson.name,
        email: managerPerson.email,
        avatar: managerPerson.avatar,
        title: managerPerson.title,
        department: managerPerson.department,
        connectorType: managerPerson.connectorType,
      };
    }
  }

  // Get direct reports
  const directReports: PersonSummary[] = [];
  if (person.directReports?.length) {
    for (const report of person.directReports.slice(0, 10)) {
      const reportPerson = await getPerson(report.id, teamId);
      if (reportPerson) {
        directReports.push({
          id: reportPerson.id,
          name: reportPerson.name,
          email: reportPerson.email,
          avatar: reportPerson.avatar,
          title: reportPerson.title,
          department: reportPerson.department,
          connectorType: reportPerson.connectorType,
        });
      }
    }
  }

  // Get peers (same department)
  let peers: PersonSummary[] = [];
  if (person.department) {
    const deptResult = await listPeople(teamId, {
      department: person.department,
      limit: 10,
      excludeBots: true,
    });
    peers = deptResult.people.filter((p) => p.id !== personId);
  }

  return { person, manager, directReports, peers };
}

// ============================================================================
// Private Helpers
// ============================================================================

function mapPersonHitToSummary(hit: VespaHit<Person>): PersonSummary {
  const fields = hit.fields;
  return {
    id: fields.id,
    name: fields.name || fields.display_name || "Unknown",
    email: fields.email,
    avatar: fields.avatar_url,
    title: fields.title,
    department: fields.department,
    isBot: fields.is_bot,
    connectorType: fields.connector_type || "UNKNOWN",
  };
}

function mapPersonToDetail(person: Person): PersonDetail {
  return {
    id: person.id,
    name: person.name || person.display_name || "Unknown",
    email: person.email,
    avatar: person.avatar_url,
    title: person.title,
    department: person.department,
    phone: person.phone,
    location: person.location,
    timezone: person.timezone,
    isBot: person.is_bot,
    connectorType: person.connector_type || "UNKNOWN",
    skills: person.skills,
    manager: person.manager_id
      ? { id: person.manager_id, name: person.manager_name || "" }
      : undefined,
    lastActiveAt: person.last_active_at,
  };
}

// ============================================================================
// Re-export types
// ============================================================================

export type { PersonDetail, PersonSummary } from "../types";
