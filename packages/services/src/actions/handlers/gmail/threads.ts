import { trashThread } from "../../../gmail/actions/messages";
import { getThread } from "../../../gmail/api/threads";
import { ActionExecutorError } from "../../errors";
import { str } from "../shared/params";
import { failure, type GmailHandler } from "./shared";

export const thread_get: GmailHandler = async ({ client, params }) => {
  const thread = await getThread(client, str(params, "threadId"), {
    format: "full",
  });
  if (!thread) {
    throw new ActionExecutorError({
      code: "THREAD_NOT_FOUND",
      message: "Thread not found",
      retryable: false,
      statusCode: 404,
    });
  }
  return {
    success: true,
    data: {
      id: thread.id,
      messages: thread.messages ?? [],
      snippet: thread.snippet ?? "",
    },
  };
};

export const thread_trash: GmailHandler = async ({ client, params }) => {
  const r = await trashThread(client, str(params, "threadId"));
  if (!r.success) {
    return failure(r.error);
  }
  return { success: true, data: { threadId: r.threadId } };
};
