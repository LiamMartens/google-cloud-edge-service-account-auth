# google-cloud-edge-service-account-auth

This library was created for use in Edge Runtimes (such as Cloudflare Workers and Vercel Edge) to interact with the Google Cloud APIs using a service account JSON.

## Usage

```js
import { GoogleAuthClient } from 'google-cloud-edge-service-account-auth';

const authClient = new GoogleAuthClient(
  {
    client_email: '...',
    private_key: '...',
  },
  config
);

const { access_token } = await authClient.authenticate([
  'https://www.googleapis.com/auth/devstorage.full_control',
]);

await fetch('https://storage.googleapis.com/storage/v1/b/bucketName/o/', {
  headers: [['Authorization', `Bearer ${access_token}`]],
});
```

## Configuration Options

The 2nd constructor argument accepts a few configuration options as explained below:

| name                     | description                                                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `fetch`                  | Can be used to override the `fetch` implementation                                                                                        |
| `authCache`              | Should implement a `GoogleAuthCache` instance (exported by the library). Can be used to cache tokens in a third party library or service. |
| `expiryThresholdSeconds` | Used to determine when to refresh tokens (defaults to `60`)                                                                               |
