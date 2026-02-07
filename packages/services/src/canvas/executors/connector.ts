import {
  type ConnectorActionNodeConfig,
  ConnectorNodeConfigSchema,
} from "@openplane/types/canvas";
import { resolveNodeConfig } from "../node-config";
import type { CanvasNodeExecutor } from "../types";
import { connectorActionExecutor } from "./connector-action";

export const connectorExecutor: CanvasNodeExecutor = async ({
  node,
  input,
  context,
}) => {
  const config = ConnectorNodeConfigSchema.parse(resolveNodeConfig(node.data));
  const connectorType = config.connectorType.trim();
  const actionId = config.operation.trim();
  const connectorId = config.connectorId?.trim();

  if (!connectorType) {
    throw new Error("Connector type is required");
  }
  if (!actionId) {
    throw new Error("Operation is required");
  }
  if (!connectorId) {
    throw new Error("Connector ID is required");
  }

  const actionConfig: ConnectorActionNodeConfig = {
    connectorType,
    connectorId,
    actionId,
    inputMappings: config.params ?? {},
    continueOnError: false,
  };

  const mappedNode = {
    ...node,
    data: { config: actionConfig },
  };

  return await connectorActionExecutor({ node: mappedNode, input, context });
};
