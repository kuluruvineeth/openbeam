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
import { jiraFullSync } from "./full";
import type { JiraSearchResponse } from "./types";

export async function* jiraIncrementalSync(
  client: AtlassianClient,
  context: JiraTransformContext,
  options: {
    cursor?: JiraSyncCursor;
    batchSize?: number;
    includeProjects?: string[];
    excludeProjects?: string[];
    syncComments?: boolean;
    lookbackDays?: number;
    issueTypes?: string[];
    statusFilter?: string[];
  } = {}
): AsyncGenerator<JiraSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 50, syncComments = true } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* jiraFullSync(client, context, {
      batchSize,
      includeProjects: options.includeProjects,
      excludeProjects: options.excludeProjects,
      syncComments,
      lookbackDays: options.lookbackDays,
      issueTypes: options.issueTypes,
      statusFilter: options.statusFilter,
    });
    return;
  }

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestUpdated: string | undefined = cursor.lastSyncTime;

  const formattedDate = cursor.lastSyncTime.replace("T", " ").slice(0, 19);
  let jql = `updated >= "${formattedDate}" ORDER BY updated ASC`;

  if (options.includeProjects?.length) {
    const projects = options.includeProjects.map((p) => `"${p}"`).join(", ");
    jql = `project IN (${projects}) AND ${jql}`;
  } else if (options.excludeProjects?.length) {
    const projects = options.excludeProjects.map((p) => `"${p}"`).join(", ");
    jql = `project NOT IN (${projects}) AND ${jql}`;
  }

  if (options.issueTypes?.length) {
    const types = options.issueTypes.map((t) => `"${t}"`).join(", ");
    jql = `issuetype IN (${types}) AND ${jql}`;
  }

  if (options.statusFilter?.length) {
    const statuses = options.statusFilter.map((s) => `"${s}"`).join(", ");
    jql = `status IN (${statuses}) AND ${jql}`;
  }

  let nextPageToken: string | undefined;

  try {
    do {
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
              cursor: {
                lastSyncTime: latestUpdated,
                lastFullSync: cursor.lastFullSync,
              },
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
    } while (nextPageToken);

    yield {
      items: documents,
      cursor: {
        lastSyncTime: latestUpdated,
        lastFullSync: cursor.lastFullSync,
      },
      hasMore: false,
      stats: { processed, skipped, errors },
    };
  } catch (error) {
    logger.warn(
      { error },
      "Jira incremental sync failed, falling back to full"
    );
    yield* jiraFullSync(client, context, {
      batchSize,
      includeProjects: options.includeProjects,
      excludeProjects: options.excludeProjects,
      syncComments,
      lookbackDays: options.lookbackDays,
      issueTypes: options.issueTypes,
      statusFilter: options.statusFilter,
    });
  }
}
