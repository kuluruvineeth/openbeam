import { createLabel } from "../../../gmail/actions/labels";
import { listLabels } from "../../../gmail/api/labels";
import { optStr, str } from "../shared/params";
import { failure, type GmailHandler } from "./shared";

export const label_list: GmailHandler = async ({ client }) => {
  const labels = await listLabels(client);
  return { success: true, data: { labels } };
};

export const label_create: GmailHandler = async ({ client, params }) => {
  const visibility = optStr(params, "labelListVisibility");
  const listVisibility =
    visibility === "labelShow" ||
    visibility === "labelShowIfUnread" ||
    visibility === "labelHide"
      ? visibility
      : undefined;
  const r = await createLabel(client, {
    name: str(params, "name"),
    labelListVisibility: listVisibility,
  });
  if (!r.success) {
    return failure(r.error);
  }
  return { success: true, data: { id: r.id, name: r.name } };
};
