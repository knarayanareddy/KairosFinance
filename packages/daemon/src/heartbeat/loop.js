import { getDb } from '../memory/db.js';
import { recall } from './recall.js';
import { computeBunqsyScore } from './bunqsy-score.js';
import { appendTickLog, appendScoreLog, getRecentScoreLogs } from './tick-log.js';
import { tryExplainScoreDelta } from './score-delta.js';
export async function runTick(deps) {
    const start = Date.now();
    const db = getDb();
    console.log('[heartbeat] Tick starting...');
    // Fetch accounts once; pass to recall() to avoid a second getAccounts() call
    const accounts = await deps.client.getAccounts();
    console.log(`[heartbeat] Fetched ${accounts.length} accounts`);
    const snapshot = await recall(deps.client, db, accounts);
    console.log(`[heartbeat] Recall complete, AID=${snapshot.primaryAccountId}, new transactions: ${snapshot.newTxCount}`);
    deps.onTickRecord?.(snapshot);
    // Read previous score BEFORE appending so delta comparison is against the last persisted value
    const prevScores = getRecentScoreLogs(db, 1);
    const score = computeBunqsyScore(db, snapshot);
    appendScoreLog(db, score);
    deps.onScore?.(score);
    // Explain meaningful score changes (>= 3 pts) via Claude Haiku
    if (prevScores.length > 0) {
        const delta = score.value - prevScores[0].score;
        const deltaPayload = await tryExplainScoreDelta(delta, score.value, prevScores[0], score.components);
        if (deltaPayload)
            deps.onScoreDelta?.(deltaPayload);
    }
    let verdict = null;
    let interventionId = null;
    let reasonRan = false;
    if (deps.runOracle) {
        console.log('[heartbeat] Running Oracle reasoning...');
        reasonRan = true;
        verdict = await deps.runOracle(snapshot);
        console.log(`[heartbeat] Oracle verdict: ${verdict.shouldIntervene ? 'INTERVENE' : 'CLEAR'} (score: ${verdict.aggregateRiskScore})`);
        if (verdict.shouldIntervene && deps.dispatchIntervention) {
            const dispatched = await deps.dispatchIntervention(verdict, snapshot);
            if (dispatched) {
                interventionId = dispatched.id;
                deps.onIntervention?.(dispatched);
            }
        }
    }
    // ── Auto-categorize new transactions (bookkeeping) ─────────────────────────
    if (process.env['BOOKKEEPING_AUTO_CATEGORIZE'] === 'true') {
        try {
            const { categorizePending } = await import('../bookkeeping/categorizer.js');
            const { getPendingReviewCount } = await import('../bookkeeping/review-queue.js');
            const { getUncategorizedCount } = await import('../bookkeeping/ledger.js');
            const { checkVatReminders } = await import('../bookkeeping/vat-tracker.js');
            const categorized = await categorizePending(db, 5);
            if (categorized > 0) {
                console.log(`[heartbeat] Bookkeeping: categorized ${categorized} transactions`);
                const pending = getPendingReviewCount(db);
                const uncategorized = getUncategorizedCount(db);
                deps.onBookkeepingUpdate?.({
                    type: 'review_queue_update',
                    payload: { pendingCount: pending },
                });
                deps.onBookkeepingUpdate?.({
                    type: 'books_up_to_date',
                    payload: { categorizedCount: categorized, uncategorizedCount: uncategorized },
                });
            }
            // VAT reminders
            const reminders = checkVatReminders(db);
            for (const reminder of reminders) {
                deps.onBookkeepingUpdate?.({ type: 'vat_reminder', payload: reminder });
            }
        }
        catch (err) {
            console.warn('[heartbeat] Bookkeeping auto-categorize error:', err instanceof Error ? err.message : String(err));
        }
    }
    appendTickLog(db, {
        durationMs: Date.now() - start,
        reasonRan,
        verdict: verdict?.rationale ?? null,
        riskScore: verdict?.aggregateRiskScore ?? null,
        bunqsyScore: score.value,
        interventionId,
    });
    console.log(`[heartbeat] Tick complete in ${Date.now() - start}ms`);
}
export function startHeartbeatLoop(deps, intervalMs = 60_000) {
    let running = true;
    let handle;
    async function loop() {
        while (running) {
            try {
                await runTick(deps);
            }
            catch (err) {
                deps.onError?.(err instanceof Error ? err : new Error(String(err)));
            }
            if (!running)
                break;
            await new Promise((resolve) => {
                handle = setTimeout(resolve, intervalMs);
            });
        }
    }
    void loop();
    return () => {
        running = false;
        if (handle !== undefined)
            clearTimeout(handle);
    };
}
