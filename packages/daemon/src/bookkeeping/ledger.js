import { v4 as uuid } from 'uuid';
import { ACCOUNTS } from '@bunqsy/shared';
function debitCreditAccounts(amountEur, result) {
    const isIncome = result.category.startsWith('INCOME_') ||
        result.category === 'TAX_REFUND';
    const isTransfer = result.category.startsWith('TRANSFER_');
    if (amountEur >= 0) {
        // Money IN
        if (isIncome) {
            return { debitAccount: ACCOUNTS.CHECKING, creditAccount: ACCOUNTS.REVENUE };
        }
        if (isTransfer) {
            return { debitAccount: ACCOUNTS.SAVINGS, creditAccount: ACCOUNTS.CHECKING };
        }
        return { debitAccount: ACCOUNTS.CHECKING, creditAccount: ACCOUNTS.OTHER_INCOME };
    }
    else {
        // Money OUT
        const expenseAccount = categoryToExpenseAccount(result.category);
        if (result.category === 'TAX_PAYMENT') {
            return { debitAccount: ACCOUNTS.TAX_EXPENSE, creditAccount: ACCOUNTS.CHECKING };
        }
        if (isTransfer) {
            return { debitAccount: ACCOUNTS.SAVINGS, creditAccount: ACCOUNTS.CHECKING };
        }
        return { debitAccount: expenseAccount, creditAccount: ACCOUNTS.CHECKING };
    }
}
function categoryToExpenseAccount(category) {
    const map = {
        BIZ_SOFTWARE: ACCOUNTS.SOFTWARE,
        BIZ_HARDWARE: ACCOUNTS.HARDWARE,
        BIZ_OFFICE: ACCOUNTS.OFFICE,
        BIZ_PROFESSIONAL_SERVICES: ACCOUNTS.PROFESSIONAL_FEES,
        BIZ_ADVERTISING: ACCOUNTS.ADVERTISING,
        BIZ_TRAVEL: ACCOUNTS.TRAVEL,
        BIZ_MEALS: ACCOUNTS.MEALS_ENT,
        BIZ_PHONE_INTERNET: ACCOUNTS.PHONE_INTERNET,
        BIZ_EDUCATION: ACCOUNTS.EDUCATION,
        BIZ_INSURANCE: ACCOUNTS.INSURANCE,
        BIZ_SUBSCRIPTIONS: ACCOUNTS.SOFTWARE,
        BIZ_BANK_FEES: ACCOUNTS.BANK_CHARGES,
        BIZ_OTHER: ACCOUNTS.GENERAL_EXPENSES,
        PERSONAL_GROCERIES: ACCOUNTS.PERSONAL,
        PERSONAL_DINING: ACCOUNTS.PERSONAL,
        PERSONAL_TRANSPORT: ACCOUNTS.PERSONAL,
        PERSONAL_HEALTH: ACCOUNTS.PERSONAL,
        PERSONAL_HOUSING: ACCOUNTS.PERSONAL,
        PERSONAL_UTILITIES: ACCOUNTS.PERSONAL,
        PERSONAL_ENTERTAINMENT: ACCOUNTS.PERSONAL,
        PERSONAL_CLOTHING: ACCOUNTS.PERSONAL,
        PERSONAL_EDUCATION: ACCOUNTS.PERSONAL,
        PERSONAL_OTHER: ACCOUNTS.PERSONAL,
        TAX_PAYMENT: ACCOUNTS.TAX_EXPENSE,
        UNCATEGORIZED: ACCOUNTS.GENERAL_EXPENSES,
    };
    return map[category] ?? ACCOUNTS.GENERAL_EXPENSES;
}
function computeVatCents(amountCents, vatRate) {
    if (vatRate === 'EXEMPT' || vatRate === '0')
        return 0;
    const rate = parseInt(vatRate, 10) / 100;
    // Amount is VAT-inclusive; extract VAT portion
    return Math.round(amountCents - amountCents / (1 + rate));
}
// ─── Public API ───────────────────────────────────────────────────────────────
export function insertJournalEntry(db, txId, amountEur, description, result) {
    const entryId = uuid();
    const amountCents = Math.round(Math.abs(amountEur) * 100);
    const vatCents = computeVatCents(amountCents, result.vatRate);
    const { debitAccount, creditAccount } = debitCreditAccounts(amountEur, result);
    // Look up the transaction date
    const txRow = db.prepare(`SELECT created_at FROM transactions WHERE id = ?`).get(txId);
    const date = txRow ? txRow.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
    db.prepare(`
    INSERT INTO journal_entries
      (id, tx_id, date, description, debit_account, credit_account,
       amount_cents, vat_amount_cents, category, is_business_expense,
       deductibility_pct, review_required, review_reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(entryId, txId, date, description, debitAccount, creditAccount, amountCents, vatCents, result.category, result.isBusinessExpense ? 1 : 0, result.deductibilityPct, result.reviewRequired ? 1 : 0, result.reviewReason ?? null);
    // Mark transaction as categorized
    db.prepare(`
    UPDATE transactions
    SET categorized_at = datetime('now'), journal_entry_id = ?
    WHERE id = ?
  `).run(entryId, txId);
    return entryId;
}
export function getJournalEntriesForPeriod(db, startDate, endDate) {
    return db.prepare(`
    SELECT j.*
    FROM journal_entries j
    WHERE j.date BETWEEN ? AND ?
    ORDER BY j.date DESC
  `).all(startDate, endDate).map(row => ({
        id: String(row['id']),
        txId: String(row['tx_id']),
        date: String(row['date']),
        description: row['description'] != null ? String(row['description']) : undefined,
        debitAccount: String(row['debit_account']),
        creditAccount: String(row['credit_account']),
        amountCents: Number(row['amount_cents']),
        vatAmountCents: Number(row['vat_amount_cents']),
        category: row['category'],
        subcategory: row['subcategory'] != null ? String(row['subcategory']) : undefined,
        isBusinessExpense: Number(row['is_business_expense']) === 1,
        reviewRequired: Number(row['review_required']) === 1,
        reviewedAt: row['reviewed_at'] != null ? String(row['reviewed_at']) : null,
        overriddenBy: row['overridden_by'] != null ? String(row['overridden_by']) : null,
        createdAt: String(row['created_at']),
    }));
}
export function getUncategorizedCount(db) {
    const row = db.prepare(`
    SELECT COUNT(*) as cnt FROM transactions
    WHERE journal_entry_id IS NULL
  `).get();
    return row.cnt;
}
export function reconcileLedger(db, startDate, endDate) {
    const rows = db.prepare(`
    SELECT debit_account, credit_account, amount_cents
    FROM journal_entries
    WHERE date BETWEEN ? AND ?
  `).all(startDate, endDate);
    let totalDebits = 0;
    let totalCredits = 0;
    for (const row of rows) {
        totalDebits += row.amount_cents;
        totalCredits += row.amount_cents;
    }
    return { totalDebits, totalCredits, balanced: totalDebits === totalCredits };
}
