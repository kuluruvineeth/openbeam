import type {
  FhirResource,
  HipaaSafeHarborIdentifier,
} from "@openplane/types/services/connectors/fhir";

export interface DeidentificationResult {
  deidentified: Record<string, unknown>;
  removedFields: string[];
  confidence: number;
}

const PATIENT_PHI_FIELDS: Record<string, HipaaSafeHarborIdentifier> = {
  name: "names",
  address: "geographic_data",
  birthDate: "dates",
  telecom: "phone_numbers",
  identifier: "other_unique_identifiers",
  photo: "photographs",
};

const REDACTED = "[REDACTED]";

const DATE_FIELD_RE = /date|Date|period|Period|time|Time|authored|issued/;
const REFERENCE_FIELD_RE =
  /^(subject|patient|requester|performer|author|participant|individual|actor)$/;

function redactDates(value: string): string {
  if (!value) {
    return value;
  }
  if (value.length <= 4) {
    return value;
  }
  return value.slice(0, 4);
}

function redactReference(ref: { reference?: string; display?: string }): {
  reference?: string;
  display?: string;
} {
  return {
    ...(ref.reference && { reference: ref.reference }),
    display: ref.display ? REDACTED : undefined,
  };
}

function deidentifyPatient(
  resource: Record<string, unknown>
): DeidentificationResult {
  const removedFields: string[] = [];
  const deidentified = { ...resource };

  for (const [field, identifier] of Object.entries(PATIENT_PHI_FIELDS)) {
    if (field in deidentified) {
      delete deidentified[field];
      removedFields.push(`${field} (${identifier})`);
    }
  }

  if (typeof deidentified.birthDate === "string") {
    deidentified.birthDate = redactDates(deidentified.birthDate as string);
  }

  const age = calculateAge(resource.birthDate as string | undefined);
  if (age !== undefined) {
    deidentified._deidentifiedAge = age > 89 ? "90+" : String(age);
  }

  return {
    deidentified,
    removedFields,
    confidence: removedFields.length > 0 ? 0.95 : 1.0,
  };
}

function deidentifyGenericResource(
  resource: Record<string, unknown>
): DeidentificationResult {
  const removedFields: string[] = [];
  const deidentified: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(resource)) {
    if (key === "resourceType" || key === "id" || key === "meta") {
      deidentified[key] = value;
      continue;
    }

    if (DATE_FIELD_RE.test(key) && typeof value === "string") {
      deidentified[key] = redactDates(value);
      if (value !== redactDates(value)) {
        removedFields.push(`${key} (dates)`);
      }
      continue;
    }

    if (
      DATE_FIELD_RE.test(key) &&
      typeof value === "object" &&
      value !== null
    ) {
      const period = value as Record<string, unknown>;
      const redacted: Record<string, unknown> = {};
      for (const [pk, pv] of Object.entries(period)) {
        redacted[pk] = typeof pv === "string" ? redactDates(pv) : pv;
      }
      deidentified[key] = redacted;
      removedFields.push(`${key} (dates)`);
      continue;
    }

    if (
      REFERENCE_FIELD_RE.test(key) &&
      typeof value === "object" &&
      value !== null
    ) {
      if (Array.isArray(value)) {
        deidentified[key] = value.map((v) =>
          typeof v === "object" && v !== null
            ? redactReference(v as { reference?: string; display?: string })
            : v
        );
      } else {
        deidentified[key] = redactReference(
          value as { reference?: string; display?: string }
        );
      }
      removedFields.push(`${key} (names)`);
      continue;
    }

    deidentified[key] = value;
  }

  return {
    deidentified,
    removedFields,
    confidence: removedFields.length > 0 ? 0.9 : 1.0,
  };
}

export function deidentifyResource(
  resource: FhirResource,
  strategy: "safe_harbor" | "expert_determination" | "none" = "safe_harbor"
): DeidentificationResult {
  if (strategy === "none") {
    return {
      deidentified: resource as Record<string, unknown>,
      removedFields: [],
      confidence: 1.0,
    };
  }

  const raw = resource as Record<string, unknown>;

  if (resource.resourceType === "Patient") {
    return deidentifyPatient(raw);
  }

  return deidentifyGenericResource(raw);
}

function calculateAge(birthDate: string | undefined): number | undefined {
  if (!birthDate) {
    return;
  }
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) {
    return;
  }
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

export function isPhiField(resourceType: string, fieldName: string): boolean {
  if (resourceType === "Patient") {
    return fieldName in PATIENT_PHI_FIELDS;
  }
  return DATE_FIELD_RE.test(fieldName) || REFERENCE_FIELD_RE.test(fieldName);
}
