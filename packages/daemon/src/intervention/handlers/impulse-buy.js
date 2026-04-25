export async function run(verdict, _snapshot, _db) {
    // High-risk velocity spikes (≥75) get a voice alert; pattern-based coaching is a card
    return {
        type: 'IMPULSE_BUY',
        modality: verdict.aggregateRiskScore >= 75 ? 'VOICE' : 'CARD',
        planId: null,
    };
}
