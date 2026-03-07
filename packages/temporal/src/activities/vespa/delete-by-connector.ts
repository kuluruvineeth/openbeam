import type { VespaClient } from "@openbeam/vespa";
import type { DeleteByConnectorInput } from "./types";

export function createDeleteByConnectorActivity(vespa: VespaClient) {
  return async function deleteByConnector(
    input: DeleteByConnectorInput
  ): Promise<void> {
    await vespa.deleteByConnectorId(input.connectorId, "openbeam_document");
    await vespa.deleteByConnectorId(input.connectorId, "entity");
  };
}
