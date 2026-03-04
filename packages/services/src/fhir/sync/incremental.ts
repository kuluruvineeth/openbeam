import type {
  FhirCondition,
  FhirDevice,
  FhirDeviceMetric,
  FhirDiagnosticReport,
  FhirDocumentReference,
  FhirEncounter,
  FhirFullSyncOptions,
  FhirMedicationRequest,
  FhirObservation,
  FhirPatient,
  FhirProcedure,
  FhirResource,
  FhirSyncBatch,
  FhirSyncCursor,
  FhirTransformContext,
} from "@openplane/types/services/connectors/fhir";
import type { GenericDocument } from "@openplane/vespa";
import { logger } from "../../lib/logger";
import type { FhirClient } from "../client";
import { transformCondition } from "../transformers/condition";
import { transformDevice } from "../transformers/device";
import { transformDeviceMetric } from "../transformers/device-metric";
import { transformDiagnosticReport } from "../transformers/diagnostic-report";
import { transformDocumentReference } from "../transformers/document-reference";
import { transformEncounter } from "../transformers/encounter";
import { transformMedication } from "../transformers/medication";
import { transformObservation } from "../transformers/observation";
import { transformPatient } from "../transformers/patient";
import { transformProcedure } from "../transformers/procedure";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

type TransformFn = (
  resource: FhirResource,
  context: FhirTransformContext
) => Promise<GenericDocument>;

const RESOURCE_TRANSFORMERS: Record<string, TransformFn> = {
  Patient: (r, ctx) => transformPatient(r as FhirPatient, ctx),
  Observation: (r, ctx) => transformObservation(r as FhirObservation, ctx),
  Device: (r, ctx) => transformDevice(r as FhirDevice, ctx),
  Encounter: (r, ctx) => transformEncounter(r as FhirEncounter, ctx),
  Condition: (r, ctx) => transformCondition(r as FhirCondition, ctx),
  MedicationRequest: (r, ctx) =>
    transformMedication(r as FhirMedicationRequest, ctx),
  DiagnosticReport: (r, ctx) =>
    transformDiagnosticReport(r as FhirDiagnosticReport, ctx),
  DocumentReference: (r, ctx) =>
    transformDocumentReference(r as FhirDocumentReference, ctx),
  DeviceMetric: (r, ctx) => transformDeviceMetric(r as FhirDeviceMetric, ctx),
  Procedure: (r, ctx) => transformProcedure(r as FhirProcedure, ctx),
};

export interface IncrementalSyncOptions extends FhirFullSyncOptions {
  previousCursor: FhirSyncCursor;
}

export async function* incrementalSync(
  client: FhirClient,
  context: FhirTransformContext,
  options: IncrementalSyncOptions
): AsyncGenerator<FhirSyncBatch<GenericDocument>, void, undefined> {
  const {
    previousCursor,
    resourceTypes = [
      "Patient",
      "Observation",
      "Device",
      "Encounter",
      "Condition",
    ],
    batchSize = DEFAULT_BATCH_SIZE,
    onStageChange,
  } = options;

  const lastSync = new Date(previousCursor.lastSyncTimestamp).toISOString();

  logger.info(
    {
      connectorId: client.connectorId,
      lastSync,
    },
    "FHIR incremental sync started"
  );

  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;

  const cursor: FhirSyncCursor = {
    lastSyncTimestamp: Date.now(),
    lastTransactionTime: previousCursor.lastTransactionTime,
    subscriptionIds: previousCursor.subscriptionIds,
    resourceTypeProgress: {},
  };

  for (const resourceType of resourceTypes) {
    const transformer = RESOURCE_TRANSFORMERS[resourceType];
    if (!transformer) {
      continue;
    }

    try {
      await onStageChange?.("Checking for updates", processed, resourceType);

      for await (const resources of client.searchAll(resourceType, {
        _lastUpdated: `ge${lastSync}`,
        _sort: "-_lastUpdated",
      })) {
        for (const resource of resources) {
          try {
            documents.push(await transformer(resource, context));
            processed += 1;

            if (documents.length >= batchSize) {
              cursor.resourceTypeProgress[resourceType] = resource.id;
              yield createSyncBatch(documents, cursor, true, {
                processed,
                skipped: 0,
                errors,
              });
              documents = [];
            }
          } catch (error) {
            logger.error(
              { error, resourceType, resourceId: resource.id },
              "Error processing updated FHIR resource"
            );
            errors += 1;
          }
        }
      }

      cursor.resourceTypeProgress[resourceType] = "complete";
    } catch (error) {
      logger.error(
        { error, resourceType },
        "Error fetching updated FHIR resources"
      );
      errors += 1;
    }
  }

  logger.info({ processed, errors }, "FHIR incremental sync complete");

  if (documents.length > 0) {
    yield createSyncBatch(documents, cursor, false, {
      processed,
      skipped: 0,
      errors,
    });
  }
}
