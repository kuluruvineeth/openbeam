export interface CoupaRequisitionCreateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface CoupaRequisitionUpdateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface CoupaSupplierCreateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface CoupaExpenseReportCreateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface CoupaActionResults {
  requisition_create: CoupaRequisitionCreateResult;
  requisition_update: CoupaRequisitionUpdateResult;
  supplier_create: CoupaSupplierCreateResult;
  expense_report_create: CoupaExpenseReportCreateResult;
}
