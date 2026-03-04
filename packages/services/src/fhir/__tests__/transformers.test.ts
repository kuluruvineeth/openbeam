import { describe, expect, it } from "bun:test";
import type {
  FhirCondition,
  FhirDevice,
  FhirDeviceMetric,
  FhirDiagnosticReport,
  FhirDocumentReference,
  FhirEncounter,
  FhirMedicationRequest,
  FhirObservation,
  FhirPatient,
  FhirProcedure,
  FhirTransformContext,
} from "@openplane/types/services/connectors/fhir";
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

const baseContext: FhirTransformContext = {
  connectorId: "conn_fhir_1",
  connectorType: "FHIR",
  teamId: "team_1",
  workspaceId: "ws_1",
  fhirBaseUrl: "https://fhir.example.com/r4",
  fhirVersion: "R4",
  deidentificationStrategy: "safe_harbor",
};

function createPatient(overrides?: Partial<FhirPatient>): FhirPatient {
  return {
    resourceType: "Patient",
    id: "patient-1",
    meta: { lastUpdated: "2024-01-15T10:00:00Z" },
    gender: "male",
    active: true,
    name: [{ family: "Smith", given: ["John"] }],
    ...overrides,
  };
}

function createObservation(
  overrides?: Partial<FhirObservation>
): FhirObservation {
  return {
    resourceType: "Observation",
    id: "obs-1",
    meta: { lastUpdated: "2024-01-15T10:00:00Z" },
    status: "final",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "8867-4",
          display: "Heart Rate",
        },
      ],
      text: "Heart Rate",
    },
    valueQuantity: { value: 72, unit: "bpm" },
    effectiveDateTime: "2024-01-15T09:30:00Z",
    subject: { reference: "Patient/patient-1", display: "John Smith" },
    category: [{ coding: [{ display: "vital-signs" }] }],
    ...overrides,
  };
}

function createDevice(overrides?: Partial<FhirDevice>): FhirDevice {
  return {
    resourceType: "Device",
    id: "dev-1",
    meta: { lastUpdated: "2024-01-15T10:00:00Z" },
    status: "active",
    type: {
      coding: [{ code: "pulse-ox", display: "Pulse Oximeter" }],
      text: "Pulse Oximeter",
    },
    manufacturer: "Masimo",
    modelNumber: "Radical-7",
    deviceName: [{ name: "ICU Pulse Ox #3", type: "user-friendly-name" }],
    location: { reference: "Location/loc-1", display: "ICU Room 301" },
    ...overrides,
  };
}

function createEncounter(overrides?: Partial<FhirEncounter>): FhirEncounter {
  return {
    resourceType: "Encounter",
    id: "enc-1",
    meta: { lastUpdated: "2024-01-15T10:00:00Z" },
    status: "finished",
    class: { code: "IMP", display: "Inpatient" },
    type: [{ coding: [{ display: "Consultation" }], text: "Consultation" }],
    period: { start: "2024-01-15T08:00:00Z", end: "2024-01-15T09:00:00Z" },
    participant: [
      { individual: { reference: "Practitioner/pr-1", display: "Dr. Jones" } },
    ],
    serviceProvider: {
      reference: "Organization/org-1",
      display: "City Hospital",
    },
    ...overrides,
  };
}

function createCondition(overrides?: Partial<FhirCondition>): FhirCondition {
  return {
    resourceType: "Condition",
    id: "cond-1",
    meta: { lastUpdated: "2024-01-15T10:00:00Z" },
    clinicalStatus: { coding: [{ code: "active", display: "Active" }] },
    verificationStatus: {
      coding: [{ code: "confirmed", display: "Confirmed" }],
    },
    code: {
      coding: [
        {
          system: "http://snomed.info/sct",
          code: "44054006",
          display: "Type 2 Diabetes",
        },
      ],
      text: "Type 2 Diabetes",
    },
    onsetDateTime: "2020-06-01",
    severity: { coding: [{ display: "Moderate" }] },
    ...overrides,
  };
}

function createMedicationRequest(
  overrides?: Partial<FhirMedicationRequest>
): FhirMedicationRequest {
  return {
    resourceType: "MedicationRequest",
    id: "med-1",
    meta: { lastUpdated: "2024-01-15T10:00:00Z" },
    status: "active",
    intent: "order",
    medicationCodeableConcept: {
      coding: [{ code: "317896006", display: "Metformin 500mg" }],
      text: "Metformin 500mg",
    },
    dosageInstruction: [
      {
        text: "Take 1 tablet twice daily",
        doseAndRate: [{ doseQuantity: { value: 500, unit: "mg" } }],
        timing: { repeat: { frequency: 2, period: 1, periodUnit: "d" } },
      },
    ],
    authoredOn: "2024-01-10",
    ...overrides,
  };
}

function createDiagnosticReport(
  overrides?: Partial<FhirDiagnosticReport>
): FhirDiagnosticReport {
  return {
    resourceType: "DiagnosticReport",
    id: "report-1",
    meta: { lastUpdated: "2024-01-15T10:00:00Z" },
    status: "final",
    code: {
      coding: [{ code: "CBC", display: "Complete Blood Count" }],
      text: "Complete Blood Count",
    },
    effectiveDateTime: "2024-01-15",
    issued: "2024-01-15T12:00:00Z",
    conclusion: "Normal CBC results",
    result: [
      { reference: "Observation/obs-1", display: "Hemoglobin" },
      { reference: "Observation/obs-2", display: "WBC" },
    ],
    category: [{ coding: [{ display: "Laboratory" }] }],
    ...overrides,
  };
}

function createDocumentReference(
  overrides?: Partial<FhirDocumentReference>
): FhirDocumentReference {
  return {
    resourceType: "DocumentReference",
    id: "docref-1",
    meta: { lastUpdated: "2024-01-15T10:00:00Z" },
    status: "current",
    type: {
      coding: [{ code: "11506-3", display: "Progress Note" }],
      text: "Progress Note",
    },
    category: [{ coding: [{ display: "Clinical Note" }] }],
    date: "2024-01-15",
    description: "Patient progress note - ICU Day 3",
    content: [
      {
        attachment: {
          contentType: "text/plain",
          title: "Progress Note",
          url: "https://fhir.example.com/Binary/doc-1",
        },
      },
    ],
    ...overrides,
  };
}

function createDeviceMetric(
  overrides?: Partial<FhirDeviceMetric>
): FhirDeviceMetric {
  return {
    resourceType: "DeviceMetric",
    id: "metric-1",
    meta: { lastUpdated: "2024-01-15T10:00:00Z" },
    type: {
      coding: [{ code: "150456", display: "SpO2" }],
      text: "SpO2",
    },
    unit: { coding: [{ display: "%" }], text: "%" },
    category: "measurement",
    operationalStatus: "on",
    source: { reference: "Device/dev-1", display: "Pulse Ox #3" },
    calibration: [
      { type: "two-point", state: "calibrated", time: "2024-01-10" },
    ],
    ...overrides,
  };
}

function createProcedure(overrides?: Partial<FhirProcedure>): FhirProcedure {
  return {
    resourceType: "Procedure",
    id: "proc-1",
    meta: { lastUpdated: "2024-01-15T10:00:00Z" },
    status: "completed",
    code: {
      coding: [
        {
          system: "http://snomed.info/sct",
          code: "80146002",
          display: "Appendectomy",
        },
      ],
      text: "Appendectomy",
    },
    performedDateTime: "2024-01-14T14:00:00Z",
    bodySite: [{ coding: [{ display: "Abdomen" }], text: "Abdomen" }],
    outcome: { coding: [{ display: "Successful" }], text: "Successful" },
    performer: [{ actor: { reference: "Practitioner/pr-1" } }],
    ...overrides,
  };
}

describe("FHIR transformers", () => {
  describe("transformPatient", () => {
    it("transforms Patient to healthcare_patient", async () => {
      const doc = await transformPatient(createPatient(), baseContext);

      expect(doc.id).toBe("conn_fhir_1_patient_patient-1");
      expect(doc.connector_id).toBe("conn_fhir_1");
      expect(doc.connector_type).toBe("FHIR");
      expect(doc.team_id).toBe("team_1");
      expect(doc.external_id).toBe("patient-1");
      expect(doc.document_type).toBe("healthcare_patient");
      expect(doc.title).toBe("Patient patient-1");
      expect(doc.source_type).toBe("fhir");
      expect(doc.is_public).toBe(false);
    });

    it("de-identifies patient by default", async () => {
      const doc = await transformPatient(createPatient(), baseContext);
      expect(doc.content).not.toContain("Smith");
      expect(doc.content).not.toContain("John");
    });

    it("includes gender in content", async () => {
      const doc = await transformPatient(createPatient(), baseContext);
      expect(doc.content).toContain("Gender: male");
    });

    it("includes access_control with team", async () => {
      const doc = await transformPatient(createPatient(), baseContext);
      expect(doc.access_control).toEqual(["team:team_1"]);
    });

    it("sets URL to FHIR server endpoint", async () => {
      const doc = await transformPatient(createPatient(), baseContext);
      expect(doc.url).toBe("https://fhir.example.com/r4/Patient/patient-1");
    });

    it("generates deterministic checksums", async () => {
      const patient = createPatient();
      const doc1 = await transformPatient(patient, baseContext);
      const doc2 = await transformPatient(patient, baseContext);
      expect(doc1.checksum).toBe(doc2.checksum);
    });

    it("includes metadata", async () => {
      const doc = await transformPatient(createPatient(), baseContext);
      expect(doc.metadata?.resourceType).toBe("Patient");
      expect(doc.metadata?.fhirId).toBe("patient-1");
    });

    it("skips de-identification when strategy is none", async () => {
      const ctx = { ...baseContext, deidentificationStrategy: "none" as const };
      const doc = await transformPatient(createPatient(), ctx, {
        deidentify: false,
      });
      expect(doc.metadata?.resourceType).toBe("Patient");
    });
  });

  describe("transformObservation", () => {
    it("transforms Observation to healthcare_observation", async () => {
      const doc = await transformObservation(createObservation(), baseContext);

      expect(doc.id).toBe("conn_fhir_1_observation_obs-1");
      expect(doc.document_type).toBe("healthcare_observation");
      expect(doc.title).toBe("Observation: Heart Rate");
    });

    it("includes value in content", async () => {
      const doc = await transformObservation(createObservation(), baseContext);
      expect(doc.content).toContain("Value: 72 bpm");
    });

    it("includes status in content", async () => {
      const doc = await transformObservation(createObservation(), baseContext);
      expect(doc.content).toContain("Status: final");
    });

    it("includes code metadata", async () => {
      const doc = await transformObservation(createObservation(), baseContext);
      expect(doc.metadata?.code).toBe("8867-4");
      expect(doc.metadata?.codeSystem).toBe("http://loinc.org");
      expect(doc.metadata?.codeDisplay).toBe("Heart Rate");
    });

    it("includes value quantity metadata", async () => {
      const doc = await transformObservation(createObservation(), baseContext);
      expect(doc.metadata?.valueNumber).toBe(72);
      expect(doc.metadata?.valueUnit).toBe("bpm");
    });

    it("handles valueString", async () => {
      const obs = createObservation({
        valueQuantity: undefined,
        valueString: "Positive",
      });
      const doc = await transformObservation(obs, baseContext);
      expect(doc.content).toContain("Value: Positive");
    });

    it("handles component observations", async () => {
      const obs = createObservation({
        component: [
          {
            code: { text: "Systolic" },
            valueQuantity: { value: 120, unit: "mmHg" },
          },
          {
            code: { text: "Diastolic" },
            valueQuantity: { value: 80, unit: "mmHg" },
          },
        ],
      });
      const doc = await transformObservation(obs, baseContext);
      expect(doc.content).toContain("Systolic: 120 mmHg");
      expect(doc.content).toContain("Diastolic: 80 mmHg");
    });

    it("sets document_subtype from category", async () => {
      const doc = await transformObservation(createObservation(), baseContext);
      expect(doc.document_subtype).toBe("vital-signs");
    });

    it("generates deterministic checksums", async () => {
      const obs = createObservation();
      const doc1 = await transformObservation(obs, baseContext);
      const doc2 = await transformObservation(obs, baseContext);
      expect(doc1.checksum).toBe(doc2.checksum);
    });
  });

  describe("transformDevice", () => {
    it("transforms Device to healthcare_device", async () => {
      const doc = await transformDevice(createDevice(), baseContext);

      expect(doc.id).toBe("conn_fhir_1_device_dev-1");
      expect(doc.document_type).toBe("healthcare_device");
      expect(doc.title).toBe("ICU Pulse Ox #3");
    });

    it("includes manufacturer and model in content", async () => {
      const doc = await transformDevice(createDevice(), baseContext);
      expect(doc.content).toContain("Manufacturer: Masimo");
      expect(doc.content).toContain("Model: Radical-7");
    });

    it("includes device metadata", async () => {
      const doc = await transformDevice(createDevice(), baseContext);
      expect(doc.metadata?.manufacturer).toBe("Masimo");
      expect(doc.metadata?.modelNumber).toBe("Radical-7");
      expect(doc.metadata?.status).toBe("active");
    });

    it("falls back to type display for title", async () => {
      const device = createDevice({ deviceName: undefined });
      const doc = await transformDevice(device, baseContext);
      expect(doc.title).toBe("Pulse Oximeter");
    });

    it("falls back to Device ID for title", async () => {
      const device = createDevice({
        deviceName: undefined,
        type: undefined,
      });
      const doc = await transformDevice(device, baseContext);
      expect(doc.title).toBe("Device dev-1");
    });

    it("generates deterministic checksums", async () => {
      const device = createDevice();
      const doc1 = await transformDevice(device, baseContext);
      const doc2 = await transformDevice(device, baseContext);
      expect(doc1.checksum).toBe(doc2.checksum);
    });
  });

  describe("transformEncounter", () => {
    it("transforms Encounter to healthcare_encounter", async () => {
      const doc = await transformEncounter(createEncounter(), baseContext);

      expect(doc.id).toBe("conn_fhir_1_encounter_enc-1");
      expect(doc.document_type).toBe("healthcare_encounter");
      expect(doc.title).toContain("Consultation");
      expect(doc.title).toContain("finished");
    });

    it("includes class and provider in content", async () => {
      const doc = await transformEncounter(createEncounter(), baseContext);
      expect(doc.content).toContain("Class: Inpatient");
      expect(doc.content).toContain("Provider: City Hospital");
    });

    it("includes participant count in content", async () => {
      const doc = await transformEncounter(createEncounter(), baseContext);
      expect(doc.content).toContain("Participants: 1");
    });

    it("includes encounter metadata", async () => {
      const doc = await transformEncounter(createEncounter(), baseContext);
      expect(doc.metadata?.encounterClass).toBe("IMP");
      expect(doc.metadata?.status).toBe("finished");
      expect(doc.metadata?.participantCount).toBe(1);
    });

    it("generates deterministic checksums", async () => {
      const enc = createEncounter();
      const doc1 = await transformEncounter(enc, baseContext);
      const doc2 = await transformEncounter(enc, baseContext);
      expect(doc1.checksum).toBe(doc2.checksum);
    });
  });

  describe("transformCondition", () => {
    it("transforms Condition to healthcare_condition", async () => {
      const doc = await transformCondition(createCondition(), baseContext);

      expect(doc.id).toBe("conn_fhir_1_condition_cond-1");
      expect(doc.document_type).toBe("healthcare_condition");
      expect(doc.title).toBe("Type 2 Diabetes");
    });

    it("includes clinical status in content", async () => {
      const doc = await transformCondition(createCondition(), baseContext);
      expect(doc.content).toContain("Clinical Status: Active");
    });

    it("includes severity in content", async () => {
      const doc = await transformCondition(createCondition(), baseContext);
      expect(doc.content).toContain("Severity: Moderate");
    });

    it("includes condition metadata", async () => {
      const doc = await transformCondition(createCondition(), baseContext);
      expect(doc.metadata?.clinicalStatus).toBe("active");
      expect(doc.metadata?.verificationStatus).toBe("confirmed");
      expect(doc.metadata?.code).toBe("44054006");
    });

    it("generates deterministic checksums", async () => {
      const cond = createCondition();
      const doc1 = await transformCondition(cond, baseContext);
      const doc2 = await transformCondition(cond, baseContext);
      expect(doc1.checksum).toBe(doc2.checksum);
    });
  });

  describe("transformMedication", () => {
    it("transforms MedicationRequest to healthcare_medication", async () => {
      const doc = await transformMedication(
        createMedicationRequest(),
        baseContext
      );

      expect(doc.id).toBe("conn_fhir_1_medication_med-1");
      expect(doc.document_type).toBe("healthcare_medication");
      expect(doc.title).toBe("Metformin 500mg");
    });

    it("includes dosage in content", async () => {
      const doc = await transformMedication(
        createMedicationRequest(),
        baseContext
      );
      expect(doc.content).toContain("Dosage: Take 1 tablet twice daily");
    });

    it("includes status and intent in content", async () => {
      const doc = await transformMedication(
        createMedicationRequest(),
        baseContext
      );
      expect(doc.content).toContain("Status: active");
      expect(doc.content).toContain("Intent: order");
    });

    it("includes medication metadata", async () => {
      const doc = await transformMedication(
        createMedicationRequest(),
        baseContext
      );
      expect(doc.metadata?.status).toBe("active");
      expect(doc.metadata?.intent).toBe("order");
      expect(doc.metadata?.medicationDisplay).toBe("Metformin 500mg");
    });

    it("generates deterministic checksums", async () => {
      const med = createMedicationRequest();
      const doc1 = await transformMedication(med, baseContext);
      const doc2 = await transformMedication(med, baseContext);
      expect(doc1.checksum).toBe(doc2.checksum);
    });
  });

  describe("transformDiagnosticReport", () => {
    it("transforms DiagnosticReport to healthcare_report", async () => {
      const doc = await transformDiagnosticReport(
        createDiagnosticReport(),
        baseContext
      );

      expect(doc.id).toBe("conn_fhir_1_report_report-1");
      expect(doc.document_type).toBe("healthcare_report");
      expect(doc.title).toBe("Complete Blood Count");
    });

    it("includes conclusion in content", async () => {
      const doc = await transformDiagnosticReport(
        createDiagnosticReport(),
        baseContext
      );
      expect(doc.content).toContain("Conclusion: Normal CBC results");
    });

    it("includes result count in content", async () => {
      const doc = await transformDiagnosticReport(
        createDiagnosticReport(),
        baseContext
      );
      expect(doc.content).toContain("Results: 2");
    });

    it("includes report metadata", async () => {
      const doc = await transformDiagnosticReport(
        createDiagnosticReport(),
        baseContext
      );
      expect(doc.metadata?.code).toBe("CBC");
      expect(doc.metadata?.hasConclusion).toBe(true);
      expect(doc.metadata?.resultCount).toBe(2);
    });

    it("generates deterministic checksums", async () => {
      const report = createDiagnosticReport();
      const doc1 = await transformDiagnosticReport(report, baseContext);
      const doc2 = await transformDiagnosticReport(report, baseContext);
      expect(doc1.checksum).toBe(doc2.checksum);
    });
  });

  describe("transformDocumentReference", () => {
    it("transforms DocumentReference to healthcare_document", async () => {
      const doc = await transformDocumentReference(
        createDocumentReference(),
        baseContext
      );

      expect(doc.id).toBe("conn_fhir_1_document_docref-1");
      expect(doc.document_type).toBe("healthcare_document");
      expect(doc.title).toBe("Patient progress note - ICU Day 3");
    });

    it("includes content type in content", async () => {
      const doc = await transformDocumentReference(
        createDocumentReference(),
        baseContext
      );
      expect(doc.content).toContain("Content-Type: text/plain");
    });

    it("includes document metadata", async () => {
      const doc = await transformDocumentReference(
        createDocumentReference(),
        baseContext
      );
      expect(doc.metadata?.documentType).toBe("11506-3");
      expect(doc.metadata?.contentType).toBe("text/plain");
      expect(doc.metadata?.attachmentCount).toBe(1);
    });

    it("falls back to type display for title", async () => {
      const docRef = createDocumentReference({ description: undefined });
      const doc = await transformDocumentReference(docRef, baseContext);
      expect(doc.title).toBe("Progress Note");
    });

    it("generates deterministic checksums", async () => {
      const docRef = createDocumentReference();
      const doc1 = await transformDocumentReference(docRef, baseContext);
      const doc2 = await transformDocumentReference(docRef, baseContext);
      expect(doc1.checksum).toBe(doc2.checksum);
    });
  });

  describe("transformDeviceMetric", () => {
    it("transforms DeviceMetric to healthcare_device_metric", async () => {
      const doc = await transformDeviceMetric(
        createDeviceMetric(),
        baseContext
      );

      expect(doc.id).toBe("conn_fhir_1_device_metric_metric-1");
      expect(doc.document_type).toBe("healthcare_device_metric");
      expect(doc.title).toBe("SpO2");
    });

    it("includes unit and category in content", async () => {
      const doc = await transformDeviceMetric(
        createDeviceMetric(),
        baseContext
      );
      expect(doc.content).toContain("Unit: %");
      expect(doc.content).toContain("Category: measurement");
    });

    it("includes calibration in content", async () => {
      const doc = await transformDeviceMetric(
        createDeviceMetric(),
        baseContext
      );
      expect(doc.content).toContain("Calibration: two-point — calibrated");
    });

    it("includes metric metadata", async () => {
      const doc = await transformDeviceMetric(
        createDeviceMetric(),
        baseContext
      );
      expect(doc.metadata?.metricType).toBe("150456");
      expect(doc.metadata?.unit).toBe("%");
      expect(doc.metadata?.operationalStatus).toBe("on");
      expect(doc.metadata?.calibrationCount).toBe(1);
    });

    it("generates deterministic checksums", async () => {
      const metric = createDeviceMetric();
      const doc1 = await transformDeviceMetric(metric, baseContext);
      const doc2 = await transformDeviceMetric(metric, baseContext);
      expect(doc1.checksum).toBe(doc2.checksum);
    });
  });

  describe("transformProcedure", () => {
    it("transforms Procedure to healthcare_procedure", async () => {
      const doc = await transformProcedure(createProcedure(), baseContext);

      expect(doc.id).toBe("conn_fhir_1_procedure_proc-1");
      expect(doc.document_type).toBe("healthcare_procedure");
      expect(doc.title).toBe("Appendectomy");
    });

    it("includes body site and outcome in content", async () => {
      const doc = await transformProcedure(createProcedure(), baseContext);
      expect(doc.content).toContain("Body Site: Abdomen");
      expect(doc.content).toContain("Outcome: Successful");
    });

    it("includes performer count in content", async () => {
      const doc = await transformProcedure(createProcedure(), baseContext);
      expect(doc.content).toContain("Performers: 1");
    });

    it("includes procedure metadata", async () => {
      const doc = await transformProcedure(createProcedure(), baseContext);
      expect(doc.metadata?.code).toBe("80146002");
      expect(doc.metadata?.codeSystem).toBe("http://snomed.info/sct");
      expect(doc.metadata?.status).toBe("completed");
      expect(doc.metadata?.bodySiteCount).toBe(1);
      expect(doc.metadata?.hasOutcome).toBe(true);
    });

    it("generates deterministic checksums", async () => {
      const proc = createProcedure();
      const doc1 = await transformProcedure(proc, baseContext);
      const doc2 = await transformProcedure(proc, baseContext);
      expect(doc1.checksum).toBe(doc2.checksum);
    });
  });

  describe("all transformers", () => {
    it("all set is_public to false (HIPAA)", async () => {
      const results = await Promise.all([
        transformPatient(createPatient(), baseContext),
        transformObservation(createObservation(), baseContext),
        transformDevice(createDevice(), baseContext),
        transformEncounter(createEncounter(), baseContext),
        transformCondition(createCondition(), baseContext),
        transformMedication(createMedicationRequest(), baseContext),
        transformDiagnosticReport(createDiagnosticReport(), baseContext),
        transformDocumentReference(createDocumentReference(), baseContext),
        transformDeviceMetric(createDeviceMetric(), baseContext),
        transformProcedure(createProcedure(), baseContext),
      ]);

      for (const doc of results) {
        expect(doc.is_public).toBe(false);
      }
    });

    it("all include team access_control", async () => {
      const results = await Promise.all([
        transformPatient(createPatient(), baseContext),
        transformObservation(createObservation(), baseContext),
        transformDevice(createDevice(), baseContext),
      ]);

      for (const doc of results) {
        expect(doc.access_control).toContain("team:team_1");
      }
    });

    it("all set source_type to fhir", async () => {
      const results = await Promise.all([
        transformPatient(createPatient(), baseContext),
        transformObservation(createObservation(), baseContext),
        transformDevice(createDevice(), baseContext),
        transformEncounter(createEncounter(), baseContext),
        transformCondition(createCondition(), baseContext),
      ]);

      for (const doc of results) {
        expect(doc.source_type).toBe("fhir");
      }
    });
  });
});
