export interface NetsuiteCustomerCreateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface NetsuiteCustomerUpdateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface NetsuiteVendorCreateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface NetsuiteSalesOrderCreateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface NetsuiteSalesOrderUpdateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface NetsuiteActionResults {
  customer_create: NetsuiteCustomerCreateResult;
  customer_update: NetsuiteCustomerUpdateResult;
  vendor_create: NetsuiteVendorCreateResult;
  sales_order_create: NetsuiteSalesOrderCreateResult;
  sales_order_update: NetsuiteSalesOrderUpdateResult;
}
