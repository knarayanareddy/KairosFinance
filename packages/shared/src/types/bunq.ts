import { z } from 'zod';

// ─── Primitives ──────────────────────────────────────────────────────────────

export const BunqAmountSchema = z.object({
  value: z.string(),
  currency: z.string(),
}).passthrough();
export type BunqAmount = z.infer<typeof BunqAmountSchema>;

export const BunqAliasSchema = z.object({
  iban: z.string().optional(),
  display_name: z.string().optional(),
  name: z.string().optional(),
  type: z.string().optional(),
}).passthrough();
export type BunqAlias = z.infer<typeof BunqAliasSchema>;

// ─── Auth response shapes ─────────────────────────────────────────────────────

export const BunqTokenSchema = z.object({
  id: z.number(),
  token: z.string(),
  created: z.string(),
  updated: z.string(),
}).passthrough();
export type BunqToken = z.infer<typeof BunqTokenSchema>;

export const BunqServerPublicKeySchema = z.object({
  server_public_key: z.string(),
}).passthrough();
export type BunqServerPublicKey = z.infer<typeof BunqServerPublicKeySchema>;

export const BunqIdSchema = z.object({
  id: z.number(),
}).passthrough();

// Installation response: [{ Id }, { Token }, { ServerPublicKey }]
export const BunqInstallationResponseSchema = z.object({
  Response: z.array(
    z.union([
      z.object({ Id: BunqIdSchema }).passthrough(),
      z.object({ Token: BunqTokenSchema }).passthrough(),
      z.object({ ServerPublicKey: BunqServerPublicKeySchema }).passthrough(),
    ])
  ),
});
export type BunqInstallationResponse = z.infer<typeof BunqInstallationResponseSchema>;

// Device-server response: [{ Id }]
export const BunqDeviceServerResponseSchema = z.object({
  Response: z.array(z.object({ Id: BunqIdSchema }).passthrough()),
});

// Session-server response: [{ Id }, { Token }, { UserPerson | UserCompany | UserApiKey }]
const BunqUserSchema = z.object({ id: z.number() }).passthrough();

export const BunqSessionResponseSchema = z.object({
  Response: z.array(
    z.union([
      z.object({ Id: BunqIdSchema }).passthrough(),
      z.object({ Token: BunqTokenSchema }).passthrough(),
      z.object({ UserPerson: BunqUserSchema }).passthrough(),
      z.object({ UserCompany: BunqUserSchema }).passthrough(),
      z.object({ UserApiKey: BunqUserSchema }).passthrough(),
    ])
  ),
});
export type BunqSessionResponse = z.infer<typeof BunqSessionResponseSchema>;

// ─── Monetary Account ─────────────────────────────────────────────────────────

export const MonetaryAccountBankSchema = z.object({
  id: z.number(),
  created: z.string().optional(),
  updated: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  currency: z.string().optional(),
  balance: BunqAmountSchema.optional(),
}).passthrough();
export type MonetaryAccount = z.infer<typeof MonetaryAccountBankSchema>;

export type MonetaryAccountWrapperType =
  | 'MonetaryAccountBank'
  | 'MonetaryAccountSavings'
  | 'MonetaryAccountJoint';

/** MonetaryAccount with the bunq wrapper key preserved for type discrimination */
export interface TaggedMonetaryAccount extends MonetaryAccount {
  _wrapperType: MonetaryAccountWrapperType;
}

export const MonetaryAccountResponseItemSchema = z.union([
  z.object({ MonetaryAccountBank: MonetaryAccountBankSchema }).passthrough(),
  z.object({ MonetaryAccountSavings: MonetaryAccountBankSchema }).passthrough(),
  z.object({ MonetaryAccountJoint: MonetaryAccountBankSchema }).passthrough(),
]);

export const MonetaryAccountListResponseSchema = z.object({
  Response: z.array(MonetaryAccountResponseItemSchema),
});

// ─── Payment ──────────────────────────────────────────────────────────────────

export const PaymentSchema = z.object({
  id: z.number(),
  created: z.string(),
  updated: z.string().optional(),
  amount: BunqAmountSchema,
  description: z.string().optional(),
  type: z.string().optional(),
  counterparty_alias: BunqAliasSchema.optional(),
  alias: BunqAliasSchema.optional(),
}).passthrough();
export type Payment = z.infer<typeof PaymentSchema>;

export const PaymentListResponseSchema = z.object({
  Response: z.array(z.object({ Payment: PaymentSchema }).passthrough()),
});

// ─── Card ─────────────────────────────────────────────────────────────────────

export const CardSchema = z.object({
  id: z.number(),
  created: z.string().optional(),
  updated: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  label_monetary_account_current: BunqAliasSchema.optional(),
}).passthrough();
export type Card = z.infer<typeof CardSchema>;

export const CardListResponseSchema = z.object({
  Response: z.array(
    z.union([
      z.object({ CardDebit: CardSchema }).passthrough(),
      z.object({ CardCredit: CardSchema }).passthrough(),
    ])
  ),
});

// ─── Scheduled Payment ────────────────────────────────────────────────────────

export const ScheduledPaymentSchema = z.object({
  id: z.number(),
  created: z.string().optional(),
  updated: z.string().optional(),
  payment: z.object({
    amount: BunqAmountSchema,
    counterparty_alias: BunqAliasSchema.optional(),
    description: z.string().optional(),
  }).passthrough().optional(),
  schedule: z.object({
    time_start: z.string().optional(),
    recurrence_unit: z.string().optional(),
    recurrence_size: z.number().optional(),
  }).passthrough().optional(),
}).passthrough();
export type ScheduledPayment = z.infer<typeof ScheduledPaymentSchema>;

export const ScheduledPaymentListResponseSchema = z.object({
  Response: z.array(z.object({ ScheduledPayment: ScheduledPaymentSchema }).passthrough()),
});

// ─── Multi-account intelligence (Phase 14) ───────────────────────────────────

export type AccountClassification = 'primary' | 'savings' | 'joint' | 'other';

/**
 * Classified, enriched view of a single monetary account.
 * Built once per heartbeat tick; consumed by oracle agents, jars agent,
 * score computation, and the REST /api/accounts endpoint.
 */
export interface AccountSummary {
  account:          TaggedMonetaryAccount;
  classification:   AccountClassification;
  balanceCents:     number;
  label:            string;
  currency:         string;
  recentTxCount:    number;        // transactions in the last 7 days
  unusualSpendFlag: boolean;       // joint account: large outflow detected in 24 h
  goalLinked:       boolean;       // savings account: linked to a goal
  goalProgress:     number | null; // 0–1 if goalLinked, else null
}

// ─── Webhook Event ────────────────────────────────────────────────────────────

export const BunqWebhookEventSchema = z.object({
  NotificationUrl: z.object({
    event_type: z.string(),
    object: z.record(z.string(), z.unknown()),
    id: z.number().optional(),
  }).passthrough(),
});
export type BunqWebhookEvent = z.infer<typeof BunqWebhookEventSchema>;
