import type {
  ViamComponent,
  ViamFullSyncOptions,
  ViamLocation,
  ViamMachine,
  ViamSyncBatch,
  ViamSyncCursor,
  ViamTransformContext,
} from "@openplane/types/services/connectors/viam";
import type { GenericDocument } from "@openplane/vespa";
import { logger } from "../../lib/logger";
import type { ViamClient } from "../client";
import { transformComponent } from "../transformers/component";
import { transformLocation } from "../transformers/location";
import { transformMachine } from "../transformers/machine";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

interface LocationsResponse {
  locations: ViamLocation[];
}

interface MachinesResponse {
  robots: ViamMachine[];
}

interface PartsResponse {
  parts: { robot: string; config: { components: ViamComponent[] } }[];
}

export async function* fullSync(
  client: ViamClient,
  context: ViamTransformContext,
  options: ViamFullSyncOptions = {}
): AsyncGenerator<ViamSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    locationIds,
    onStageChange,
  } = options;

  logger.info(
    { connectorId: client.connectorId, locationIds },
    "Viam full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: ViamSyncCursor = {
    lastSyncTimestamp: Date.now(),
    lastMachineSync: {},
  };

  await onStageChange?.("Fetching locations", 0);
  const locationsResp = await client.get<LocationsResponse>(
    `/organizations/${context.organizationId}/locations`
  );

  const locations = locationIds
    ? locationsResp.locations.filter((l) => locationIds.includes(l.id))
    : locationsResp.locations;

  for (const location of locations) {
    try {
      await onStageChange?.(
        "Processing location",
        state.processed,
        location.name
      );

      state.documents.push(await transformLocation(location, context));
      state.processed += 1;

      const machinesResp = await client.get<MachinesResponse>(
        `/locations/${location.id}/robots`
      );

      for (const machine of machinesResp.robots) {
        try {
          await onStageChange?.(
            "Processing machine",
            state.processed,
            machine.name
          );

          let components: ViamComponent[] = [];
          try {
            const partsResp = await client.get<PartsResponse>(
              `/robots/${machine.id}/parts`
            );
            components = partsResp.parts.flatMap(
              (p) => p.config?.components ?? []
            );
          } catch {
            logger.warn(
              { machineId: machine.id },
              "Failed to fetch machine parts"
            );
          }

          state.documents.push(
            await transformMachine(machine, context, {
              locationName: location.name,
              components,
            })
          );
          state.processed += 1;
          cursor.lastMachineSync[machine.id] = Date.now();

          for (const component of components) {
            state.documents.push(
              await transformComponent(component, context, {
                machineId: machine.id,
                machineName: machine.name,
              })
            );
            state.processed += 1;
          }

          if (state.documents.length >= batchSize) {
            yield createSyncBatch(state.documents, cursor, true, state);
            state.documents = [];
          }
        } catch (error) {
          logger.error(
            { error, machineId: machine.id },
            "Error processing Viam machine"
          );
          state.errors += 1;
        }
      }
    } catch (error) {
      logger.error(
        { error, locationId: location.id },
        "Error processing Viam location"
      );
      state.errors += 1;
    }
  }

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "Viam full sync complete"
  );

  if (state.documents.length > 0) {
    yield createSyncBatch(state.documents, cursor, false, state);
  }
}
