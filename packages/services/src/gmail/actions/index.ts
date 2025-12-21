export {
  type CreateDraftParams,
  createDraft,
  type DraftResult,
  deleteDraft,
  sendDraft,
} from "./drafts";
export {
  addLabels,
  type BatchModifyParams,
  batchModifyLabels,
  type ModifyLabelsParams,
  type ModifyLabelsResult,
  markAsImportant,
  markAsNotImportant,
  markAsRead,
  markAsUnread,
  modifyMessageLabels,
  removeLabels,
  star,
  unstar,
} from "./labels";
export {
  archiveMessage,
  batchArchive,
  batchTrash,
  type MessageResult,
  trashMessage,
  unarchiveMessage,
  untrashMessage,
} from "./messages";
export {
  type ReplyParams,
  replyToEmail,
  type SendEmailParams,
  type SendEmailResult,
  sendEmail,
} from "./send-email";
