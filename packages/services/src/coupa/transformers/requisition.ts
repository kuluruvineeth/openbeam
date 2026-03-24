import type { CoupaTransformContext } from "@openbeam/types/services/connectors/coupa";
import type { GenericDocument } from "@openbeam/vespa";
import type { CoupaRequisition } from "../api/requisitions";
import { buildCoupaUrl } from "./utils";

export function transformCoupaRequisition(
  req: CoupaRequisition,
  context: CoupaTransformContext
): GenericDocument {
  const lineDescriptions = (req["requisition-lines"] ?? [])
    .map((l) => l.description)
    .filter(Boolean)
    .join("; ");

  const parts = [
    req.status ? `Status: ${req.status}` : null,
    req.total ? `Total: ${req.total} ${req.currency?.code ?? ""}` : null,
    req["requested-by"]?.fullname
      ? `Requester: ${req["requested-by"].fullname}`
      : null,
    req.department ? `Department: ${req.department.name}` : null,
    req.justification ? `Justification: ${req.justification}` : null,
    lineDescriptions ? `Items: ${lineDescriptions}` : null,
  ].filter(Boolean);

  const title = req["requisition-number"]
    ? `REQ-${req["requisition-number"]}`
    : `Requisition #${req.id}`;

  return {
    id: `${context.connectorId}_requisition_${req.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(req.id),
    document_type: "requisition",
    document_subtype: req.status,
    title,
    content: parts.join(" — "),
    created_at: new Date(req["created-at"]).getTime(),
    updated_at: new Date(req["updated-at"]).getTime(),
    url: buildCoupaUrl(context.instanceUrl, "requisitions", req.id),
    author_name: req["requested-by"]?.fullname,
    is_public: false,
    access_control: [],
    metadata: {
      ...(req["requisition-number"] && {
        requisitionNumber: req["requisition-number"],
      }),
      ...(req.status && { status: req.status }),
      ...(req.total && { total: req.total }),
      ...(req.currency?.code && { currency: req.currency.code }),
      ...(req.department && { department: req.department.name }),
    },
  };
}
