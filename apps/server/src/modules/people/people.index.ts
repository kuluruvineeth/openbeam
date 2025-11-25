/**
 * People/Directory API Module
 * Entry point for people/directory operations
 */

import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth, requireScopes } from "@/middleware/auth";
import { API_SCOPES } from "@/types/scopes";
import {
  getPersonActivityHandler,
  getPersonDocumentsHandler,
  getPersonHandler,
  getPersonOrgChartHandler,
  listPeopleHandler,
  searchPeopleHandler,
} from "./people.handlers";
import {
  getPerson,
  getPersonActivity,
  getPersonDocuments,
  getPersonOrgChart,
  listPeople,
  searchPeople,
} from "./people.routes";

const people = new OpenAPIHono<AuthEnv>();

// Apply auth middleware globally
people.use("/*", requireAuth);
people.use("/*", requireScopes([API_SCOPES.PEOPLE_READ]));

// ============================================================================
// People Endpoints
// ============================================================================

// List people
people.openapi(listPeople, listPeopleHandler);

// Search people
people.openapi(searchPeople, searchPeopleHandler);

// Get person
people.openapi(getPerson, getPersonHandler);

// Get person org chart
people.openapi(getPersonOrgChart, getPersonOrgChartHandler);

// Get person documents
people.openapi(getPersonDocuments, getPersonDocumentsHandler);

// Get person activity
people.openapi(getPersonActivity, getPersonActivityHandler);

export default people;
