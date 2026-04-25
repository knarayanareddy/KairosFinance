import { getTransactionsByAccount } from '../../memory/transactions.js';
import { getProfile } from '../../memory/profile.js';
// ─── Helpers ──────────────────────────────────────────────────────────────────
function monthBounds(year, month) {
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    return { start, end };
}
function recurringSpend(txs, start, end) {
    return txs
        .filter((tx) => tx.is_recurring === 1 && tx.amount < 0 && tx.created_at >= start && tx.created_at <= end)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
}
function newRecurringCounterparties(txs, currentStart, prevStart) {
    const prevNames = new Set();
    for (const tx of txs) {
        if (tx.amount < 0 && tx.created_at >= prevStart && tx.created_at < currentStart && tx.counterparty_name !== null) {
            prevNames.add(tx.counterparty_name);
        }
    }
    const newNames = [];
    for (const tx of txs) {
        if (tx.is_recurring === 1 &&
            tx.amount < 0 &&
            tx.created_at >= currentStart &&
            tx.counterparty_name !== null &&
            !prevNames.has(tx.counterparty_name)) {
            newNames.push(tx.counterparty_name);
        }
    }
    // Deduplicate
    return [...new Set(newNames)];
}
// ─── Agent entry point ────────────────────────────────────────────────────────
export async function run(snapshot, db) {
    const profile = getProfile(db);
    const txs = getTransactionsByAccount(db, snapshot.primaryAccountId, 200);
    const today = new Date();
    const curr = monthBounds(today.getFullYear(), today.getMonth());
    const prev = monthBounds(today.getFullYear(), today.getMonth() - 1);
    const currentRecurring = recurringSpend(txs, curr.start, curr.end);
    const prevRecurring = recurringSpend(txs, prev.start, prev.end);
    const newSubs = newRecurringCounterparties(txs, curr.start, prev.start);
    if (newSubs.length > 0) {
        return {
            agentId: 'subscription-watcher',
            riskScore: 55,
            rationale: `New recurring charge(s) detected: ${newSubs.slice(0, 2).join(', ')}`,
            shouldIntervene: false,
        };
    }
    if (prevRecurring > 0) {
        const ratio = currentRecurring / prevRecurring;
        if (ratio >= 1.3) {
            return {
                agentId: 'subscription-watcher',
                riskScore: 50,
                rationale: `Recurring spend up ${((ratio - 1) * 100).toFixed(0)}% vs last month (€${currentRecurring.toFixed(2)} vs €${prevRecurring.toFixed(2)})`,
                shouldIntervene: false,
            };
        }
    }
    const salary = profile?.salary_amount ?? null;
    if (salary !== null && salary > 0 && currentRecurring / salary >= 0.4) {
        return {
            agentId: 'subscription-watcher',
            riskScore: 45,
            rationale: `Recurring charges €${currentRecurring.toFixed(2)} are ${((currentRecurring / salary) * 100).toFixed(0)}% of salary`,
            shouldIntervene: false,
        };
    }
    return {
        agentId: 'subscription-watcher',
        riskScore: 5,
        rationale: `Recurring spend €${currentRecurring.toFixed(2)} this month looks normal`,
        shouldIntervene: false,
    };
}
