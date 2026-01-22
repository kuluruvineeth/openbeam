import { ConnectorNode } from "./connector-node";
import { DatabaseQueryNode } from "./database-query-node";
import { GraphqlQueryNode } from "./graphql-query-node";
import { HttpRequestNode } from "./http-request-node";
import { ToolNode } from "./tool-node";

export type { ConnectorNodeData } from "./connector-node";
export { ConnectorNode } from "./connector-node";

export type { DatabaseQueryNodeData } from "./database-query-node";
export { DatabaseQueryNode } from "./database-query-node";

export type { GraphqlQueryNodeData } from "./graphql-query-node";
export { GraphqlQueryNode } from "./graphql-query-node";

export type { HttpRequestNodeData } from "./http-request-node";
export { HttpRequestNode } from "./http-request-node";

export type { ToolNodeData } from "./tool-node";
export { ToolNode } from "./tool-node";

export const integrationNodeTypes = {
  connector: ConnectorNode,
  http_request: HttpRequestNode,
  database_query: DatabaseQueryNode,
  graphql_query: GraphqlQueryNode,
  tool: ToolNode,
} as const;
