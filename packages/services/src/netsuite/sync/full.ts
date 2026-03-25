import type {
  NetsuiteSyncBatch,
  NetsuiteTransformContext,
} from "@openbeam/types/services/connectors/netsuite";
import type { GenericDocument } from "@openbeam/vespa";
import { listAllCustomers } from "../api/customers";
import { listAllEmployees } from "../api/employees";
import { listAllInvoices } from "../api/invoices";
import { listAllPurchaseOrders } from "../api/purchase-orders";
import { listAllSalesOrders } from "../api/sales-orders";
import { listAllVendors } from "../api/vendors";
import type { NetsuiteClient } from "../client";
import { transformNetsuiteCustomer } from "../transformers/customer";
import { transformNetsuiteEmployee } from "../transformers/employee";
import { transformNetsuiteInvoice } from "../transformers/invoice";
import { transformNetsuitePurchaseOrder } from "../transformers/purchase-order";
import { transformNetsuiteSalesOrder } from "../transformers/sales-order";
import { transformNetsuiteVendor } from "../transformers/vendor";
import { syncEntity } from "./shared";

type SyncOptions = {
  batchSize?: number;
  syncCustomers?: boolean;
  syncVendors?: boolean;
  syncInvoices?: boolean;
  syncSalesOrders?: boolean;
  syncPurchaseOrders?: boolean;
  syncEmployees?: boolean;
};

export async function* netsuiteFullSync(
  client: NetsuiteClient,
  context: NetsuiteTransformContext,
  options: SyncOptions = {}
): AsyncGenerator<NetsuiteSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  const state = {
    documents: [] as GenericDocument[],
    processed: 0,
    errors: 0,
    latestModified: 0,
  };

  if (options.syncCustomers !== false) {
    await syncEntity(
      {
        source: listAllCustomers(client),
        transform: transformNetsuiteCustomer,
        context,
        getUpdatedAt: (c) => c.lastModifiedDate,
        getItemId: (c) => c.id,
        entityName: "customer",
      },
      state
    );
    if (state.documents.length >= batchSize) {
      yield makeBatch(state, true);
      state.documents = [];
    }
  }

  if (options.syncVendors !== false) {
    await syncEntity(
      {
        source: listAllVendors(client),
        transform: transformNetsuiteVendor,
        context,
        getUpdatedAt: (v) => v.lastModifiedDate,
        getItemId: (v) => v.id,
        entityName: "vendor",
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
        transform: transformNetsuiteInvoice,
        context,
        getUpdatedAt: (inv) => inv.lastModifiedDate,
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

  if (options.syncSalesOrders !== false) {
    await syncEntity(
      {
        source: listAllSalesOrders(client),
        transform: transformNetsuiteSalesOrder,
        context,
        getUpdatedAt: (so) => so.lastModifiedDate,
        getItemId: (so) => so.id,
        entityName: "sales order",
      },
      state
    );
    if (state.documents.length >= batchSize) {
      yield makeBatch(state, true);
      state.documents = [];
    }
  }

  if (options.syncPurchaseOrders !== false) {
    await syncEntity(
      {
        source: listAllPurchaseOrders(client),
        transform: transformNetsuitePurchaseOrder,
        context,
        getUpdatedAt: (po) => po.lastModifiedDate,
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

  if (options.syncEmployees !== false) {
    await syncEntity(
      {
        source: listAllEmployees(client),
        transform: transformNetsuiteEmployee,
        context,
        getUpdatedAt: (e) => e.lastModifiedDate,
        getItemId: (e) => e.id,
        entityName: "employee",
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
): NetsuiteSyncBatch<GenericDocument> {
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
