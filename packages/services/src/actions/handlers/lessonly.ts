import { createAssignment } from "../../lessonly/actions/assignments";
import { updateLesson } from "../../lessonly/actions/lessons";
import {
  createLessonlyClient,
  type LessonlyClient,
} from "../../lessonly/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { str } from "./shared/params";

type Handler = (
  client: LessonlyClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

function num(p: Record<string, unknown>, key: string): number {
  const v = p[key];
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) {
    throw new Error(`${key} must be a number`);
  }
  return n;
}

const actions: Record<string, Handler> = {
  async assignment_create(client, p) {
    const r = await createAssignment(client, {
      assigneeId: num(p, "assigneeId"),
      assignableId: num(p, "assignableId"),
      assignableType: str(p, "assignableType") as "Lesson" | "Path",
      dueBy: typeof p.dueBy === "string" ? p.dueBy : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },

  async lesson_update(client, p) {
    const r = await updateLesson(client, {
      lessonId: num(p, "lessonId"),
      title: typeof p.title === "string" ? p.title : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },
};

registerHandler({
  connectorType: "lessonly",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Lessonly action: ${actionId}`,
      };
    }

    const client = createLessonlyClient({
      connectorId: "",
      apiKey: (credentials.config.apiKey as string) ?? "",
      subdomain: (credentials.config.subdomain as string) ?? "",
    });

    return await handler(client, params);
  },
});
