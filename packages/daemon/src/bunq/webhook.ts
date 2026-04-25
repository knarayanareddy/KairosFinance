import { verifyWebhookSignature, signRequestBody } from './signing.js';
import { type BunqSession } from './auth.js';
import { type BunqClient } from './client.js';
import { BunqWebhookEventSchema, type BunqWebhookEvent } from '@bunqsy/shared';

// ─── IP allowlist ─────────────────────────────────────────────────────────────

const PRODUCTION_CIDR = '185.40.108.0/22';

function ipToUint32(ip: string): number {
  const parts = ip.split('.');
  return parts.reduce((acc, octet) => (acc * 256 + parseInt(octet, 10)), 0) >>> 0;
}

function isInCidr(ip: string, cidr: string): boolean {
  const slashIdx = cidr.indexOf('/');
  const network = cidr.slice(0, slashIdx);
  const prefixLen = parseInt(cidr.slice(slashIdx + 1), 10);
  const mask = prefixLen === 0 ? 0 : (~0 << (32 - prefixLen)) >>> 0;
  return (ipToUint32(ip) & mask) === (ipToUint32(network) & mask);
}

/**
 * Returns true if the remote IP is allowed to deliver webhooks.
 * Sandbox: always true (bunq sandbox callbacks come from variable AWS IPs).
 * Production: enforces bunq's published CIDR 185.40.108.0/22.
 */
export function isAllowedOrigin(remoteIp: string): boolean {
  if (process.env.BUNQ_ENV === 'sandbox') {
    return true;
  }
  return isInCidr(remoteIp, PRODUCTION_CIDR);
}

// ─── Signature validation ─────────────────────────────────────────────────────

/**
 * Validates a bunq webhook request.
 * Checks the X-Bunq-Client-Signature header against the raw body using
 * the bunq server public key stored on the session.
 */
export function validateWebhookRequest(
  rawBody: string,
  headers: Record<string, string>,
  session: BunqSession,
): boolean {
  const signature =
    headers['x-bunq-client-signature'] ?? headers['X-Bunq-Client-Signature'];
  if (!signature) return false;
  return verifyWebhookSignature(rawBody, signature, session.serverPublicKey);
}

// ─── Event parsing ────────────────────────────────────────────────────────────

/**
 * Parses a raw webhook body string into a typed BunqWebhookEvent.
 * Throws ZodError if the body does not match the expected schema.
 */
export function parseWebhookEvent(rawBody: string): BunqWebhookEvent {
  const parsed: unknown = JSON.parse(rawBody);
  return BunqWebhookEventSchema.parse(parsed);
}

// ─── Webhook registration ─────────────────────────────────────────────────────

const WEBHOOK_CATEGORIES = [
  'PAYMENT',
  'MUTATION',
  'CARD_TRANSACTION_SUCCESSFUL',
  'CARD_TRANSACTION_FAILED',
  'DRAFT_PAYMENT',
  'SAVINGS_GOAL_REACHED',
] as const;

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

/**
 * Registers the webhook URL with bunq for all required event categories.
 *
 * Note: This function makes POST calls to the bunq API directly rather than
 * routing through execute.ts. This is intentional — it is a bootstrap /
 * infrastructure operation (not a financial transaction) and is explicitly
 * specified in the CBS (Section 6 Phase 1d). The single-write-gateway
 * constitutional rule governs financial write operations (payments, transfers).
 */
export async function registerWebhookUrl(
  _client: BunqClient,
  session: BunqSession,
  publicUrl: string,
): Promise<void> {
  const baseUrl = getBunqBaseUrl();
  const path = `/user/${session.userId}/notification-filter-url`;

  for (const category of WEBHOOK_CATEGORIES) {
    const bodyObj = {
      notification_delivery_method: 'URL',
      notification_target: publicUrl,
      category,
    };
    const bodyStr = JSON.stringify(bodyObj);
    const signature = signRequestBody(bodyStr, session.keyPair.privateKeyPem);

    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'BunqsyFinance/1.0',
        'X-Bunq-Client-Authentication': session.sessionToken,
        'X-Bunq-Client-Signature': signature,
      },
      body: bodyStr,
    });

    if (!res.ok) {
      const body = await res.text();
      // Log but don't throw — daemon can operate on the 30s heartbeat
      // even if webhook registration fails (e.g., URL already registered)
      console.error(JSON.stringify({
        phase: 'webhook-register',
        category,
        status: res.status,
        body,
      }));
    }
  }
}
