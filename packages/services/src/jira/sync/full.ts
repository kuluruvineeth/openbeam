import type {
  JiraSyncBatch,
  JiraSyncCursor,
  JiraTransformContext,
} from "@openbeam/types/services/connectors/jira";
import type { GenericDocument } from "@openbeam/vespa";
import type { AtlassianClient } from "../../atlassian/client";
import { logger } from "../../lib/logger";
import { transformJiraComment } from "../transformers/comment";
import { transformJiraIssue } from "../transformers/issue";
import type { JiraSearchResponse } from "./types";

export async function* jiraFullSync(
  client: AtlassianClient,
  context: JiraTransformContext,
  options: {
    batchSize?: number;
    includeProjects?: string[];
    excludeProjects?: string[];
    syncComments?: boolean;
    lookbackDays?: number;
    issueTypes?: string[];
    statusFilter?: string[];
  } = {}
): AsyncGenerator<JiraSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 50;
  const syncComments = options.syncComments ?? true;
  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestUpdated: string | undefined;

  let jql = "ORDER BY updated DESC";

  if (options.includeProjects?.length) {
    const projects = options.includeProjects.map((p) => `"${p}"`).join(", ");
    jql = `project IN (${projects}) ${jql}`;
  } else if (options.excludeProjects?.length) {
    const projects = options.excludeProjects.map((p) => `"${p}"`).join(", ");
    jql = `project NOT IN (${projects}) ${jql}`;
  }

  if (options.issueTypes?.length) {
    const types = options.issueTypes.map((t) => `"${t}"`).join(", ");
    const clause = `issuetype IN (${types})`;
    jql = jql.startsWith("ORDER") ? `${clause} ${jql}` : `${clause} AND ${jql}`;
  }

  if (options.statusFilter?.length) {
    const statuses = options.statusFilter.map((s) => `"${s}"`).join(", ");
    const clause = `status IN (${statuses})`;
    jql = jql.startsWith("ORDER") ? `${clause} ${jql}` : `${clause} AND ${jql}`;
  }

  if (options.lookbackDays) {
    const dateFilter = `updated >= "-${options.lookbackDays}d"`;
    jql = jql.startsWith("ORDER")
      ? `${dateFilter} ${jql}`
      : `${dateFilter} AND ${jql}`;
  }

  let nextPageToken: string | undefined;

  do {
    try {
      const body: Record<string, unknown> = {
        jql,
        fields: [
          "summary",
          "description",
          "status",
          "issuetype",
          "priority",
          "assignee",
          "reporter",
          "creator",
          "labels",
          "components",
          "project",
          "created",
          "updated",
          "resolution",
          "resolutiondate",
          "comment",
          "parent",
        ],
        expand: ["renderedFields"],
        maxResults: batchSize,
        ...(nextPageToken && { nextPageToken }),
      };

      const result = await client.post<JiraSearchResponse>(
        "/rest/api/3/search/jql",
        body
      );

      for (const issue of result.issues) {
        try {
          const doc = transformJiraIssue(issue, context);
          documents.push(doc);
          processed += 1;

          if (!latestUpdated || issue.fields.updated > latestUpdated) {
            latestUpdated = issue.fields.updated;
          }

          if (syncComments && issue.fields.comment?.comments.length) {
            const renderedComments =
              issue.renderedFields?.comment?.comments ?? [];

            for (let i = 0; i < issue.fields.comment.comments.length; i += 1) {
              const comment = issue.fields.comment.comments[i];
              if (!comment) {
                continue;
              }
              const renderedBody = renderedComments[i]?.body;

              try {
                const commentDoc = transformJiraComment(
                  comment,
                  issue,
                  context,
                  renderedBody
                );
                documents.push(commentDoc);
                processed += 1;
              } catch (error) {
                logger.error(
                  { error, commentId: comment.id },
                  "Error transforming Jira comment"
                );
                errors += 1;
              }
            }
          }

          if (documents.length >= batchSize) {
            yield {
              items: documents,
              cursor: { lastSyncTime: latestUpdated, lastFullSync: Date.now() },
              hasMore: true,
              stats: { processed, skipped, errors },
            };
            documents = [];
          }
        } catch (error) {
          logger.error(
            { error, issueKey: issue.key },
            "Error transforming Jira issue"
          );
          errors += 1;
        }
      }

      nextPageToken = result.nextPageToken;
    } catch (error) {
      logger.error({ error }, "Error fetching Jira issues");
      throw error;
    }
  } while (nextPageToken);

  const cursor: JiraSyncCursor = {
    lastSyncTime: latestUpdated,
    lastFullSync: Date.now(),
  };

  yield {
    items: documents,
    cursor,
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}
