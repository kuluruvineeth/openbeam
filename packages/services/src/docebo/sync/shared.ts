import type { DoceboTransformContext } from "@openbeam/types/services/connectors/docebo";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";

type SyncEntityParams<T> = {
  source: AsyncGenerator<T[], void, undefined>;
  transform: (item: T, ctx: DoceboTransformContext) => GenericDocument;
  context: DoceboTransformContext;
  getUpdatedAt: (item: T) => string;
  getItemId: (item: T) => string | number;
  entityName: string;
};

type SyncEntityState = {
  documents: GenericDocument[];
  processed: number;
  errors: number;
  latestModified: number;
};

export async function syncEntity<T>(
  params: SyncEntityParams<T>,
  state: SyncEntityState
): Promise<void> {
  const { source, transform, context, getUpdatedAt, getItemId, entityName } =
    params;

  for await (const page of source) {
    for (const item of page) {
      try {
        state.documents.push(transform(item, context));
        state.processed += 1;
        const ts = new Date(getUpdatedAt(item)).getTime();
        if (ts > state.latestModified) {
          state.latestModified = ts;
        }
      } catch (error) {
        logger.error(
          { error, itemId: getItemId(item) },
          `Error transforming Docebo ${entityName}`
        );
        state.errors += 1;
      }
    }
  }
}
