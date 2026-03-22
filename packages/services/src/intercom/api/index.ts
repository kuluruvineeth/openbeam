export type { IntercomArticle } from "./articles";
export { createArticle, getAllArticles } from "./articles";
export type { IntercomCollection } from "./collections";
export { getAllCollections } from "./collections";
export type { IntercomContact } from "./contacts";
export { getAllContacts } from "./contacts";
export type { IntercomConversation } from "./conversations";
export {
  getAllConversations,
  getConversation,
  replyToConversation,
  searchConversationsUpdatedAfter,
  tagConversation,
} from "./conversations";
