import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const fhirApp: UnifiedApp = {
  id: AppType.FHIR,
  name: "FHIR Healthcare",
  category: "Physical AI & Spatial",
  active: true,
  logo: AppType.FHIR,
  short_description:
    "Index de-identified healthcare data from FHIR R4/R5 servers with HIPAA compliance.",
  description:
    "Connect to any FHIR-compliant healthcare system (Epic, Cerner, HAPI FHIR, Medplum) to index de-identified clinical data. Supports SMART on FHIR authentication, Bulk Data Export for full sync, R5 Subscriptions for incremental updates, and mandatory PHI de-identification via Safe Harbor method.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "OpenBeam",
  website: "https://hl7.org/fhir/",

  searchDisplay: {
    defaultIconKey: "HeartPulseIcon",
    documentTypes: {
      healthcare_observation: {
        label: "vitals",
        iconKey: "ThermometerIcon",
        category: "healthcare_observation",
      },
      healthcare_device: {
        label: "device",
        iconKey: "CpuIcon",
        category: "healthcare_device",
      },
      healthcare_encounter: {
        label: "visit",
        iconKey: "CalendarIcon",
        category: "healthcare_encounter",
      },
      healthcare_report: {
        label: "report",
        iconKey: "FileTextIcon",
        category: "healthcare_report",
      },
    },
  },

  features: [
    "FHIR R4 and R5 specification support",
    "SMART on FHIR backend services authentication (JWT)",
    "Bulk Data Export ($export) for efficient full sync",
    "R5 topic-based Subscriptions for incremental updates",
    "Mandatory PHI de-identification (Safe Harbor method, 18 identifiers)",
    "Consent-aware search filtering (FHIR Consent resources)",
    "10 resource types: Patient, Observation, Device, Encounter, and more",
    "HIPAA-compliant data pipeline",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl: "https://docs.smarthealthit.org/",
    },
  },

  streams: [
    {
      name: "clinical",
      label: "Clinical Data",
      description:
        "De-identified observations, encounters, conditions, and procedures",
      entityType: "resource",
      dataPoints: ["Resource Type", "Code", "Value", "Date", "Status"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 3600,
      supportsBackfill: true,
    },
    {
      name: "devices",
      label: "Medical Devices",
      description: "Device status, metrics, and calibration data",
      entityType: "resource",
      dataPoints: ["Type", "Manufacturer", "Status", "Location"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 3600,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "fhir_base_url",
      label: "FHIR Server URL",
      description: "Base URL of the FHIR server",
      type: "text",
      required: true,
      value: "",
      placeholder: "https://fhir-server.example.com/fhir/r4",
    },
    {
      id: "fhir_version",
      label: "FHIR Version",
      description: "FHIR specification version",
      type: "select",
      required: true,
      value: "R4",
      options: [
        { label: "R4 (4.0.1)", value: "R4" },
        { label: "R5 (5.0.0)", value: "R5" },
      ],
    },
    {
      id: "client_id",
      label: "Client ID",
      description: "SMART on FHIR application client ID",
      type: "text",
      required: true,
      value: "",
    },
    {
      id: "private_key",
      label: "Private Key (PEM)",
      description: "RSA/EC private key for JWT assertion signing",
      type: "textarea",
      required: true,
      value: "",
      placeholder: "-----BEGIN PRIVATE KEY-----\n...",
    },
    {
      id: "deidentify",
      label: "PHI De-identification",
      description:
        "Enable Safe Harbor de-identification (required for HIPAA compliance)",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "resource_types",
      label: "Resource Types",
      description: "FHIR resource types to sync, one per line",
      type: "textarea",
      required: false,
      value: "Patient\nObservation\nDevice\nEncounter\nCondition",
      placeholder: "Patient\nObservation\nDevice",
    },
  ],
};
