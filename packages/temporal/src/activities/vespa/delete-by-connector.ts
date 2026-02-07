import type { VespaClient } from "@openplane/vespa";
import type { DeleteByConnectorInput } from "./types";

export function createDeleteByConnectorActivity(vespa: VespaClient) {
  return async function deleteByConnector(
    input: DeleteByConnectorInput
  ): Promise<void> {
    await vespa.deleteByConnectorId(input.connectorId, "openplane_document");
    await vespa.deleteByConnectorId(input.connectorId, "entity");
  };
}
