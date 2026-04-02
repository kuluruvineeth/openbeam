declare module "evernote" {
  export class Client {
    constructor(options?: {
      consumerKey?: string;
      consumerSecret?: string;
      sandbox?: boolean;
      china?: boolean;
      token?: string;
      serviceHost?: string;
    });
    getNoteStore(noteStoreUrl?: string): NoteStore;
    getUserStore(): UserStore;
  }

  interface UserStore {
    getUserUrls(): Promise<{ noteStoreUrl: string }>;
    checkVersion(
      clientName: string,
      edamVersionMajor: number,
      edamVersionMinor: number
    ): Promise<boolean>;
  }

  interface NoteStore {
    createNote(note: Note): Promise<Note>;
    updateNote(note: Note): Promise<Note>;
    deleteNote(guid: string): Promise<number>;
    expungeNote(guid: string): Promise<number>;
    getNote(
      guid: string,
      withContent: boolean,
      withResourcesData: boolean,
      withResourcesRecognition: boolean,
      withResourcesAlternateData: boolean
    ): Promise<Note>;
    getNoteContent(guid: string): Promise<string>;
    findNotesMetadata(
      filter: NoteFilter,
      offset: number,
      maxNotes: number,
      resultSpec: NotesMetadataResultSpec
    ): Promise<NotesMetadataList>;
    listNotebooks(): Promise<Notebook[]>;
    getNotebook(guid: string): Promise<Notebook>;
    listTags(): Promise<Tag[]>;
    copyNote(noteGuid: string, toNotebookGuid: string): Promise<Note>;
  }

  interface NoteAttributes {
    author?: string;
    source?: string;
    sourceURL?: string;
    sourceApplication?: string;
    contentClass?: string;
    reminderOrder?: number;
    reminderDoneTime?: number;
    reminderTime?: number;
    latitude?: number;
    longitude?: number;
  }

  interface Note {
    guid?: string;
    title?: string;
    content?: string;
    contentHash?: Buffer;
    contentLength?: number;
    created?: number;
    updated?: number;
    deleted?: number;
    active?: boolean;
    updateSequenceNum?: number;
    notebookGuid?: string;
    tagGuids?: string[];
    tagNames?: string[];
    resources?: unknown[];
    attributes?: NoteAttributes;
  }

  interface NoteFilter {
    order?: number;
    ascending?: boolean;
    words?: string;
    notebookGuid?: string;
    tagGuids?: string[];
    timeZone?: string;
    inactive?: boolean;
  }

  interface NotesMetadataResultSpec {
    includeTitle?: boolean;
    includeContentLength?: boolean;
    includeCreated?: boolean;
    includeUpdated?: boolean;
    includeDeleted?: boolean;
    includeUpdateSequenceNum?: boolean;
    includeNotebookGuid?: boolean;
    includeTagGuids?: boolean;
    includeAttributes?: boolean;
    includeLargestResourceMime?: boolean;
    includeLargestResourceSize?: boolean;
  }

  interface NoteMetadata {
    guid: string;
    title?: string;
    contentLength?: number;
    created?: number;
    updated?: number;
    deleted?: number;
    updateSequenceNum?: number;
    notebookGuid?: string;
    tagGuids?: string[];
    attributes?: NoteAttributes;
  }

  interface NotesMetadataList {
    startIndex: number;
    totalNotes: number;
    notes: NoteMetadata[];
    updateCount?: number;
  }

  interface Notebook {
    guid?: string;
    name?: string;
    updateSequenceNum?: number;
    defaultNotebook?: boolean;
    serviceCreated?: number;
    serviceUpdated?: number;
    stack?: string;
    sharedNotebookIds?: string[];
  }

  interface Tag {
    guid?: string;
    name?: string;
    parentGuid?: string;
    updateSequenceNum?: number;
  }

  export const Types: {
    Note: new () => Note;
  };
}
