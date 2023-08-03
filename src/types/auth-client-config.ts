import type { GoogleAuthCache } from '../google-auth-cache.js';

export interface AuthClientConfig {
  // can be used to override fetch implementation
  fetch: typeof fetch;
  // can be used to implement third party token caching
  authCache?: GoogleAuthCache;
  // used to set the expiry threshold to refresh the token before expiry (default 1 minute - 60)
  expiryThresholdSeconds?: number;
}
