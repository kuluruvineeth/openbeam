import type {
  CoupaSyncBatch,
  CoupaSyncCursor,
  CoupaTransformContext,
} from "@openbeam/types/services/connectors/coupa";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listContractsUpdatedSince } from "../api/contracts";
import { listExpenseReportsUpdatedSince } from "../api/expense-reports";
import { listInvoicesUpdatedSince } from "../api/invoices";
import { listPurchaseOrdersUpdatedSince } from "../api/purchase-orders";
import { listRequisitionsUpdatedSince } from "../api/requisitions";
import { listSuppliersUpdatedSince } from "../api/suppliers";
import type { CoupaClient } from "../client";
import { transformCoupaContract } from "../transformers/contract";
import { transformCoupaExpenseReport } from "../transformers/expense-report";
import { transformCoupaInvoice } from "../transformers/invoice";
import { transformCoupaPurchaseOrder } from "../transformers/purchase-order";
import { transformCoupaRequisition } from "../transformers/requisition";
import { transformCoupaSupplier } from "../transformers/supplier";
import { coupaFullSync } from "./full";
import { syncEntity } from "./shared";

type SyncOptions = {
  cursor?: CoupaSyncCursor;
  batchSize?: number;
  syncPurchaseOrders?: boolean;
  syncInvoices?: boolean;
  syncRequisitions?: boolean;
  syncSuppliers?: boolean;
  syncContracts?: boolean;
  syncExpenseReports?: boolean;
};

export async function* coupaIncrementalSync(
  client: CoupaClient,
  context: CoupaTransformContext,
  options: SyncOptions = {}
): AsyncGenerator<CoupaSyncBatch<GenericDocument>, void, undefined> {
  const { cursor } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* coupaFullSync(client, context, options);
    return;
  }

  const sinceDate = new Date(cursor.lastSyncTime).toISOString();
  const state = {
    documents: [] as GenericDocument[],
    processed: 0,
    errors: 0,
    latestModified: cursor.lastSyncTime,
  };

  try {
    if (options.syncPurchaseOrders !== false) {
      await syncEntity(
        {
          source: listPurchaseOrdersUpdatedSince(client, sinceDate),
          transform: transformCoupaPurchaseOrder,
          context,
          getUpdatedAt: (po) => po["updated-at"],
          getItemId: (po) => po.id,
          entityName: "purchase order (incremental)",
        },
        state
      );
    }

    if (options.syncInvoices !== false) {
      await syncEntity(
        {
          source: listInvoicesUpdatedSince(client, sinceDate),
          transform: transformCoupaInvoice,
          context,
          getUpdatedAt: (inv) => inv["updated-at"],
          getItemId: (inv) => inv.id,
          entityName: "invoice (incremental)",
        },
        state
      );
    }

    if (options.syncRequisitions !== false) {
      await syncEntity(
        {
          source: listRequisitionsUpdatedSince(client, sinceDate),
          transform: transformCoupaRequisition,
          context,
          getUpdatedAt: (req) => req["updated-at"],
          getItemId: (req) => req.id,
          entityName: "requisition (incremental)",
        },
        state
      );
    }

    if (options.syncSuppliers !== false) {
      await syncEntity(
        {
          source: listSuppliersUpdatedSince(client, sinceDate),
          transform: transformCoupaSupplier,
          context,
          getUpdatedAt: (s) => s["updated-at"],
          getItemId: (s) => s.id,
          entityName: "supplier (incremental)",
        },
        state
      );
    }

    if (options.syncContracts !== false) {
      await syncEntity(
        {
          source: listContractsUpdatedSince(client, sinceDate),
          transform: transformCoupaContract,
          context,
          getUpdatedAt: (c) => c["updated-at"],
          getItemId: (c) => c.id,
          entityName: "contract (incremental)",
        },
        state
      );
    }

    if (options.syncExpenseReports !== false) {
      await syncEntity(
        {
          source: listExpenseReportsUpdatedSince(client, sinceDate),
          transform: transformCoupaExpenseReport,
          context,
          getUpdatedAt: (r) => r["updated-at"],
          getItemId: (r) => r.id,
          entityName: "expense report (incremental)",
        },
        state
      );
    }

    yield {
      items: state.documents,
      cursor: {
        lastSyncTime: state.latestModified,
        lastFullSync: cursor.lastFullSync,
      },
      hasMore: false,
      stats: { processed: state.processed, skipped: 0, errors: state.errors },
    };
  } catch (error) {
    logger.warn(
      { error },
      "Coupa incremental sync failed, falling back to full"
    );
    yield* coupaFullSync(client, context, options);
  }
}
