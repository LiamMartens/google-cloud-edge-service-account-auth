import * as base64 from 'js-base64';
import { ServiceAccountJSON } from './types/service-account-json.js';
import { AuthClientConfig } from './types/auth-client-config.js';
import { AuthError } from './errors/auth-error.js';
import { GoogleAuthCache } from './google-auth-cache.js';
import { AuthEntry } from './types/auth-entry.js';

export const GOOGLE_TOKEN_URL = 'https://www.googleapis.com/oauth2/v4/token';

export class GoogleAuthClient {
  private fetch: typeof fetch;
  private account: ServiceAccountJSON;
  private cache: GoogleAuthCache;
  private expiryThresholdSeconds: number;

  constructor(account: ServiceAccountJSON, config: AuthClientConfig) {
    this.account = account;
    this.fetch = config.fetch;
    this.cache = new GoogleAuthCache();
    this.expiryThresholdSeconds = config?.expiryThresholdSeconds ?? 60;
  }

  /**
   * Extracts the private key from the service account JSON for signing
   */
  public async extractKey() {
    const pem = this.account.private_key.replace(/\n/g, '');
    const pemHeader = '-----BEGIN PRIVATE KEY-----';
    const pemFooter = '-----END PRIVATE KEY-----';
    const pemContents = pem.substring(
      pemHeader.length,
      pem.length - pemFooter.length
    );
    const buffer = base64.toUint8Array(pemContents);
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      buffer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: { name: 'SHA-256' },
      },
      false,
      ['sign']
    );
    return privateKey;
  }

  /**
   * Generates and signs a JWT from the service account JSON
   */
  public async toJWT(
    scopes: string[] = [],
    audience: string = 'https://www.googleapis.com/oauth2/v4/token'
  ) {
    const privateKey = await this.extractKey();
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 60 * 30; // 30 minutes in seconds

    const header = {
      typ: 'JWT',
      alg: 'RS256',
      kid: this.account.private_key_id,
    };

    const payload = {
      iss: this.account.client_email,
      sub: this.account.client_email,
      aud: audience,
      exp,
      iat,
      ...(scopes.length ? { scope: scopes.join(' ') } : {}),
    };

    const base64header = base64.encodeURI(JSON.stringify(header));
    const base64payload = base64.encodeURI(JSON.stringify(payload));
    const signature = await crypto.subtle.sign(
      {
        name: 'RSASSA-PKCS1-v1_5',
      },
      privateKey,
      new TextEncoder().encode(`${base64header}.${base64payload}`)
    );
    return `${base64header}.${base64payload}.${base64.fromUint8Array(
      new Uint8Array(signature),
      true
    )}`;
  }

  public async authenticate(scopes: string[] = []): Promise<AuthEntry> {
    const cacheObject = await this.cache.get(this.account.client_email, scopes);
    if (cacheObject) {
      const thresholdDate = new Date(
        +cacheObject.expires - this.expiryThresholdSeconds * 1000
      );
      const canUseToken = new Date() < thresholdDate;
      if (canUseToken) return cacheObject;
    }

    const jwt = await this.toJWT(scopes, GOOGLE_TOKEN_URL);
    const tokenResponse = await this.fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      body: JSON.stringify({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    const data = await tokenResponse.json();

    if (typeof data !== 'object' || !data) {
      throw new AuthError('failed', tokenResponse.status, { data });
    }

    if (
      Object.prototype.hasOwnProperty.call(data, 'error') &&
      typeof data.error === 'string'
    ) {
      throw new AuthError(data.error, tokenResponse.status, data);
    }

    // if there is no error and data is present we can assume the call was successfull
    const result = data as {
      access_token: string;
      expires_in: number;
      token_type: 'Bearer';
    };

    const obj = {
      token: result.access_token,
      expires: new Date(Date.now() + result.expires_in * 1000),
      expires_in: result.expires_in,
    };
    await this.cache.set(this.account.client_email, scopes, obj);

    return obj;
  }
}
