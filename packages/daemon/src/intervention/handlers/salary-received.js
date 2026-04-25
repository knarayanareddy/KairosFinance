import { getProfile } from '../../memory/profile.js';
import { getRecentTransactions } from '../../memory/transactions.js';
import { runSavingsJarAgent } from '../../jars/agent.js';
export async function run(_verdict, snapshot, db) {
    const profile = getProfile(db);
    const salaryAmount = profile?.salary_amount ?? null;
    if (salaryAmount === null) {
        return { type: 'SALARY_RECEIVED', modality: 'CARD', planId: null };
    }
    // Confirm a qualifying salary credit exists in recent transactions:
    // amount >= 80% of expected salary, created within ±2 days of configured salary day
    const txs = getRecentTransactions(db, 20, snapshot.primaryAccountId);
    const salaryDay = profile?.salary_day ?? null;
    const salaryTx = txs.find((tx) => {
        if (tx.amount < salaryAmount * 0.8)
            return false;
        if (salaryDay === null)
            return true;
        const txDate = new Date(tx.created_at);
        return Math.abs(txDate.getDate() - salaryDay) <= 2;
    });
    if (!salaryTx) {
        return { type: 'SALARY_RECEIVED', modality: 'CARD', planId: null };
    }
    // Delegate to the Savings Jar Agent for intelligent multi-jar allocation
    const { planId, narratedText } = await runSavingsJarAgent(snapshot, db);
    if (!planId) {
        // Agent found nothing to allocate (no goals, rent reserves everything, etc.)
        // Still surface a CARD so the user sees their salary landed
        console.log('[salary-received] Jar agent returned no plan:', narratedText);
        return { type: 'SALARY_RECEIVED', modality: 'CARD', planId: null };
    }
    return {
        type: 'SALARY_RECEIVED',
        modality: 'VOICE',
        planId,
    };
}
