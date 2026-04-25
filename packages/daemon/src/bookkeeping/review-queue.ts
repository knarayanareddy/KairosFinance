import { v4 as uuid } from 'uuid';
import type Database from 'better-sqlite3';
import type { ReviewItem, TaxCategory } from '@bunqsy/shared';
import { TaxCategorySchema } from '@bunqsy/shared';

interface ReviewRow {
  id: string;
  tx_id: string;
  date: string;
  description: string | null;
  amount_cents: number;
  category: string;
  review_reason: string | null;
  counterparty_name: string | null;
  confidence: number | null;
}

export function getReviewQueue(db: Database.Database): ReviewItem[] {
  const rows = db.prepare(`
    SELECT j.id, j.tx_id, j.date, j.description, j.amount_cents, j.category,
           j.review_reason, t.counterparty_name,
           0.5 as confidence
    FROM journal_entries j
    LEFT JOIN transactions t ON t.id = j.tx_id
    WHERE j.review_required = 1 AND j.reviewed_at IS NULL
    ORDER BY j.date DESC
    LIMIT 100
  `).all() as ReviewRow[];

  return rows.map(r => ({
    entryId:           r.id,
    txId:              r.tx_id,
    date:              r.date,
    description:       r.description ?? r.counterparty_name ?? 'Unknown',
    amountEur:         r.amount_cents / 100,
    suggestedCategory: (TaxCategorySchema.safeParse(r.category).success
      ? r.category : 'UNCATEGORIZED') as TaxCategory,
    confidence:        r.confidence ?? 0.5,
    reviewReason:      r.review_reason ?? 'Manual review required',
    counterpartyName:  r.counterparty_name ?? undefined,
  }));
}

export function approveReviewItem(
  db: Database.Database,
  entryId: string,
  categoryOverride?: TaxCategory,
): boolean {
  const entry = db.prepare(`SELECT * FROM journal_entries WHERE id = ?`).get(entryId) as
    | { tx_id: string; category: string; deductibility_pct: number } | undefined;

  if (!entry) return false;

  if (categoryOverride && categoryOverride !== entry.category) {
    // Record the correction for the feedback loop
    const txRow = db.prepare(
      `SELECT counterparty_name FROM transactions WHERE id = ?`,
    ).get(entry.tx_id) as { counterparty_name: string | null } | undefined;

    const counterparty = txRow?.counterparty_name ?? 'unknown';
    db.prepare(`
      INSERT INTO categorization_corrections (id, counterparty, old_category, new_category)
      VALUES (?, ?, ?, ?)
    `).run(uuid(), counterparty, entry.category, categoryOverride);

    // Update the journal entry
    const isBusinessExpense = categoryOverride.startsWith('BIZ_') || categoryOverride.startsWith('INCOME_');
    const deductibilityPct  = categoryOverride === 'BIZ_MEALS' ? 80
      : isBusinessExpense ? 100 : 0;

    db.prepare(`
      UPDATE journal_entries
      SET category = ?, is_business_expense = ?, deductibility_pct = ?,
          reviewed_at = datetime('now'), overridden_by = 'user'
      WHERE id = ?
    `).run(categoryOverride, isBusinessExpense ? 1 : 0, deductibilityPct, entryId);
  } else {
    db.prepare(`
      UPDATE journal_entries
      SET reviewed_at = datetime('now')
      WHERE id = ?
    `).run(entryId);
  }

  return true;
}

export function bulkApproveQueue(db: Database.Database): number {
  const result = db.prepare(`
    UPDATE journal_entries
    SET reviewed_at = datetime('now')
    WHERE review_required = 1 AND reviewed_at IS NULL
  `).run();
  return result.changes;
}

export function getPendingReviewCount(db: Database.Database): number {
  const row = db.prepare(`
    SELECT COUNT(*) as cnt FROM journal_entries
    WHERE review_required = 1 AND reviewed_at IS NULL
  `).get() as { cnt: number };
  return row.cnt;
}
