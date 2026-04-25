import { v4 as uuid } from 'uuid';
import { getActiveIntervention, insertIntervention } from '../memory/interventions.js';
import { generateNarration } from './explainer.js';
import { run as lowBalance } from './handlers/low-balance.js';
import { run as impulseBuy } from './handlers/impulse-buy.js';
import { run as salaryReceived } from './handlers/salary-received.js';
import { run as subscriptionDuplicate } from './handlers/subscription-duplicate.js';
import { run as fraudBlock } from './handlers/fraud-block.js';
import { run as dreamSuggestion } from './handlers/dream-suggestion.js';
import { run as jarSweep } from './handlers/jar-sweep.js';
// ─── Handler registry ─────────────────────────────────────────────────────────
const HANDLER_MAP = {
    BALANCE_LOW: lowBalance,
    BALANCE_CRITICAL: lowBalance,
    VELOCITY_SPIKE: impulseBuy,
    PATTERN_MATCH: impulseBuy,
    RENT_CRITICAL: lowBalance,
    RENT_WARNING: lowBalance,
    FRAUD: fraudBlock,
    FREEZE_CARD: fraudBlock,
    SUBSCRIPTION: subscriptionDuplicate,
    SALARY: salaryReceived,
    DREAM: dreamSuggestion,
    JAR_SWEEP: jarSweep,
};
function selectHandler(interventionType) {
    const handler = interventionType !== undefined ? HANDLER_MAP[interventionType] : undefined;
    return handler ?? dreamSuggestion;
}
// ─── Dispatcher ───────────────────────────────────────────────────────────────
/**
 * Receives an OracleVerdict, routes to the correct handler to draft any plan,
 * calls the explainer for a plain-English narration, then persists the
 * intervention row (append-only, status = SHOWN).
 *
 * Returns the new intervention ID, or null if:
 *   - A SHOWN intervention already exists (no stacking), or
 *   - Dispatch fails for any reason (logged, never throws).
 */
export async function dispatchIntervention(verdict, snapshot, db) {
    // Guard: one active intervention at a time — never stack
    if (getActiveIntervention(db))
        return null;
    try {
        const handler = selectHandler(verdict.interventionType);
        const result = await handler(verdict, snapshot, db);
        const narration = await generateNarration(verdict, result, snapshot);
        const id = uuid();
        const payload = {
            id,
            type: result.type,
            riskScore: verdict.aggregateRiskScore,
            verdict: verdict.rationale,
            modality: result.modality,
            narration,
            oracleVotes: verdict.votes,
            executionPlanId: result.planId,
        };
        insertIntervention(db, payload);
        return payload;
    }
    catch (err) {
        console.error('[intervention] Dispatch failed:', err instanceof Error ? err.message : String(err));
        return null;
    }
}
