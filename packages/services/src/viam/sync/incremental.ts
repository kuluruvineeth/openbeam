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

export interface IncrementalSyncOptions extends ViamFullSyncOptions {
  previousCursor: ViamSyncCursor;
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

export async function* incrementalSync(
  client: ViamClient,
  context: ViamTransformContext,
  options: IncrementalSyncOptions
): AsyncGenerator<ViamSyncBatch<GenericDocument>, void, undefined> {
  const {
    previousCursor,
    batchSize = DEFAULT_BATCH_SIZE,
    locationIds,
    onStageChange,
  } = options;

  logger.info(
    {
      connectorId: client.connectorId,
      lastSync: new Date(previousCursor.lastSyncTimestamp).toISOString(),
    },
    "Viam incremental sync started"
  );

  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;

  const cursor: ViamSyncCursor = {
    lastSyncTimestamp: Date.now(),
    lastMachineSync: { ...previousCursor.lastMachineSync },
  };

  await onStageChange?.("Checking for changes", 0);

  const locationsResp = await client.get<LocationsResponse>(
    `/organizations/${context.organizationId}/locations`
  );

  const locations = locationIds
    ? locationsResp.locations.filter((l) => locationIds.includes(l.id))
    : locationsResp.locations;

  for (const location of locations) {
    try {
      const machinesResp = await client.get<MachinesResponse>(
        `/locations/${location.id}/robots`
      );

      for (const machine of machinesResp.robots) {
        const lastSync = previousCursor.lastMachineSync[machine.id];
        const lastAccess = new Date(machine.lastAccess).getTime();

        if (lastSync && lastAccess <= lastSync) {
          continue;
        }

        try {
          await onStageChange?.(
            "Processing updated machine",
            processed,
            machine.name
          );

          if (!lastSync) {
            documents.push(await transformLocation(location, context));
            processed += 1;
          }

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

          documents.push(
            await transformMachine(machine, context, {
              locationName: location.name,
              components,
            })
          );
          processed += 1;
          cursor.lastMachineSync[machine.id] = Date.now();

          for (const component of components) {
            documents.push(
              await transformComponent(component, context, {
                machineId: machine.id,
                machineName: machine.name,
              })
            );
            processed += 1;
          }

          if (documents.length >= batchSize) {
            yield createSyncBatch(documents, cursor, true, {
              processed,
              skipped: 0,
              errors,
            });
            documents = [];
          }
        } catch (error) {
          logger.error(
            { error, machineId: machine.id },
            "Error processing updated Viam machine"
          );
          errors += 1;
        }
      }
    } catch (error) {
      logger.error(
        { error, locationId: location.id },
        "Error processing Viam location"
      );
      errors += 1;
    }
  }

  logger.info({ processed, errors }, "Viam incremental sync complete");

  if (documents.length > 0) {
    yield createSyncBatch(documents, cursor, false, {
      processed,
      skipped: 0,
      errors,
    });
  }
}
