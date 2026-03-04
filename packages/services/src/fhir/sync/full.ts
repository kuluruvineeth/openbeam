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

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

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

export async function* fullSync(
  client: FhirClient,
  context: FhirTransformContext,
  options: FhirFullSyncOptions = {}
): AsyncGenerator<FhirSyncBatch<GenericDocument>, void, undefined> {
  const {
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

  logger.info(
    {
      connectorId: client.connectorId,
      resourceTypes,
    },
    "FHIR full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: FhirSyncCursor = {
    lastSyncTimestamp: Date.now(),
    subscriptionIds: [],
    resourceTypeProgress: {},
  };

  for (const resourceType of resourceTypes) {
    const transformer = RESOURCE_TRANSFORMERS[resourceType];
    if (!transformer) {
      logger.warn({ resourceType }, "No transformer for FHIR resource type");
      state.skipped += 1;
      continue;
    }

    try {
      await onStageChange?.(
        "Syncing resource type",
        state.processed,
        resourceType
      );

      for await (const resources of client.searchAll(resourceType)) {
        for (const resource of resources) {
          try {
            const doc = await transformer(resource, context);
            state.documents.push(doc);
            state.processed += 1;

            if (state.documents.length >= batchSize) {
              cursor.resourceTypeProgress[resourceType] = resource.id;
              yield createSyncBatch(state.documents, cursor, true, state);
              state.documents = [];
            }
          } catch (error) {
            logger.error(
              { error, resourceType, resourceId: resource.id },
              "Error transforming FHIR resource"
            );
            state.errors += 1;
          }
        }
      }

      cursor.resourceTypeProgress[resourceType] = "complete";
    } catch (error) {
      logger.error({ error, resourceType }, "Error fetching FHIR resources");
      state.errors += 1;
    }
  }

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "FHIR full sync complete"
  );

  if (state.documents.length > 0) {
    yield createSyncBatch(state.documents, cursor, false, state);
  }
}
