import type { OAuthProvider } from "./types";

class OAuthManager {
  private readonly providers = new Map<string, OAuthProvider>();

  register(provider: OAuthProvider): void {
    this.providers.set(provider.name, provider);
  }

  get(name: string): OAuthProvider | undefined {
    return this.providers.get(name);
  }

  has(name: string): boolean {
    return this.providers.has(name);
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const oauthManager = new OAuthManager();
