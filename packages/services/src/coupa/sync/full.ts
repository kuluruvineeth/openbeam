import type {
  CoupaSyncBatch,
  CoupaTransformContext,
} from "@openbeam/types/services/connectors/coupa";
import type { GenericDocument } from "@openbeam/vespa";
import { listAllContracts } from "../api/contracts";
import { listAllExpenseReports } from "../api/expense-reports";
import { listAllInvoices } from "../api/invoices";
import { listAllPurchaseOrders } from "../api/purchase-orders";
import { listAllRequisitions } from "../api/requisitions";
import { listAllSuppliers } from "../api/suppliers";
import type { CoupaClient } from "../client";
import { transformCoupaContract } from "../transformers/contract";
import { transformCoupaExpenseReport } from "../transformers/expense-report";
import { transformCoupaInvoice } from "../transformers/invoice";
import { transformCoupaPurchaseOrder } from "../transformers/purchase-order";
import { transformCoupaRequisition } from "../transformers/requisition";
import { transformCoupaSupplier } from "../transformers/supplier";
import { syncEntity } from "./shared";

type SyncOptions = {
  batchSize?: number;
  syncPurchaseOrders?: boolean;
  syncInvoices?: boolean;
  syncRequisitions?: boolean;
  syncSuppliers?: boolean;
  syncContracts?: boolean;
  syncExpenseReports?: boolean;
};

export async function* coupaFullSync(
  client: CoupaClient,
  context: CoupaTransformContext,
  options: SyncOptions = {}
): AsyncGenerator<CoupaSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  const state = {
    documents: [] as GenericDocument[],
    processed: 0,
    errors: 0,
    latestModified: 0,
  };

  if (options.syncPurchaseOrders !== false) {
    await syncEntity(
      {
        source: listAllPurchaseOrders(client),
        transform: transformCoupaPurchaseOrder,
        context,
        getUpdatedAt: (po) => po["updated-at"],
        getItemId: (po) => po.id,
        entityName: "purchase order",
      },
      state
    );
    if (state.documents.length >= batchSize) {
      yield makeBatch(state, true);
      state.documents = [];
    }
  }

  if (options.syncInvoices !== false) {
    await syncEntity(
      {
        source: listAllInvoices(client),
        transform: transformCoupaInvoice,
        context,
        getUpdatedAt: (inv) => inv["updated-at"],
        getItemId: (inv) => inv.id,
        entityName: "invoice",
      },
      state
    );
    if (state.documents.length >= batchSize) {
      yield makeBatch(state, true);
      state.documents = [];
    }
  }

  if (options.syncRequisitions !== false) {
    await syncEntity(
      {
        source: listAllRequisitions(client),
        transform: transformCoupaRequisition,
        context,
        getUpdatedAt: (req) => req["updated-at"],
        getItemId: (req) => req.id,
        entityName: "requisition",
      },
      state
    );
    if (state.documents.length >= batchSize) {
      yield makeBatch(state, true);
      state.documents = [];
    }
  }

  if (options.syncSuppliers !== false) {
    await syncEntity(
      {
        source: listAllSuppliers(client),
        transform: transformCoupaSupplier,
        context,
        getUpdatedAt: (s) => s["updated-at"],
        getItemId: (s) => s.id,
        entityName: "supplier",
      },
      state
    );
    if (state.documents.length >= batchSize) {
      yield makeBatch(state, true);
      state.documents = [];
    }
  }

  if (options.syncContracts !== false) {
    await syncEntity(
      {
        source: listAllContracts(client),
        transform: transformCoupaContract,
        context,
        getUpdatedAt: (c) => c["updated-at"],
        getItemId: (c) => c.id,
        entityName: "contract",
      },
      state
    );
    if (state.documents.length >= batchSize) {
      yield makeBatch(state, true);
      state.documents = [];
    }
  }

  if (options.syncExpenseReports !== false) {
    await syncEntity(
      {
        source: listAllExpenseReports(client),
        transform: transformCoupaExpenseReport,
        context,
        getUpdatedAt: (r) => r["updated-at"],
        getItemId: (r) => r.id,
        entityName: "expense report",
      },
      state
    );
  }

  yield {
    items: state.documents,
    cursor: {
      lastSyncTime: state.latestModified || Date.now(),
      lastFullSync: Date.now(),
    },
    hasMore: false,
    stats: { processed: state.processed, skipped: 0, errors: state.errors },
  };
}

function makeBatch(
  state: {
    documents: GenericDocument[];
    processed: number;
    errors: number;
    latestModified: number;
  },
  hasMore: boolean
): CoupaSyncBatch<GenericDocument> {
  return {
    items: state.documents,
    cursor: {
      lastSyncTime: state.latestModified || Date.now(),
      lastFullSync: Date.now(),
    },
    hasMore,
    stats: { processed: state.processed, skipped: 0, errors: state.errors },
  };
}
