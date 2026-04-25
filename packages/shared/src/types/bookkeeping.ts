import { z } from 'zod';

// ─── VAT rates (Netherlands BTW) ─────────────────────────────────────────────

export const VatRateSchema = z.enum(['0', '9', '21', 'EXEMPT']);
export type VatRate = z.infer<typeof VatRateSchema>;

// ─── Tax categories ───────────────────────────────────────────────────────────

export const TaxCategorySchema = z.enum([
  // Income
  'INCOME_SALARY',
  'INCOME_FREELANCE',
  'INCOME_INTEREST',
  'INCOME_DIVIDEND',
  'INCOME_OTHER',
  // Business expenses (deductible)
  'BIZ_SOFTWARE',
  'BIZ_HARDWARE',
  'BIZ_OFFICE',
  'BIZ_PROFESSIONAL_SERVICES',
  'BIZ_ADVERTISING',
  'BIZ_TRAVEL',
  'BIZ_MEALS',
  'BIZ_PHONE_INTERNET',
  'BIZ_EDUCATION',
  'BIZ_INSURANCE',
  'BIZ_SUBSCRIPTIONS',
  'BIZ_BANK_FEES',
  'BIZ_OTHER',
  // Personal expenses (non-deductible)
  'PERSONAL_GROCERIES',
  'PERSONAL_DINING',
  'PERSONAL_TRANSPORT',
  'PERSONAL_HEALTH',
  'PERSONAL_HOUSING',
  'PERSONAL_UTILITIES',
  'PERSONAL_ENTERTAINMENT',
  'PERSONAL_CLOTHING',
  'PERSONAL_EDUCATION',
  'PERSONAL_OTHER',
  // Financial / transfers
  'TRANSFER_INTERNAL',
  'TRANSFER_SAVINGS',
  // Tax
  'TAX_PAYMENT',
  'TAX_REFUND',
  // Unclassified
  'UNCATEGORIZED',
]);
export type TaxCategory = z.infer<typeof TaxCategorySchema>;

// ─── Chart of accounts codes ──────────────────────────────────────────────────

export const ACCOUNTS = {
  // Assets
  CHECKING:           '1000',
  SAVINGS:            '1010',
  ACCOUNTS_RECEIVABLE:'1200',
  VAT_RECEIVABLE:     '1400',
  // Liabilities
  ACCOUNTS_PAYABLE:   '2000',
  VAT_PAYABLE:        '2200',
  // Equity
  EQUITY:             '3000',
  RETAINED_EARNINGS:  '3100',
  // Income
  REVENUE:            '4000',
  OTHER_INCOME:       '4100',
  // Expenses
  COST_OF_SALES:      '5000',
  PAYROLL:            '5100',
  SOFTWARE:           '5200',
  HARDWARE:           '5300',
  OFFICE:             '5400',
  PROFESSIONAL_FEES:  '5500',
  ADVERTISING:        '5600',
  TRAVEL:             '5700',
  MEALS_ENT:          '5800',
  PHONE_INTERNET:     '5900',
  EDUCATION:          '6000',
  INSURANCE:          '6100',
  BANK_CHARGES:       '6200',
  GENERAL_EXPENSES:   '6300',
  PERSONAL:           '6400',
  TAX_EXPENSE:        '6500',
} as const;

// ─── Categorization ───────────────────────────────────────────────────────────

export const CategorizationResultSchema = z.object({
  category:       TaxCategorySchema,
  confidence:     z.number().min(0).max(1),
  vatRate:        VatRateSchema,
  isBusinessExpense: z.boolean(),
  deductibilityPct:  z.number().min(0).max(100),
  reviewRequired: z.boolean(),
  reviewReason:   z.string().optional(),
  method:         z.enum(['rule', 'pattern', 'llm', 'manual']),
});
export type CategorizationResult = z.infer<typeof CategorizationResultSchema>;

// ─── Journal entries ──────────────────────────────────────────────────────────

export const JournalEntrySchema = z.object({
  id:               z.string(),
  txId:             z.string(),
  date:             z.string(),
  description:      z.string().optional(),
  debitAccount:     z.string(),
  creditAccount:    z.string(),
  amountCents:      z.number().int(),
  vatAmountCents:   z.number().int().default(0),
  category:         TaxCategorySchema,
  subcategory:      z.string().optional(),
  isBusinessExpense: z.boolean(),
  reviewRequired:   z.boolean(),
  reviewedAt:       z.string().nullable().optional(),
  overriddenBy:     z.string().nullable().optional(),
  createdAt:        z.string(),
});
export type JournalEntry = z.infer<typeof JournalEntrySchema>;

// ─── VAT period ───────────────────────────────────────────────────────────────

export const VatPeriodSchema = z.object({
  id:               z.string(),
  year:             z.number().int(),
  quarter:          z.number().int().min(1).max(4),
  periodStart:      z.string(),
  periodEnd:        z.string(),
  dueDate:          z.string(),
  vatCollected:     z.number(),
  vatPaid:          z.number(),
  vatNetDue:        z.number(),
  status:           z.enum(['OPEN', 'FILED', 'OVERDUE']),
  filedAt:          z.string().nullable().optional(),
});
export type VatPeriod = z.infer<typeof VatPeriodSchema>;

// ─── P&L report ───────────────────────────────────────────────────────────────

export const PLLineItemSchema = z.object({
  category:     z.string(),
  amountEur:    z.number(),
  txCount:      z.number().int(),
});

export const PLReportSchema = z.object({
  periodStart:        z.string(),
  periodEnd:          z.string(),
  totalIncome:        z.number(),
  totalExpenses:      z.number(),
  grossProfit:        z.number(),
  deductibleExpenses: z.number(),
  nonDeductibleExpenses: z.number(),
  netProfit:          z.number(),
  incomeLines:        z.array(PLLineItemSchema),
  expenseLines:       z.array(PLLineItemSchema),
  generatedAt:        z.string(),
});
export type PLReport = z.infer<typeof PLReportSchema>;

// ─── Review queue ─────────────────────────────────────────────────────────────

export const ReviewItemSchema = z.object({
  entryId:         z.string(),
  txId:            z.string(),
  date:            z.string(),
  description:     z.string(),
  amountEur:       z.number(),
  suggestedCategory: TaxCategorySchema,
  confidence:      z.number(),
  reviewReason:    z.string(),
  counterpartyName: z.string().optional(),
});
export type ReviewItem = z.infer<typeof ReviewItemSchema>;

// ─── Receipt match ────────────────────────────────────────────────────────────

export const ReceiptMatchResultSchema = z.object({
  status:         z.enum(['exact', 'fuzzy', 'no_match']),
  txId:           z.string().optional(),
  confidence:     z.number().min(0).max(1),
  matchedOn:      z.string().optional(),
});
export type ReceiptMatchResult = z.infer<typeof ReceiptMatchResultSchema>;

// ─── WebSocket messages ───────────────────────────────────────────────────────

export interface ReviewQueueUpdatePayload {
  pendingCount: number;
}

export interface BooksUpToDatePayload {
  categorizedCount: number;
  uncategorizedCount: number;
}

export interface VatReminderPayload {
  quarter: number;
  year: number;
  daysUntilDue: number;
  dueDate: string;
  netDue: number;
}

export type BookkeepingWSMessage =
  | { type: 'review_queue_update'; payload: ReviewQueueUpdatePayload }
  | { type: 'books_up_to_date';    payload: BooksUpToDatePayload }
  | { type: 'vat_reminder';        payload: VatReminderPayload };
