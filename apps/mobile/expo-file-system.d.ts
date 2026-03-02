declare module "expo-file-system" {
  export type FileInfo = {
    uri?: string | null;
    size?: number | null;
    creationTime?: number | null;
  };

  export class Directory {
    constructor(...segments: unknown[]);
    readonly uri: string;
    readonly exists: boolean;
    list(): Array<File | Directory>;
    info(): FileInfo;
  }

  export class File {
    constructor(...segments: unknown[]);
    readonly uri: string;
    readonly exists: boolean;
    readonly size: number;
    info(): FileInfo;
    base64(): Promise<string>;
    delete(): Promise<void>;
  }

  export const Paths: {
    cache?: string;
    document?: string;
  };
}
