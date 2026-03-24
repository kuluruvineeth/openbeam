import type { DoceboTransformContext } from "@openbeam/types/services/connectors/docebo";
import type { GenericDocument } from "@openbeam/vespa";
import type { DoceboLearningPlan } from "../api/learning-plans";
import { buildDoceboUrl } from "./utils";

export function transformDoceboLearningPlan(
  plan: DoceboLearningPlan,
  context: DoceboTransformContext
): GenericDocument {
  const parts = [
    plan.description || null,
    plan.status ? `Status: ${plan.status}` : null,
    plan.courses_count ? `Courses: ${plan.courses_count}` : null,
    plan.duration ? `Duration: ${plan.duration} minutes` : null,
    plan.category?.name ? `Category: ${plan.category.name}` : null,
  ].filter(Boolean);

  return {
    id: `${context.connectorId}_learning_plan_${plan.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(plan.id),
    document_type: "learning_plan",
    document_subtype: plan.status,
    title: plan.name,
    content: parts.join(" — "),
    created_at: new Date(plan.date_creation).getTime(),
    updated_at: new Date(plan.date_last_updated).getTime(),
    url: buildDoceboUrl(context.instanceUrl, "learningplan", plan.id),
    is_public: false,
    access_control: [],
    metadata: {
      ...(plan.status && { status: plan.status }),
      ...(plan.courses_count && { coursesCount: String(plan.courses_count) }),
      ...(plan.duration && { duration: String(plan.duration) }),
      ...(plan.category?.name && { category: plan.category.name }),
    },
  };
}
