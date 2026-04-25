import { v4 as uuid } from 'uuid';
import { getProfile, getGoals } from '../../memory/profile.js';
import { createExecutionPlan } from '../../bunq/execute.js';
export async function run(_verdict, snapshot, db) {
    const profile = getProfile(db);
    if (!profile?.salary_amount) {
        return { type: 'JAR_SWEEP', modality: 'CARD', planId: null };
    }
    const goals = getGoals(db).filter(g => g.jar_account_id !== null && g.enabled);
    if (goals.length === 0) {
        return { type: 'JAR_SWEEP', modality: 'CARD', planId: null };
    }
    const balanceEur = snapshot.balanceCents / 100;
    const salaryEur = profile.salary_amount;
    const rentReserve = profile.rent_amount ?? 0;
    const keepThreshold = salaryEur + rentReserve;
    const surplus = Math.max(0, balanceEur - keepThreshold);
    // Sweep 60% of the surplus, capped at €2,000 per auto-pilot action
    const sweepAmount = Math.min(surplus * 0.6, 2000);
    if (sweepAmount < 50) {
        return { type: 'JAR_SWEEP', modality: 'CARD', planId: null };
    }
    // Distribute proportionally by goal shortfall
    const goalsWithShortfall = goals
        .map(g => ({ ...g, shortfall: Math.max(0, g.target_amount - g.current_amount) }))
        .filter(g => g.shortfall > 0);
    if (goalsWithShortfall.length === 0) {
        return { type: 'JAR_SWEEP', modality: 'CARD', planId: null };
    }
    const totalShortfall = goalsWithShortfall.reduce((s, g) => s + g.shortfall, 0);
    const steps = goalsWithShortfall.map(g => {
        const share = g.shortfall / totalShortfall;
        const amount = parseFloat((sweepAmount * share).toFixed(2));
        return {
            id: uuid(),
            type: 'SAVINGS_TRANSFER',
            description: `Transfer €${amount.toFixed(2)} to "${g.name}" — closes €${g.shortfall.toFixed(0)} shortfall`,
            payload: {
                fromAccountId: snapshot.primaryAccountId,
                toAccountId: g.jar_account_id,
                amount: amount.toFixed(2),
                currency: 'EUR',
                description: `BUNQSY auto-pilot: ${g.name}`,
            },
        };
    });
    const totalSteps = steps.length;
    const narratedText = `Your balance has €${surplus.toFixed(0)} above your keep threshold. ` +
        `I recommend sweeping €${sweepAmount.toFixed(0)} across ${totalSteps} savings jar${totalSteps !== 1 ? 's' : ''} ` +
        `to accelerate your goals. Say "yes" or tap confirm to execute.`;
    const plan = await createExecutionPlan(steps, narratedText);
    return { type: 'JAR_SWEEP', modality: 'VOICE', planId: plan.id };
}
