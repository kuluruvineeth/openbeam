import type { BambooHRTransformContext } from "@openbeam/types/services/connectors/bamboohr";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { BambooHREmployee } from "../client";

function buildEmployeeContent(emp: BambooHREmployee): string {
  const parts: string[] = [];

  const name = emp.displayName || `${emp.firstName} ${emp.lastName}`.trim();
  if (name) {
    parts.push(`Name: ${name}`);
  }
  if (emp.jobTitle) {
    parts.push(`Title: ${emp.jobTitle}`);
  }
  if (emp.department) {
    parts.push(`Department: ${emp.department}`);
  }
  if (emp.division) {
    parts.push(`Division: ${emp.division}`);
  }
  if (emp.location) {
    parts.push(`Location: ${emp.location}`);
  }
  if (emp.bestEmail || emp.workEmail) {
    parts.push(`Email: ${emp.bestEmail || emp.workEmail}`);
  }
  if (emp.workPhone) {
    parts.push(`Work Phone: ${emp.workPhone}`);
  }
  if (emp.mobilePhone) {
    parts.push(`Mobile: ${emp.mobilePhone}`);
  }
  if (emp.supervisor) {
    parts.push(`Reports To: ${emp.supervisor}`);
  }
  if (emp.hireDate) {
    parts.push(`Hire Date: ${emp.hireDate}`);
  }
  if (emp.status) {
    parts.push(`Status: ${emp.status}`);
  }
  if (emp.employeeNumber) {
    parts.push(`Employee #: ${emp.employeeNumber}`);
  }
  if (emp.city || emp.state || emp.country) {
    const loc = [emp.city, emp.state, emp.country].filter(Boolean).join(", ");
    parts.push(`Address: ${loc}`);
  }

  return parts.join("\n");
}

function buildEmployeeMetadata(
  emp: BambooHREmployee,
  ctx: BambooHRTransformContext
): GenericDocument["metadata"] {
  return {
    employeeId: emp.id,
    employeeNumber: emp.employeeNumber || "",
    jobTitle: emp.jobTitle || "",
    department: emp.department || "",
    division: emp.division || "",
    location: emp.location || "",
    status: emp.status || "",
    hireDate: emp.hireDate || "",
    supervisor: emp.supervisor || "",
    supervisorEId: emp.supervisorEId || "",
    subdomain: ctx.subdomain,
  };
}

export async function transformEmployee(
  emp: BambooHREmployee,
  ctx: BambooHRTransformContext
): Promise<GenericDocument> {
  const title =
    emp.displayName || `${emp.firstName} ${emp.lastName}`.trim() || "Unknown";
  const content = buildEmployeeContent(emp);
  const metadata = buildEmployeeMetadata(emp, ctx);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const email = emp.bestEmail || emp.workEmail || emp.homeEmail || "";
  const profileUrl = `https://${encodeURIComponent(ctx.subdomain)}.bamboohr.com/employees/employee.php?id=${emp.id}`;
  const hireTimestamp = emp.hireDate
    ? new Date(emp.hireDate).getTime()
    : Date.now();

  return {
    id: `${ctx.connectorId}_employee_${emp.id}`,
    connector_id: ctx.connectorId,
    connector_type: ctx.connectorType,
    team_id: ctx.teamId,
    workspace_id: ctx.workspaceId,
    external_id: emp.id,
    document_type: "employee",
    document_subtype: emp.status?.toLowerCase() || "active",
    title,
    content,
    created_at: hireTimestamp,
    updated_at: Date.now(),
    source_type: "bamboohr",
    url: profileUrl,
    is_public: false,
    access_control: [`team:${ctx.teamId}`],
    author_id: emp.id,
    author_email: email,
    author_name: title,
    metadata,
    checksum,
  };
}

export function transformEmployees(
  employees: BambooHREmployee[],
  ctx: BambooHRTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(employees.map((emp) => transformEmployee(emp, ctx)));
}
