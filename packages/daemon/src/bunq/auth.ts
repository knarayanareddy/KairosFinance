import { generateKeyPair, signRequestBody, type SigningKeyPair } from './signing.js';
import {
  BunqInstallationResponseSchema,
  BunqSessionResponseSchema,
  type BunqToken,
} from '@bunqsy/shared';

export interface BunqSession {
  installationToken: string;
  sessionToken: string;
  userId: number;
  keyPair: SigningKeyPair;
  expiresAt: Date;
  /** bunq server public key — received during /installation, used to verify webhook signatures */
  serverPublicKey: string;
}

function getBunqBaseUrl(): string {
  const env = process.env.BUNQ_ENV;
  if (env === 'production') {
    const url = process.env.BUNQ_PRODUCTION_URL;
    if (!url) throw new Error('BUNQ_PRODUCTION_URL is not set');
    return url;
  }
  const url = process.env.BUNQ_SANDBOX_URL;
  if (!url) throw new Error('BUNQ_SANDBOX_URL is not set');
  return url;
}

function buildAuthError(step: string, status: number, body: string): Error {
  return new Error(JSON.stringify({ phase: 'auth', step, status, body }));
}

async function postUnsigned(
  baseUrl: string,
  path: string,
  bodyObj: unknown,
): Promise<unknown> {
  const bodyStr = JSON.stringify(bodyObj);
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: bodyStr,
  });
  const text = await res.text();
  if (!res.ok) throw buildAuthError(path, res.status, text);
  return JSON.parse(text);
}

async function postSigned(
  baseUrl: string,
  path: string,
  bodyObj: unknown,
  authToken: string,
  privateKeyPem: string,
): Promise<unknown> {
  const bodyStr = JSON.stringify(bodyObj);
  const signature = signRequestBody(bodyStr, privateKeyPem);
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Bunq-Client-Authentication': authToken,
      'X-Bunq-Client-Signature': signature,
    },
    body: bodyStr,
  });
  const text = await res.text();
  if (!res.ok) throw buildAuthError(path, res.status, text);
  return JSON.parse(text);
}

function extractToken(items: unknown[]): BunqToken | undefined {
  for (const item of items) {
    if (item !== null && typeof item === 'object' && 'Token' in item) {
      const t = (item as { Token: BunqToken }).Token;
      return t;
    }
  }
  return undefined;
}

function extractServerPublicKey(items: unknown[]): string | undefined {
  for (const item of items) {
    if (item !== null && typeof item === 'object' && 'ServerPublicKey' in item) {
      const spk = (item as { ServerPublicKey: { server_public_key: string } }).ServerPublicKey;
      return spk.server_public_key;
    }
  }
  return undefined;
}

function extractUserId(items: unknown[]): number | undefined {
  for (const item of items) {
    if (item !== null && typeof item === 'object') {
      for (const key of ['UserPerson', 'UserCompany', 'UserApiKey'] as const) {
        if (key in item) {
          const user = (item as Record<string, { id: number }>)[key];
          return user?.id;
        }
      }
    }
  }
  return undefined;
}

export async function createSession(apiKey: string): Promise<BunqSession> {
  const baseUrl = getBunqBaseUrl();
  const keyPair = generateKeyPair();

  // Step 1: Installation
  const rawInstall = await postUnsigned(baseUrl, '/installation', {
    client_public_key: keyPair.publicKeyPem,
  });
  const installData = BunqInstallationResponseSchema.parse(rawInstall);
  const installToken = extractToken(installData.Response);
  const serverPublicKey = extractServerPublicKey(installData.Response);

  if (!installToken) {
    throw new Error(JSON.stringify({ phase: 'auth', step: 'installation', error: 'no token in response' }));
  }
  if (!serverPublicKey) {
    throw new Error(JSON.stringify({ phase: 'auth', step: 'installation', error: 'no server public key in response' }));
  }

  // Step 2: Device-server
  const deviceBody = {
    description: process.env.BUNQ_DEVICE_DESCRIPTION ?? 'BunqsyFinance-Dev',
    secret: apiKey,
    permitted_ips: ['*'],
  };
  await postSigned(baseUrl, '/device-server', deviceBody, installToken.token, keyPair.privateKeyPem);

  // Step 3: Session-server
  const rawSession = await postSigned(
    baseUrl,
    '/session-server',
    { secret: apiKey },
    installToken.token,
    keyPair.privateKeyPem,
  );
  const sessionData = BunqSessionResponseSchema.parse(rawSession);

  const sessionToken = extractToken(sessionData.Response);
  const userId = extractUserId(sessionData.Response);

  if (!sessionToken || userId === undefined) {
    throw new Error(JSON.stringify({ phase: 'auth', step: 'session-server', error: 'missing token or userId' }));
  }

  // bunq sessions expire in 1 hour
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  return {
    installationToken: installToken.token,
    sessionToken: sessionToken.token,
    userId,
    keyPair,
    expiresAt,
    serverPublicKey,
  };
}

export async function refreshSessionIfNeeded(session: BunqSession): Promise<BunqSession> {
  const thirtyMinutesMs = 30 * 60 * 1000;
  const timeUntilExpiry = session.expiresAt.getTime() - Date.now();
  if (timeUntilExpiry < thirtyMinutesMs) {
    const apiKey = process.env.BUNQ_API_KEY;
    if (!apiKey) throw new Error('BUNQ_API_KEY is not set');
    return createSession(apiKey);
  }
  return session;
}
