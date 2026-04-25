import { z } from 'zod';
import { signRequestBody } from './signing.js';
import { refreshSessionIfNeeded, type BunqSession } from './auth.js';
import {
  MonetaryAccountBankSchema,
  MonetaryAccountListResponseSchema,
  PaymentSchema,
  PaymentListResponseSchema,
  CardSchema,
  CardListResponseSchema,
  ScheduledPaymentSchema,
  ScheduledPaymentListResponseSchema,
  type MonetaryAccountWrapperType,
  type TaggedMonetaryAccount,
  type Payment,
  type Card,
  type ScheduledPayment,
} from '@bunqsy/shared';

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

function extractAccountFromItem(item: unknown): TaggedMonetaryAccount {
  const wrapperKeys: MonetaryAccountWrapperType[] = [
    'MonetaryAccountBank',
    'MonetaryAccountSavings',
    'MonetaryAccountJoint',
  ];
  for (const key of wrapperKeys) {
    if (item !== null && typeof item === 'object' && key in item) {
      const account = MonetaryAccountBankSchema.parse((item as Record<string, unknown>)[key]);
      return { ...account, _wrapperType: key };
    }
  }
  throw new Error('Unknown monetary account type in response');
}

function extractCardFromItem(item: unknown): Card {
  for (const key of ['CardDebit', 'CardCredit']) {
    if (item !== null && typeof item === 'object' && key in item) {
      return CardSchema.parse((item as Record<string, unknown>)[key]);
    }
  }
  throw new Error('Unknown card type in response');
}

export class BunqClient {
  private session: BunqSession;

  constructor(session: BunqSession) {
    this.session = session;
  }

  getSession(): BunqSession {
    return this.session;
  }

  async get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    this.session = await refreshSessionIfNeeded(this.session);

    const baseUrl = getBunqBaseUrl();
    // bunq requires signing on all requests, including GETs — sign empty body
    const signature = signRequestBody('', this.session.keyPair.privateKeyPem);

    const res = await fetch(`${baseUrl}${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'BunqsyFinance/1.0',
        'X-Bunq-Client-Authentication': this.session.sessionToken,
        'X-Bunq-Client-Signature': signature,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        JSON.stringify({ phase: 'client', path, status: res.status, body }),
      );
    }

    const raw: unknown = await res.json();
    const result = schema.safeParse(raw);
    if (!result.success) {
      throw new Error(
        JSON.stringify({ phase: 'client', error: 'bunq contract mismatch', path, issues: result.error.issues }),
      );
    }
    return result.data;
  }

  async getAccounts(): Promise<TaggedMonetaryAccount[]> {
    const data = await this.get(
      `/user/${this.session.userId}/monetary-account`,
      MonetaryAccountListResponseSchema,
    );
    return data.Response.map(extractAccountFromItem);
  }

  async getTransactions(
    accountId: number,
    count: number = 50,
    newerId?: number,
  ): Promise<Payment[]> {
    let path = `/user/${this.session.userId}/monetary-account/${accountId}/payment?count=${count}`;
    if (newerId !== undefined) {
      path += `&newer_id=${newerId}`;
    }
    const data = await this.get(path, PaymentListResponseSchema);
    return data.Response.map((item) =>
      PaymentSchema.parse((item as Record<string, unknown>)['Payment']),
    );
  }

  async getCards(): Promise<Card[]> {
    const data = await this.get(
      `/user/${this.session.userId}/card`,
      CardListResponseSchema,
    );
    return data.Response.map(extractCardFromItem);
  }

  async getScheduledPayments(accountId: number): Promise<ScheduledPayment[]> {
    const data = await this.get(
      `/user/${this.session.userId}/monetary-account/${accountId}/schedule`,
      ScheduledPaymentListResponseSchema,
    );
    return data.Response.map((item) =>
      ScheduledPaymentSchema.parse((item as Record<string, unknown>)['ScheduledPayment']),
    );
  }
}
