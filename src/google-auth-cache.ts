import { AuthEntry } from './types/auth-entry.js';

export class GoogleAuthCache {
  public cache = new Map<string, AuthEntry>();

  public cacheKey(email: string, scopes: readonly string[]) {
    const fullString = `${email}_${[...scopes].sort().join(',')}`;
    return fullString;
  }

  public async set(email: string, scopes: readonly string[], entry: AuthEntry) {
    return this.cache.set(this.cacheKey(email, scopes), entry);
  }

  public async get(email: string, scopes: readonly string[]) {
    return this.cache.get(this.cacheKey(email, scopes));
  }
}
