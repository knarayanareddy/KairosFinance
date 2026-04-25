import { upsertTransaction } from '../memory/transactions.js';
import { buildAccountSummaries } from '../bunq/accounts.js';
function findPrimary(accounts) {
    const banks = accounts.filter((a) => a._wrapperType === 'MonetaryAccountBank' && a.status === 'ACTIVE');
    return banks[0] ?? accounts.find((a) => a.status === 'ACTIVE');
}
function getNewerId(db, accountId) {
    const row = db
        .prepare(`SELECT MAX(CAST(id AS INTEGER)) AS max_id
       FROM transactions WHERE bunq_account_id = ?`)
        .get(accountId);
    return row.max_id !== null ? row.max_id : undefined;
}
export async function recall(client, db, accounts) {
    const all = accounts ?? await client.getAccounts();
    const primary = findPrimary(all);
    if (!primary)
        throw new Error('[recall] No active monetary account found');
    const accountId = primary.id;
    const balanceCents = Math.round(parseFloat(primary.balance?.value ?? '0') * 100);
    const newerId = getNewerId(db, accountId);
    const payments = await client.getTransactions(accountId, 50, newerId);
    let newTxCount = 0;
    for (const payment of payments) {
        upsertTransaction(db, {
            id: String(payment.id),
            bunqAccountId: accountId,
            amount: parseFloat(payment.amount.value),
            currency: payment.amount.currency,
            counterpartyName: payment.counterparty_alias?.display_name ?? null,
            counterpartyIban: payment.counterparty_alias?.iban ?? null,
            description: payment.description ?? null,
            createdAt: payment.created,
        });
        newTxCount++;
    }
    const stats = db
        .prepare(`SELECT COUNT(*) AS tx_count, MAX(id) AS latest_tx_id
       FROM transactions WHERE bunq_account_id = ?`)
        .get(accountId);
    const accountSummaries = buildAccountSummaries(all, db);
    const totalBalanceCents = accountSummaries.reduce((sum, s) => sum + s.balanceCents, 0);
    return {
        primaryAccountId: accountId,
        balanceCents,
        latestTxId: stats.latest_tx_id,
        txCount: stats.tx_count,
        newTxCount,
        accounts: all,
        accountSummaries,
        totalBalanceCents,
    };
}
