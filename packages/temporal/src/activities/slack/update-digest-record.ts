import db, { updateDigestDelivery } from "@openbeam/db";
import type { UpdateDigestRecordInput } from "./types";

export async function updateDigestRecord(
  input: UpdateDigestRecordInput
): Promise<void> {
  await updateDigestDelivery(db, input.subscriptionId, input.error);
}
