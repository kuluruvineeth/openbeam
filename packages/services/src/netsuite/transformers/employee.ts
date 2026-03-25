import type { NetsuiteTransformContext } from "@openbeam/types/services/connectors/netsuite";
import type { GenericDocument } from "@openbeam/vespa";
import type { NetsuiteEmployee } from "../api/employees";
import { buildNetsuiteUrl, formatRefName } from "./utils";

export function transformNetsuiteEmployee(
  employee: NetsuiteEmployee,
  context: NetsuiteTransformContext
): GenericDocument {
  const fullName = [employee.firstName, employee.lastName]
    .filter(Boolean)
    .join(" ");
  const name = fullName || employee.entityId || employee.id;

  const parts = [
    employee.title ? `Title: ${employee.title}` : null,
    formatRefName(employee.department)
      ? `Department: ${formatRefName(employee.department)}`
      : null,
    employee.email ? `Email: ${employee.email}` : null,
    employee.phone ? `Phone: ${employee.phone}` : null,
    formatRefName(employee.subsidiary)
      ? `Subsidiary: ${formatRefName(employee.subsidiary)}`
      : null,
    formatRefName(employee.supervisor)
      ? `Supervisor: ${formatRefName(employee.supervisor)}`
      : null,
    employee.isInactive ? "Status: Inactive" : "Status: Active",
  ].filter(Boolean);

  return {
    id: `${context.connectorId}_employee_${employee.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: employee.id,
    document_type: "employee",
    document_subtype: employee.isInactive ? "inactive" : "active",
    title: name,
    content: parts.join(" — "),
    created_at: employee.dateCreated
      ? new Date(employee.dateCreated).getTime()
      : Date.now(),
    updated_at: employee.lastModifiedDate
      ? new Date(employee.lastModifiedDate).getTime()
      : Date.now(),
    url: buildNetsuiteUrl(context.accountId, "employee", employee.id),
    author_name: formatRefName(employee.supervisor),
    is_public: false,
    access_control: [],
    metadata: {
      ...(employee.title && { jobTitle: employee.title }),
      ...(formatRefName(employee.department) && {
        department: formatRefName(employee.department) as string,
      }),
      ...(employee.email && { email: employee.email }),
      ...(formatRefName(employee.subsidiary) && {
        subsidiary: formatRefName(employee.subsidiary) as string,
      }),
      ...(employee.isInactive ? { status: "Inactive" } : { status: "Active" }),
    },
  };
}
