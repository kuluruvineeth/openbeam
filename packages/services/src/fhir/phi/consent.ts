import type { FhirConsentDirective } from "@openplane/types/services/connectors/fhir";

export function buildAccessControl(
  teamId: string,
  consent?: FhirConsentDirective
): string[] {
  const acl = [`team:${teamId}`];

  if (!consent) {
    return acl;
  }

  if (consent.status !== "active") {
    return acl;
  }

  for (const actor of consent.allowedActors) {
    acl.push(`practitioner:${actor}`);
  }

  for (const purpose of consent.deniedPurposes) {
    acl.push(`deny:${purpose}`);
  }

  return acl;
}

export function patientIdFromReference(reference: string): string | undefined {
  if (reference.startsWith("Patient/")) {
    return reference.slice(8);
  }
  return;
}
