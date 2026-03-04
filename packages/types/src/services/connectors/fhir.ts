import { z } from "zod";

export const FhirSyncCursorSchema = z.object({
  lastSyncTimestamp: z.number(),
  lastTransactionTime: z.string().optional(),
  bulkExportJobId: z.string().optional(),
  subscriptionIds: z.array(z.string()),
  resourceTypeProgress: z.record(z.string(), z.string()),
});

export type FhirSyncCursor = z.infer<typeof FhirSyncCursorSchema>;

export const FhirTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  fhirBaseUrl: z.string(),
  fhirVersion: z.enum(["R4", "R5"]),
  deidentificationStrategy: z.enum([
    "safe_harbor",
    "expert_determination",
    "none",
  ]),
});

export type FhirTransformContext = z.infer<typeof FhirTransformContextSchema>;

export const FhirSyncOptionsSchema = z.object({
  resourceTypes: z.array(z.string()),
  useBulkExport: z.boolean().default(true),
  subscriptionEnabled: z.boolean().default(false),
  deidentify: z.boolean().default(true),
  consentAware: z.boolean().default(true),
});

export type FhirSyncOptions = z.infer<typeof FhirSyncOptionsSchema>;

export const FHIR_RESOURCE_TYPES = [
  "Patient",
  "Practitioner",
  "Organization",
  "Observation",
  "Device",
  "DeviceMetric",
  "MedicationRequest",
  "DiagnosticReport",
  "Encounter",
  "Condition",
  "Procedure",
  "DocumentReference",
] as const;

export type FhirResourceType = (typeof FHIR_RESOURCE_TYPES)[number];

export const HIPAA_SAFE_HARBOR_IDENTIFIERS = [
  "names",
  "geographic_data",
  "dates",
  "phone_numbers",
  "fax_numbers",
  "email_addresses",
  "ssn",
  "medical_record_numbers",
  "health_plan_numbers",
  "account_numbers",
  "certificate_numbers",
  "vehicle_identifiers",
  "device_identifiers",
  "web_urls",
  "ip_addresses",
  "biometric_identifiers",
  "photographs",
  "other_unique_identifiers",
] as const;

export type HipaaSafeHarborIdentifier =
  (typeof HIPAA_SAFE_HARBOR_IDENTIFIERS)[number];

export const DeidentificationResultSchema = z.object({
  deidentified: z.record(z.string(), z.unknown()),
  removedFields: z.array(z.string()),
  confidence: z.number(),
});

export type DeidentificationResult = z.infer<
  typeof DeidentificationResultSchema
>;

export interface FhirBulkExportOutput {
  type: string;
  url: string;
  count?: number;
}

export interface FhirBulkExportCompletion {
  transactionTime: string;
  output: FhirBulkExportOutput[];
}

export interface FhirConsentDirective {
  patientId: string;
  scope: string;
  status: string;
  allowedActors: string[];
  deniedPurposes: string[];
}

export type FhirSyncOptionsInput = z.input<typeof FhirSyncOptionsSchema>;

export interface FhirFullSyncOptions extends Partial<FhirSyncOptionsInput> {
  batchSize?: number;
  onStageChange?: (
    stage: string,
    processed: number,
    current?: string
  ) => Promise<void>;
}

export interface FhirSyncBatch<T> {
  items: T[];
  cursor: FhirSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}

export interface FhirClientConfig {
  connectorId: string;
  fhirBaseUrl: string;
  accessToken: string;
  fhirVersion?: "R4" | "R5";
  timeout?: number;
}

export interface FhirResource {
  resourceType: string;
  id: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    source?: string;
    profile?: string[];
  };
  [key: string]: unknown;
}

export interface FhirPatient extends FhirResource {
  resourceType: "Patient";
  name?: { family?: string; given?: string[]; text?: string; use?: string }[];
  gender?: string;
  birthDate?: string;
  address?: {
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }[];
  telecom?: { system?: string; value?: string; use?: string }[];
  identifier?: { system?: string; value?: string; type?: { text?: string } }[];
  active?: boolean;
  deceasedBoolean?: boolean;
  maritalStatus?: { coding?: { code?: string; display?: string }[] };
}

export interface FhirObservation extends FhirResource {
  resourceType: "Observation";
  status: string;
  code: {
    coding?: { system?: string; code?: string; display?: string }[];
    text?: string;
  };
  subject?: { reference?: string; display?: string };
  effectiveDateTime?: string;
  effectivePeriod?: { start?: string; end?: string };
  valueQuantity?: { value?: number; unit?: string; system?: string };
  valueString?: string;
  valueCodeableConcept?: { coding?: { display?: string }[]; text?: string };
  component?: {
    code: {
      coding?: { display?: string }[];
      text?: string;
    };
    valueQuantity?: { value?: number; unit?: string };
  }[];
  category?: { coding?: { display?: string }[]; text?: string }[];
  interpretation?: { coding?: { display?: string }[]; text?: string }[];
}

export interface FhirDevice extends FhirResource {
  resourceType: "Device";
  status?: string;
  type?: {
    coding?: { system?: string; code?: string; display?: string }[];
    text?: string;
  };
  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;
  deviceName?: { name?: string; type?: string }[];
  location?: { reference?: string; display?: string };
  patient?: { reference?: string; display?: string };
  owner?: { reference?: string; display?: string };
}

export interface FhirEncounter extends FhirResource {
  resourceType: "Encounter";
  status: string;
  class?: { code?: string; display?: string };
  type?: { coding?: { display?: string }[]; text?: string }[];
  subject?: { reference?: string; display?: string };
  period?: { start?: string; end?: string };
  participant?: {
    individual?: { reference?: string; display?: string };
    type?: { coding?: { display?: string }[] }[];
  }[];
  serviceProvider?: { reference?: string; display?: string };
  reasonCode?: { coding?: { display?: string }[]; text?: string }[];
}

export interface FhirCondition extends FhirResource {
  resourceType: "Condition";
  clinicalStatus?: { coding?: { code?: string; display?: string }[] };
  verificationStatus?: { coding?: { code?: string; display?: string }[] };
  code?: {
    coding?: { system?: string; code?: string; display?: string }[];
    text?: string;
  };
  subject?: { reference?: string; display?: string };
  onsetDateTime?: string;
  abatementDateTime?: string;
  category?: { coding?: { display?: string }[]; text?: string }[];
  severity?: { coding?: { display?: string }[]; text?: string };
}

export interface FhirMedicationRequest extends FhirResource {
  resourceType: "MedicationRequest";
  status: string;
  intent: string;
  medicationCodeableConcept?: {
    coding?: { system?: string; code?: string; display?: string }[];
    text?: string;
  };
  subject?: { reference?: string; display?: string };
  requester?: { reference?: string; display?: string };
  dosageInstruction?: {
    text?: string;
    timing?: {
      repeat?: { frequency?: number; period?: number; periodUnit?: string };
    };
    doseAndRate?: { doseQuantity?: { value?: number; unit?: string } }[];
  }[];
  authoredOn?: string;
}

export interface FhirDiagnosticReport extends FhirResource {
  resourceType: "DiagnosticReport";
  status: string;
  code: {
    coding?: { system?: string; code?: string; display?: string }[];
    text?: string;
  };
  subject?: { reference?: string; display?: string };
  effectiveDateTime?: string;
  issued?: string;
  conclusion?: string;
  result?: { reference?: string; display?: string }[];
  category?: { coding?: { display?: string }[]; text?: string }[];
  performer?: { reference?: string; display?: string }[];
}

export interface FhirDocumentReference extends FhirResource {
  resourceType: "DocumentReference";
  status: string;
  type?: {
    coding?: { system?: string; code?: string; display?: string }[];
    text?: string;
  };
  category?: { coding?: { display?: string }[]; text?: string }[];
  subject?: { reference?: string; display?: string };
  date?: string;
  author?: { reference?: string; display?: string }[];
  description?: string;
  content?: {
    attachment?: { url?: string; contentType?: string; title?: string };
  }[];
}

export interface FhirDeviceMetric extends FhirResource {
  resourceType: "DeviceMetric";
  type: {
    coding?: { system?: string; code?: string; display?: string }[];
    text?: string;
  };
  unit?: {
    coding?: { display?: string }[];
    text?: string;
  };
  source?: { reference?: string; display?: string };
  category?: string;
  operationalStatus?: string;
  calibration?: {
    type?: string;
    state?: string;
    time?: string;
  }[];
}

export interface FhirProcedure extends FhirResource {
  resourceType: "Procedure";
  status: string;
  code?: {
    coding?: { system?: string; code?: string; display?: string }[];
    text?: string;
  };
  subject?: { reference?: string; display?: string };
  performedDateTime?: string;
  performedPeriod?: { start?: string; end?: string };
  performer?: { actor?: { reference?: string; display?: string } }[];
  bodySite?: { coding?: { display?: string }[]; text?: string }[];
  outcome?: { coding?: { display?: string }[]; text?: string };
  reasonCode?: { coding?: { display?: string }[]; text?: string }[];
}
