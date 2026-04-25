import { getProfile } from '../../memory/profile.js';
function daysUntilRentDue(today, rentDay) {
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const thisMonthDue = new Date(today.getFullYear(), today.getMonth(), rentDay);
    if (thisMonthDue >= todayStart) {
        return Math.ceil((thisMonthDue.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
    }
    const nextMonthDue = new Date(today.getFullYear(), today.getMonth() + 1, rentDay);
    return Math.ceil((nextMonthDue.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
}
export async function run(snapshot, db) {
    const profile = getProfile(db);
    const rentDay = profile?.rent_day ?? null;
    const rentAmount = profile?.rent_amount ?? null;
    if (rentDay === null || rentAmount === null) {
        return {
            agentId: 'rent-proximity-guard',
            riskScore: 0,
            rationale: 'Rent day or amount not configured in profile',
            shouldIntervene: false,
        };
    }
    const balanceEur = snapshot.balanceCents / 100;
    const days = daysUntilRentDue(new Date(), rentDay);
    const buffer = balanceEur - rentAmount;
    if (days <= 1 && balanceEur < rentAmount) {
        return {
            agentId: 'rent-proximity-guard',
            riskScore: 95,
            rationale: `Rent €${rentAmount} due tomorrow, balance €${balanceEur.toFixed(2)} insufficient (€${(-buffer).toFixed(2)} short)`,
            shouldIntervene: true,
            suggestedType: 'RENT_CRITICAL',
        };
    }
    if (days <= 3 && balanceEur < rentAmount) {
        return {
            agentId: 'rent-proximity-guard',
            riskScore: 80,
            rationale: `Rent €${rentAmount} due in ${days} days, balance €${balanceEur.toFixed(2)} is insufficient`,
            shouldIntervene: true,
            suggestedType: 'RENT_CRITICAL',
        };
    }
    if (days <= 7 && balanceEur < rentAmount * 1.1) {
        return {
            agentId: 'rent-proximity-guard',
            riskScore: 60,
            rationale: `Rent €${rentAmount} due in ${days} days; buffer is tight (€${buffer.toFixed(2)} above rent)`,
            shouldIntervene: true,
            suggestedType: 'RENT_WARNING',
        };
    }
    if (days <= 14 && buffer < rentAmount * 0.2) {
        return {
            agentId: 'rent-proximity-guard',
            riskScore: 30,
            rationale: `Rent due in ${days} days; buffer €${buffer.toFixed(2)} is below 20% safety margin`,
            shouldIntervene: false,
        };
    }
    return {
        agentId: 'rent-proximity-guard',
        riskScore: 5,
        rationale: `Rent €${rentAmount} due in ${days} days; balance €${balanceEur.toFixed(2)} is adequate`,
        shouldIntervene: false,
    };
}
