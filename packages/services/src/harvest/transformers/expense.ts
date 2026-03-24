import type { HarvestTransformContext } from "@openbeam/types/services/connectors/harvest";
import type { GenericDocument } from "@openbeam/vespa";
import type { HarvestExpense } from "../api/expenses";

export function transformHarvestExpense(
  expense: HarvestExpense,
  context: HarvestTransformContext
): GenericDocument {
  const parts = [
    `Amount: ${expense.total_cost} ${expense.client.currency}`,
    `Project: ${expense.project.name}`,
    `Category: ${expense.expense_category.name}`,
    `User: ${expense.user.name}`,
    expense.notes || null,
    expense.billable ? "Billable" : "Non-billable",
  ].filter(Boolean);

  const title = `${expense.expense_category.name} - ${expense.project.name} ($${expense.total_cost})`;

  return {
    id: `${context.connectorId}_expense_${expense.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(expense.id),
    document_type: "expense",
    document_subtype: expense.billable ? "billable" : "non-billable",
    title,
    content: parts.join(" — "),
    created_at: new Date(expense.created_at).getTime(),
    updated_at: new Date(expense.updated_at).getTime(),
    url: `${context.baseUrl}/expenses`,
    author_name: expense.user.name,
    is_public: false,
    access_control: [],
    metadata: {
      totalCost: String(expense.total_cost),
      projectName: expense.project.name,
      categoryName: expense.expense_category.name,
      clientName: expense.client.name,
      userName: expense.user.name,
      spentDate: expense.spent_date,
      billable: String(expense.billable),
      ...(expense.receipt && { hasReceipt: "true" }),
    },
  };
}
