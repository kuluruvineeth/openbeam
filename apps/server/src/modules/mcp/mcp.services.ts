import { completionService } from "@openbeam/ai";
import db from "@openbeam/db";
import {
  ContextSearchService,
  ContextSessionManager,
  ContextStore,
  RelationService,
} from "@openbeam/services";

let _contextStore: ContextStore | null = null;
let _contextSearch: ContextSearchService | null = null;
let _sessionManager: ContextSessionManager | null = null;
let _relationService: RelationService | null = null;

export function getContextStore(): ContextStore {
  _contextStore ??= new ContextStore(db);
  return _contextStore;
}

export function getContextSearchService(): ContextSearchService {
  _contextSearch ??= new ContextSearchService(completionService);
  return _contextSearch;
}

export function getSessionManager(): ContextSessionManager {
  _sessionManager ??= new ContextSessionManager(db);
  return _sessionManager;
}

export function getRelationService(): RelationService {
  _relationService ??= new RelationService(db);
  return _relationService;
}
