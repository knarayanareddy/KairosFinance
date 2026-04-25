/**
 * Insert or replace a transaction by its bunq payment ID.
 * Safe to call on every heartbeat sync — will not duplicate rows.
 */
export function upsertTransaction(db, tx) {
    db.prepare(`
    INSERT INTO transactions
      (id, bunq_account_id, amount, currency, counterparty_name, counterparty_iban,
       description, category, is_recurring, created_at, synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      category    = excluded.category,
      is_recurring = excluded.is_recurring,
      synced_at   = datetime('now')
  `).run(tx.id, tx.bunqAccountId, tx.amount, tx.currency ?? 'EUR', tx.counterpartyName ?? null, tx.counterpartyIban ?? null, tx.description ?? null, tx.category ?? null, tx.isRecurring ? 1 : 0, tx.createdAt);
}
/**
 * Returns the most recent transactions across all accounts or a specific account.
 */
export function getRecentTransactions(db, count = 50, accountId) {
    if (accountId !== undefined) {
        return db
            .prepare(`SELECT * FROM transactions
         WHERE bunq_account_id = ?
         ORDER BY created_at DESC
         LIMIT ?`)
            .all(accountId, count);
    }
    return db
        .prepare(`SELECT * FROM transactions ORDER BY created_at DESC LIMIT ?`)
        .all(count);
}
/**
 * Returns transactions for a specific account ordered newest-first.
 */
export function getTransactionsByAccount(db, accountId, count = 100) {
    return db
        .prepare(`SELECT * FROM transactions
       WHERE bunq_account_id = ?
       ORDER BY created_at DESC
       LIMIT ?`)
        .all(accountId, count);
}
/**
 * Returns transactions created between two ISO datetime strings.
 * Optionally scoped to a single account.
 */
export function getTransactionsBetween(db, fromDate, toDate, accountId) {
    if (accountId !== undefined) {
        return db
            .prepare(`SELECT * FROM transactions
         WHERE bunq_account_id = ?
           AND created_at >= ?
           AND created_at <= ?
         ORDER BY created_at DESC`)
            .all(accountId, fromDate, toDate);
    }
    return db
        .prepare(`SELECT * FROM transactions
       WHERE created_at >= ? AND created_at <= ?
       ORDER BY created_at DESC`)
        .all(fromDate, toDate);
}
/**
 * Returns the sum of outgoing transaction amounts (negative amounts) for today.
 * Used by the velocity analyzer and BUNQSY Score computation.
 */
export function getDailySpend(db, accountId) {
    const row = db
        .prepare(`SELECT COALESCE(SUM(ABS(amount)), 0) AS total
       FROM transactions
       WHERE bunq_account_id = ?
         AND amount < 0
         AND created_at >= datetime('now', 'start of day')`)
        .get(accountId);
    return row.total;
}
/**
 * Returns the sum of outgoing transaction amounts for the past 7 days.
 */
export function getWeeklySpend(db, accountId) {
    const row = db
        .prepare(`SELECT COALESCE(SUM(ABS(amount)), 0) AS total
       FROM transactions
       WHERE bunq_account_id = ?
         AND amount < 0
         AND created_at >= datetime('now', '-7 days')`)
        .get(accountId);
    return row.total;
}
/**
 * Returns the average daily spend over the past N days.
 * Used to establish a baseline for the velocity analyzer.
 */
export function getAverageDailySpend(db, accountId, days = 30) {
    const row = db
        .prepare(`SELECT COALESCE(SUM(ABS(amount)), 0) / ? AS avg_daily
       FROM transactions
       WHERE bunq_account_id = ?
         AND amount < 0
         AND created_at >= datetime('now', ? || ' days')`)
        .get(days, accountId, `-${days}`);
    return row.avg_daily;
}
/**
 * Updates the category of a transaction — used by the receipt categoriser.
 */
export function updateTransactionCategory(db, transactionId, category) {
    db.prepare(`UPDATE transactions SET category = ?, synced_at = datetime('now') WHERE id = ?`).run(category, transactionId);
}
