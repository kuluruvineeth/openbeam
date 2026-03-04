import { describe, expect, it } from "bun:test";
import type { FhirResource } from "@openplane/types/services/connectors/fhir";
import { deidentifyResource, isPhiField } from "../phi/safe-harbor";

describe("deidentifyResource", () => {
  describe("strategy=none", () => {
    it("returns resource unchanged", () => {
      const resource: FhirResource = {
        resourceType: "Patient",
        id: "p1",
        name: [{ family: "Smith", given: ["John"] }],
      } as FhirResource;

      const result = deidentifyResource(resource, "none");
      expect(result.removedFields).toHaveLength(0);
      expect(result.confidence).toBe(1.0);
      expect(result.deidentified).toEqual(resource);
    });
  });

  describe("Patient de-identification", () => {
    it("removes name field", () => {
      const patient: FhirResource = {
        resourceType: "Patient",
        id: "p1",
        name: [{ family: "Smith", given: ["John"] }],
        gender: "male",
      } as FhirResource;

      const result = deidentifyResource(patient, "safe_harbor");
      expect(result.deidentified.name).toBeUndefined();
      expect(result.removedFields).toContain("name (names)");
    });

    it("removes address field", () => {
      const patient: FhirResource = {
        resourceType: "Patient",
        id: "p1",
        address: [{ city: "Boston", state: "MA" }],
      } as FhirResource;

      const result = deidentifyResource(patient, "safe_harbor");
      expect(result.deidentified.address).toBeUndefined();
      expect(result.removedFields).toContain("address (geographic_data)");
    });

    it("removes telecom field", () => {
      const patient: FhirResource = {
        resourceType: "Patient",
        id: "p1",
        telecom: [{ system: "phone", value: "555-1234" }],
      } as FhirResource;

      const result = deidentifyResource(patient, "safe_harbor");
      expect(result.deidentified.telecom).toBeUndefined();
      expect(result.removedFields).toContain("telecom (phone_numbers)");
    });

    it("removes identifier field", () => {
      const patient: FhirResource = {
        resourceType: "Patient",
        id: "p1",
        identifier: [{ system: "http://mrn", value: "MRN123" }],
      } as FhirResource;

      const result = deidentifyResource(patient, "safe_harbor");
      expect(result.deidentified.identifier).toBeUndefined();
      expect(result.removedFields).toContain(
        "identifier (other_unique_identifiers)"
      );
    });

    it("removes photo field", () => {
      const patient: FhirResource = {
        resourceType: "Patient",
        id: "p1",
        photo: [{ contentType: "image/jpeg" }],
      } as FhirResource;

      const result = deidentifyResource(patient, "safe_harbor");
      expect(result.deidentified.photo).toBeUndefined();
      expect(result.removedFields).toContain("photo (photographs)");
    });

    it("preserves gender and active fields", () => {
      const patient: FhirResource = {
        resourceType: "Patient",
        id: "p1",
        gender: "female",
        active: true,
      } as FhirResource;

      const result = deidentifyResource(patient, "safe_harbor");
      expect(result.deidentified.gender).toBe("female");
      expect(result.deidentified.active).toBe(true);
    });

    it("calculates de-identified age", () => {
      const year = new Date().getFullYear();
      const patient: FhirResource = {
        resourceType: "Patient",
        id: "p1",
        birthDate: `${year - 45}-06-15`,
      } as FhirResource;

      const result = deidentifyResource(patient, "safe_harbor");
      expect(result.deidentified._deidentifiedAge).toBeDefined();
    });

    it("caps age at 90+", () => {
      const patient: FhirResource = {
        resourceType: "Patient",
        id: "p1",
        birthDate: "1920-01-01",
      } as FhirResource;

      const result = deidentifyResource(patient, "safe_harbor");
      expect(result.deidentified._deidentifiedAge).toBe("90+");
    });

    it("has confidence > 0 when fields removed", () => {
      const patient: FhirResource = {
        resourceType: "Patient",
        id: "p1",
        name: [{ family: "Doe" }],
      } as FhirResource;

      const result = deidentifyResource(patient, "safe_harbor");
      expect(result.confidence).toBe(0.95);
    });
  });

  describe("generic resource de-identification", () => {
    it("redacts date fields to year only", () => {
      const obs: FhirResource = {
        resourceType: "Observation",
        id: "o1",
        effectiveDateTime: "2024-03-15T10:30:00Z",
      } as FhirResource;

      const result = deidentifyResource(obs, "safe_harbor");
      expect(result.deidentified.effectiveDateTime).toBe("2024");
    });

    it("preserves short date values (year only)", () => {
      const obs: FhirResource = {
        resourceType: "Observation",
        id: "o1",
        effectiveDateTime: "2024",
      } as FhirResource;

      const result = deidentifyResource(obs, "safe_harbor");
      expect(result.deidentified.effectiveDateTime).toBe("2024");
    });

    it("redacts period fields", () => {
      const enc: FhirResource = {
        resourceType: "Encounter",
        id: "e1",
        period: { start: "2024-03-15", end: "2024-03-16" },
      } as FhirResource;

      const result = deidentifyResource(enc, "safe_harbor");
      const period = result.deidentified.period as Record<string, string>;
      expect(period.start).toBe("2024");
      expect(period.end).toBe("2024");
    });

    it("redacts subject reference display name", () => {
      const obs: FhirResource = {
        resourceType: "Observation",
        id: "o1",
        subject: { reference: "Patient/p1", display: "John Smith" },
      } as FhirResource;

      const result = deidentifyResource(obs, "safe_harbor");
      const subject = result.deidentified.subject as Record<string, unknown>;
      expect(subject.reference).toBe("Patient/p1");
      expect(subject.display).toBe("[REDACTED]");
    });

    it("preserves resource type and id", () => {
      const obs: FhirResource = {
        resourceType: "Observation",
        id: "o1",
        status: "final",
      } as FhirResource;

      const result = deidentifyResource(obs, "safe_harbor");
      expect(result.deidentified.resourceType).toBe("Observation");
      expect(result.deidentified.id).toBe("o1");
    });

    it("preserves non-PHI fields", () => {
      const obs: FhirResource = {
        resourceType: "Observation",
        id: "o1",
        status: "final",
        code: { text: "Blood Pressure" },
      } as FhirResource;

      const result = deidentifyResource(obs, "safe_harbor");
      expect(result.deidentified.status).toBe("final");
      expect(result.deidentified.code).toEqual({ text: "Blood Pressure" });
    });
  });
});

describe("isPhiField", () => {
  it("identifies Patient name as PHI", () => {
    expect(isPhiField("Patient", "name")).toBe(true);
  });

  it("identifies Patient address as PHI", () => {
    expect(isPhiField("Patient", "address")).toBe(true);
  });

  it("identifies Patient telecom as PHI", () => {
    expect(isPhiField("Patient", "telecom")).toBe(true);
  });

  it("does not flag Patient gender as PHI", () => {
    expect(isPhiField("Patient", "gender")).toBe(false);
  });

  it("identifies date fields in generic resources as PHI", () => {
    expect(isPhiField("Observation", "effectiveDateTime")).toBe(true);
  });

  it("identifies subject reference as PHI", () => {
    expect(isPhiField("Observation", "subject")).toBe(true);
  });

  it("does not flag status as PHI", () => {
    expect(isPhiField("Observation", "status")).toBe(false);
  });
});
