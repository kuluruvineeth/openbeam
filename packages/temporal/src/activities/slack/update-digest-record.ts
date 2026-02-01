import db, { updateDigestDelivery } from "@openplane/db";
import type { UpdateDigestRecordInput } from "./types";

export async function updateDigestRecord(
  input: UpdateDigestRecordInput
): Promise<void> {
  await updateDigestDelivery(db, input.subscriptionId, input.error);
}
