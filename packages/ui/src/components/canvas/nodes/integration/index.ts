import { ConnectorActionNode } from "./connector-action-node";
import { ConnectorNode } from "./connector-node";
import { DatabaseQueryNode } from "./database-query-node";
import { GraphqlQueryNode } from "./graphql-query-node";
import { HttpRequestNode } from "./http-request-node";
import { ToolNode } from "./tool-node";

export type { ConnectorActionNodeData } from "./connector-action-node";
export {
  ConnectorActionNode,
  createConnectorActionNodeData,
} from "./connector-action-node";

export type { ConnectorNodeData } from "./connector-node";
export { ConnectorNode, createConnectorNodeData } from "./connector-node";

export type { DatabaseQueryNodeData } from "./database-query-node";
export {
  createDatabaseQueryNodeData,
  DatabaseQueryNode,
} from "./database-query-node";

export type { GraphqlQueryNodeData } from "./graphql-query-node";
export {
  createGraphqlQueryNodeData,
  GraphqlQueryNode,
} from "./graphql-query-node";

export type { HttpRequestNodeData } from "./http-request-node";
export {
  createHttpRequestNodeData,
  HttpRequestNode,
} from "./http-request-node";

export type { ToolNodeData } from "./tool-node";
export { createToolNodeData, ToolNode } from "./tool-node";

export const integrationNodeTypes = {
  connector: ConnectorNode,
  connector_action: ConnectorActionNode,
  http_request: HttpRequestNode,
  database_query: DatabaseQueryNode,
  graphql_query: GraphqlQueryNode,
  tool: ToolNode,
} as const;
