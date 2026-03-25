import type {
  NetsuiteSyncBatch,
  NetsuiteSyncCursor,
  NetsuiteTransformContext,
} from "@openbeam/types/services/connectors/netsuite";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listCustomersUpdatedSince } from "../api/customers";
import { listEmployeesUpdatedSince } from "../api/employees";
import { listInvoicesUpdatedSince } from "../api/invoices";
import { listPurchaseOrdersUpdatedSince } from "../api/purchase-orders";
import { listSalesOrdersUpdatedSince } from "../api/sales-orders";
import { listVendorsUpdatedSince } from "../api/vendors";
import type { NetsuiteClient } from "../client";
import { transformNetsuiteCustomer } from "../transformers/customer";
import { transformNetsuiteEmployee } from "../transformers/employee";
import { transformNetsuiteInvoice } from "../transformers/invoice";
import { transformNetsuitePurchaseOrder } from "../transformers/purchase-order";
import { transformNetsuiteSalesOrder } from "../transformers/sales-order";
import { transformNetsuiteVendor } from "../transformers/vendor";
import { netsuiteFullSync } from "./full";
import { syncEntity } from "./shared";

type SyncOptions = {
  cursor?: NetsuiteSyncCursor;
  batchSize?: number;
  syncCustomers?: boolean;
  syncVendors?: boolean;
  syncInvoices?: boolean;
  syncSalesOrders?: boolean;
  syncPurchaseOrders?: boolean;
  syncEmployees?: boolean;
};

export async function* netsuiteIncrementalSync(
  client: NetsuiteClient,
  context: NetsuiteTransformContext,
  options: SyncOptions = {}
): AsyncGenerator<NetsuiteSyncBatch<GenericDocument>, void, undefined> {
  const { cursor } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* netsuiteFullSync(client, context, options);
    return;
  }

  const isoDate = new Date(cursor.lastSyncTime).toISOString();
  const sinceDate = isoDate.slice(0, isoDate.indexOf("T"));
  const state = {
    documents: [] as GenericDocument[],
    processed: 0,
    errors: 0,
    latestModified: cursor.lastSyncTime,
  };

  try {
    if (options.syncCustomers !== false) {
      await syncEntity(
        {
          source: listCustomersUpdatedSince(client, sinceDate),
          transform: transformNetsuiteCustomer,
          context,
          getUpdatedAt: (c) => c.lastModifiedDate,
          getItemId: (c) => c.id,
          entityName: "customer (incremental)",
        },
        state
      );
    }

    if (options.syncVendors !== false) {
      await syncEntity(
        {
          source: listVendorsUpdatedSince(client, sinceDate),
          transform: transformNetsuiteVendor,
          context,
          getUpdatedAt: (v) => v.lastModifiedDate,
          getItemId: (v) => v.id,
          entityName: "vendor (incremental)",
        },
        state
      );
    }

    if (options.syncInvoices !== false) {
      await syncEntity(
        {
          source: listInvoicesUpdatedSince(client, sinceDate),
          transform: transformNetsuiteInvoice,
          context,
          getUpdatedAt: (inv) => inv.lastModifiedDate,
          getItemId: (inv) => inv.id,
          entityName: "invoice (incremental)",
        },
        state
      );
    }

    if (options.syncSalesOrders !== false) {
      await syncEntity(
        {
          source: listSalesOrdersUpdatedSince(client, sinceDate),
          transform: transformNetsuiteSalesOrder,
          context,
          getUpdatedAt: (so) => so.lastModifiedDate,
          getItemId: (so) => so.id,
          entityName: "sales order (incremental)",
        },
        state
      );
    }

    if (options.syncPurchaseOrders !== false) {
      await syncEntity(
        {
          source: listPurchaseOrdersUpdatedSince(client, sinceDate),
          transform: transformNetsuitePurchaseOrder,
          context,
          getUpdatedAt: (po) => po.lastModifiedDate,
          getItemId: (po) => po.id,
          entityName: "purchase order (incremental)",
        },
        state
      );
    }

    if (options.syncEmployees !== false) {
      await syncEntity(
        {
          source: listEmployeesUpdatedSince(client, sinceDate),
          transform: transformNetsuiteEmployee,
          context,
          getUpdatedAt: (e) => e.lastModifiedDate,
          getItemId: (e) => e.id,
          entityName: "employee (incremental)",
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
      "NetSuite incremental sync failed, falling back to full"
    );
    yield* netsuiteFullSync(client, context, options);
  }
}
