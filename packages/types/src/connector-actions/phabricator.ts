export interface PhabricatorTaskCreateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface PhabricatorTaskUpdateResult {
  id: string | undefined;
}

export interface PhabricatorWikiPageCreateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface PhabricatorWikiPageUpdateResult {
  id: string | undefined;
}

export interface PhabricatorActionResults {
  task_create: PhabricatorTaskCreateResult;
  task_update: PhabricatorTaskUpdateResult;
  wiki_page_create: PhabricatorWikiPageCreateResult;
  wiki_page_update: PhabricatorWikiPageUpdateResult;
}
