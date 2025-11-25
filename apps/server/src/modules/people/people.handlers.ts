/**
 * People/Directory API Handlers
 * Request handlers for people/directory operations
 */

import type { RouteHandler } from "@hono/zod-openapi";
import * as response from "@/lib/response";
import { type AuthEnv, getTeamId } from "@/middleware/auth";
import { getAccessControlIds } from "@/types/auth";
import type {
  getPerson,
  getPersonActivity,
  getPersonDocuments,
  getPersonOrgChart,
  listPeople,
  searchPeople,
} from "./people.routes";
import { peopleService } from "./people.service";

// ============================================================================
// List People
// ============================================================================

export const listPeopleHandler: RouteHandler<
  typeof listPeople,
  AuthEnv
> = async (c) => {
  const query = c.req.valid("query");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const { people, total } = await peopleService.listPeople({
    teamId,
    query: query.q,
    department: query.department,
    connectorType: query.connector_type,
    connectorId: query.connector_id,
    excludeBots: query.exclude_bots,
    limit: query.limit,
    offset: query.offset,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });

  const page = Math.floor(query.offset / query.limit) + 1;

  return response.paginated(c, people, {
    page,
    pageSize: query.limit,
    total,
  });
};

// ============================================================================
// Search People
// ============================================================================

export const searchPeopleHandler: RouteHandler<
  typeof searchPeople,
  AuthEnv
> = async (c) => {
  const query = c.req.valid("query");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const { people, total } = await peopleService.searchPeople(
    query.q,
    teamId,
    query.limit
  );

  return response.success(c, {
    people,
    query: query.q,
    total,
  });
};

// ============================================================================
// Get Person
// ============================================================================

export const getPersonHandler: RouteHandler<typeof getPerson, AuthEnv> = async (
  c
) => {
  const { personId } = c.req.valid("param");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const person = await peopleService.getPerson(personId, teamId);

  if (!person) {
    return response.notFound(c, "Person", personId);
  }

  return response.success(c, person);
};

// ============================================================================
// Get Person Org Chart
// ============================================================================

export const getPersonOrgChartHandler: RouteHandler<
  typeof getPersonOrgChart,
  AuthEnv
> = async (c) => {
  const { personId } = c.req.valid("param");
  const query = c.req.valid("query");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const orgChart = await peopleService.getOrgChart(
    personId,
    teamId,
    query.depth
  );

  if (!orgChart) {
    return response.notFound(c, "Person", personId);
  }

  return response.success(c, {
    ...orgChart,
    depth: query.depth,
  });
};

// ============================================================================
// Get Person Documents
// ============================================================================

export const getPersonDocumentsHandler: RouteHandler<
  typeof getPersonDocuments,
  AuthEnv
> = async (c) => {
  const { personId } = c.req.valid("param");
  const query = c.req.valid("query");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const authContext = c.get("authContext");
  const accessControlIds = getAccessControlIds(authContext);

  const person = await peopleService.getPerson(personId, teamId);

  if (!person) {
    return response.notFound(c, "Person", personId);
  }

  const result = await peopleService.getPersonDocuments(personId, teamId, {
    limit: query.limit,
    offset: query.offset,
    accessControlIds,
  });

  const page = Math.floor(query.offset / query.limit) + 1;
  const totalPages = Math.ceil(result.total / query.limit);

  return c.json(
    {
      success: true,
      data: {
        personId,
        person: {
          id: person.id,
          name: person.name,
          email: person.email,
          avatar: person.avatar,
          title: person.title,
          department: person.department,
          connectorType: person.connectorType,
          connectorId: person.connectorId,
        },
        documents: result.documents,
        total: result.total,
        documentTypeBreakdown: result.documentTypeBreakdown,
      },
      pagination: {
        page,
        pageSize: query.limit,
        total: result.total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    },
    200
  );
};

// ============================================================================
// Get Person Activity
// ============================================================================

export const getPersonActivityHandler: RouteHandler<
  typeof getPersonActivity,
  AuthEnv
> = async (c) => {
  const { personId } = c.req.valid("param");
  const query = c.req.valid("query");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const person = await peopleService.getPerson(personId, teamId);

  if (!person) {
    return response.notFound(c, "Person", personId);
  }

  const activity = await peopleService.getPersonActivity(
    personId,
    teamId,
    query.period
  );

  return response.success(c, {
    personId,
    period: query.period,
    ...activity,
  });
};
