import { getDailySpend, getAverageDailySpend } from '../../memory/transactions.js';
export async function run(snapshot, db) {
    const { primaryAccountId } = snapshot;
    const daily = getDailySpend(db, primaryAccountId);
    const avgDaily = getAverageDailySpend(db, primaryAccountId, 30);
    if (avgDaily === 0) {
        return {
            agentId: 'velocity-analyzer',
            riskScore: 10,
            rationale: 'No 30-day spending baseline yet; cannot assess velocity',
            shouldIntervene: false,
        };
    }
    const ratio = daily / avgDaily;
    if (ratio >= 4) {
        return {
            agentId: 'velocity-analyzer',
            riskScore: 90,
            rationale: `Spending ${ratio.toFixed(1)}x daily average (€${daily.toFixed(2)} vs avg €${avgDaily.toFixed(2)})`,
            shouldIntervene: true,
            suggestedType: 'VELOCITY_SPIKE',
        };
    }
    if (ratio >= 3) {
        return {
            agentId: 'velocity-analyzer',
            riskScore: 75,
            rationale: `Spending ${ratio.toFixed(1)}x daily average (€${daily.toFixed(2)} vs avg €${avgDaily.toFixed(2)})`,
            shouldIntervene: true,
            suggestedType: 'VELOCITY_SPIKE',
        };
    }
    if (ratio >= 2) {
        return {
            agentId: 'velocity-analyzer',
            riskScore: 55,
            rationale: `Spending ${ratio.toFixed(1)}x daily average (€${daily.toFixed(2)} vs avg €${avgDaily.toFixed(2)})`,
            shouldIntervene: false,
        };
    }
    if (ratio >= 1.5) {
        return {
            agentId: 'velocity-analyzer',
            riskScore: 30,
            rationale: `Spending slightly elevated: ${ratio.toFixed(1)}x 30-day average`,
            shouldIntervene: false,
        };
    }
    return {
        agentId: 'velocity-analyzer',
        riskScore: 5,
        rationale: `Spending normal: €${daily.toFixed(2)} today vs €${avgDaily.toFixed(2)} avg`,
        shouldIntervene: false,
    };
}
