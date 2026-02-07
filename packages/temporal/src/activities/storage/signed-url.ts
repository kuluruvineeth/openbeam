import type { StorageProvider } from "@openplane/storage";
import type { GetSignedUrlInput } from "./types";

export interface SignedUrlActivityDependencies {
  storage: StorageProvider;
}

export function createGetSignedUrlActivity(
  deps: SignedUrlActivityDependencies
) {
  const { storage } = deps;

  return function getSignedUrl(input: GetSignedUrlInput): Promise<string> {
    return storage.getSignedUrl(input.key, input.expiresIn ?? 3600);
  };
}
