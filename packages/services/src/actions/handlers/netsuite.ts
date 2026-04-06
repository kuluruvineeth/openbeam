import {
  createNetsuiteCustomer,
  createNetsuiteSalesOrder,
  createNetsuiteVendor,
  updateNetsuiteCustomer,
  updateNetsuiteSalesOrder,
} from "../../netsuite/actions";
import {
  createNetsuiteClient,
  type NetsuiteClient,
} from "../../netsuite/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { str } from "./shared/params";

type Handler = (
  client: NetsuiteClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

const actions: Record<string, Handler> = {
  async customer_create(client, p) {
    const r = await createNetsuiteCustomer(client, p);
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },

  async customer_update(client, p) {
    const r = await updateNetsuiteCustomer(client, str(p, "customerId"), p);
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },

  async vendor_create(client, p) {
    const r = await createNetsuiteVendor(client, p);
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },

  async sales_order_create(client, p) {
    const r = await createNetsuiteSalesOrder(client, p);
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },

  async sales_order_update(client, p) {
    const r = await updateNetsuiteSalesOrder(client, str(p, "salesOrderId"), p);
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },
};

registerHandler({
  connectorType: "netsuite",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported NetSuite action: ${actionId}`,
      };
    }

    const client = createNetsuiteClient({
      connectorId: "",
      accountId: (credentials.config.accountId as string) ?? "",
      consumerKey: (credentials.config.consumerKey as string) ?? "",
      consumerSecret: (credentials.config.consumerSecret as string) ?? "",
      tokenKey: (credentials.config.tokenKey as string) ?? "",
      tokenSecret: (credentials.config.tokenSecret as string) ?? "",
    });

    return await handler(client, params);
  },
});
