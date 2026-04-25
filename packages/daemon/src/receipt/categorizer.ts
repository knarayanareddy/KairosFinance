import type Database from 'better-sqlite3';
import type { ReceiptData, TransactionRow } from '@bunqsy/shared';
import { updateTransactionCategory } from '../memory/transactions.js';

const AMOUNT_TOLERANCE = 0.05;   // ±5% on amount
const DATE_WINDOW_DAYS = 3;       // receipt date ±3 calendar days

export interface CategorizerResult {
  matched:              boolean;
  matchedTransactionId: string | null;
  insight:              string | null;
}

/**
 * Finds a recent transaction whose debit amount matches the receipt total and
 * whose date is within DATE_WINDOW_DAYS of the receipt date. Updates the
 * transaction's category in the DB if a match is found.
 */
export function categorizeReceipt(
  db: Database.Database,
  receipt: ReceiptData,
): CategorizerResult {
  const receiptDate = parseReceiptDate(receipt.date);
  const from = offsetDate(receiptDate, -DATE_WINDOW_DAYS);
  const to   = offsetDate(receiptDate,  DATE_WINDOW_DAYS + 1); // exclusive upper bound

  const low  = receipt.total * (1 - AMOUNT_TOLERANCE);
  const high = receipt.total * (1 + AMOUNT_TOLERANCE);

  const rows = db
    .prepare(
      `SELECT * FROM transactions
       WHERE amount BETWEEN ? AND ?
         AND created_at >= ?
         AND created_at <  ?
       ORDER BY ABS(amount - ?) ASC
       LIMIT 1`,
    )
    .all(-high, -low, from, to, -receipt.total) as TransactionRow[];

  const match = rows[0] ?? null;

  if (match) {
    updateTransactionCategory(db, match.id, receipt.category);
  }

  const insight = generateInsight(receipt);

  return {
    matched:              match !== null,
    matchedTransactionId: match?.id ?? null,
    insight,
  };
}

// ─── Spending insight heuristic ───────────────────────────────────────────────

interface BadPattern {
  keywords: string[];
  label: string;
}

const BAD_PATTERNS: BadPattern[] = [
  { keywords: ['energy drink', 'red bull', 'monster', 'rockstar', 'bang energy'], label: 'energy drinks' },
  { keywords: ['alcohol', 'beer', 'wine', 'spirits', 'whisky', 'vodka', 'gin', 'lager'], label: 'alcohol' },
  { keywords: ['cigarette', 'tobacco', 'vape', 'e-cig'], label: 'tobacco/vaping' },
  { keywords: ['fast food', 'mcdonalds', "mcdonald's", 'burger king', 'kfc', 'subway', 'dominos', "domino's"], label: 'fast food' },
  { keywords: ['candy', 'sweets', 'chocolate', 'crisps', 'chips', 'snacks'], label: 'snacks/sweets' },
  { keywords: ['lottery', 'scratch card', 'gambling', 'bet', 'casino'], label: 'gambling' },
];

function generateInsight(receipt: ReceiptData): string | null {
  if (receipt.lineItems.length === 0) return null;
  if (receipt.total <= 0) return null;

  for (const pattern of BAD_PATTERNS) {
    const matchingItems = receipt.lineItems.filter(item =>
      pattern.keywords.some(kw =>
        item.description.toLowerCase().includes(kw.toLowerCase()),
      ),
    );

    if (matchingItems.length === 0) continue;

    const patternTotal = matchingItems.reduce((s, i) => s + i.total, 0);
    const fraction = patternTotal / receipt.total;

    if (fraction >= 0.30) {
      const pct = Math.round(fraction * 100);
      return `${pct}% of this ${receipt.category} receipt (€${patternTotal.toFixed(2)}) went on ${pattern.label}. ` +
        `That's ${pct >= 60 ? 'a significant portion of your spending' : 'worth keeping an eye on'}.`;
    }
  }

  // Generic large single-item check
  const largestItem = receipt.lineItems.reduce(
    (max, item) => item.total > max.total ? item : max,
    receipt.lineItems[0]!,
  );
  const largestFraction = largestItem.total / receipt.total;

  if (largestFraction >= 0.75 && receipt.lineItems.length > 1) {
    return `"${largestItem.description}" made up ${Math.round(largestFraction * 100)}% ` +
      `of this receipt (€${largestItem.total.toFixed(2)}). Is this a regular purchase?`;
  }

  return null;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function parseReceiptDate(dateStr: string): Date {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

function offsetDate(base: Date, days: number): string {
  const d = new Date(base.getTime() + days * 86_400_000);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD for SQLite BETWEEN
}
