import type Database from 'better-sqlite3';
import type { TransactionRow } from '@bunqsy/shared';

export interface UpsertTransactionInput {
  id: string;
  bunqAccountId: number;
  amount: number;
  currency?: string;
  counterpartyName?: string | null;
  counterpartyIban?: string | null;
  description?: string | null;
  category?: string | null;
  isRecurring?: boolean;
  createdAt: string;
}

/**
 * Insert or replace a transaction by its bunq payment ID.
 * Safe to call on every heartbeat sync — will not duplicate rows.
 */
export function upsertTransaction(
  db: Database.Database,
  tx: UpsertTransactionInput,
): void {
  db.prepare(`
    INSERT INTO transactions
      (id, bunq_account_id, amount, currency, counterparty_name, counterparty_iban,
       description, category, is_recurring, created_at, synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      category    = excluded.category,
      is_recurring = excluded.is_recurring,
      synced_at   = datetime('now')
  `).run(
    tx.id,
    tx.bunqAccountId,
    tx.amount,
    tx.currency ?? 'EUR',
    tx.counterpartyName ?? null,
    tx.counterpartyIban ?? null,
    tx.description ?? null,
    tx.category ?? null,
    tx.isRecurring ? 1 : 0,
    tx.createdAt,
  );
}

/**
 * Returns the most recent transactions across all accounts or a specific account.
 */
export function getRecentTransactions(
  db: Database.Database,
  count: number = 50,
  accountId?: number,
): TransactionRow[] {
  if (accountId !== undefined) {
    return db
      .prepare(
        `SELECT * FROM transactions
         WHERE bunq_account_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .all(accountId, count) as TransactionRow[];
  }
  return db
    .prepare(`SELECT * FROM transactions ORDER BY created_at DESC LIMIT ?`)
    .all(count) as TransactionRow[];
}

/**
 * Returns transactions for a specific account ordered newest-first.
 */
export function getTransactionsByAccount(
  db: Database.Database,
  accountId: number,
  count: number = 100,
): TransactionRow[] {
  return db
    .prepare(
      `SELECT * FROM transactions
       WHERE bunq_account_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(accountId, count) as TransactionRow[];
}

/**
 * Returns transactions created between two ISO datetime strings.
 * Optionally scoped to a single account.
 */
export function getTransactionsBetween(
  db: Database.Database,
  fromDate: string,
  toDate: string,
  accountId?: number,
): TransactionRow[] {
  if (accountId !== undefined) {
    return db
      .prepare(
        `SELECT * FROM transactions
         WHERE bunq_account_id = ?
           AND created_at >= ?
           AND created_at <= ?
         ORDER BY created_at DESC`,
      )
      .all(accountId, fromDate, toDate) as TransactionRow[];
  }
  return db
    .prepare(
      `SELECT * FROM transactions
       WHERE created_at >= ? AND created_at <= ?
       ORDER BY created_at DESC`,
    )
    .all(fromDate, toDate) as TransactionRow[];
}

/**
 * Returns the sum of outgoing transaction amounts (negative amounts) for today.
 * Used by the velocity analyzer and BUNQSY Score computation.
 */
export function getDailySpend(
  db: Database.Database,
  accountId: number,
): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(ABS(amount)), 0) AS total
       FROM transactions
       WHERE bunq_account_id = ?
         AND amount < 0
         AND created_at >= datetime('now', 'start of day')`,
    )
    .get(accountId) as { total: number };
  return row.total;
}

/**
 * Returns the sum of outgoing transaction amounts for the past 7 days.
 */
export function getWeeklySpend(
  db: Database.Database,
  accountId: number,
): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(ABS(amount)), 0) AS total
       FROM transactions
       WHERE bunq_account_id = ?
         AND amount < 0
         AND created_at >= datetime('now', '-7 days')`,
    )
    .get(accountId) as { total: number };
  return row.total;
}

/**
 * Returns the average daily spend over the past N days.
 * Used to establish a baseline for the velocity analyzer.
 */
export function getAverageDailySpend(
  db: Database.Database,
  accountId: number,
  days: number = 30,
): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(ABS(amount)), 0) / ? AS avg_daily
       FROM transactions
       WHERE bunq_account_id = ?
         AND amount < 0
         AND created_at >= datetime('now', ? || ' days')`,
    )
    .get(days, accountId, `-${days}`) as { avg_daily: number };
  return row.avg_daily;
}

/**
 * Updates the category of a transaction — used by the receipt categoriser.
 */
export function updateTransactionCategory(
  db: Database.Database,
  transactionId: string,
  category: string,
): void {
  db.prepare(
    `UPDATE transactions SET category = ?, synced_at = datetime('now') WHERE id = ?`,
  ).run(category, transactionId);
}
