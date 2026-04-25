import { v4 as uuid } from 'uuid';
import { getDb } from '../memory/db.js';
import { isAllowedOrigin } from '../bunq/webhook.js';
import { getInterventionHistory, resolveIntervention } from '../memory/interventions.js';
import { confirmPlan, executePlan, cancelPlan, createExecutionPlan } from '../bunq/execute.js';
import { offerPatternPromotion } from '../intervention/pattern-promotion.js';
import { getAccountSummaries } from '../state.js';
export async function registerApiRoutes(fastify, triggerTick, client) {
    // ── GET /api/score — latest BUNQSY score ────────────────────────────────────
    fastify.get('/api/score', async (_req, reply) => {
        const db = getDb();
        const score = db
            .prepare(`SELECT * FROM score_log ORDER BY logged_at DESC LIMIT 1`)
            .get();
        return reply.send(score ?? null);
    });
    // ── GET /api/accounts — multi-account summaries (Phase 14) ────────────────
    fastify.get('/api/accounts', async (_req, reply) => {
        const summaries = getAccountSummaries();
        return reply.send(summaries);
    });
    // ── GET /api/interventions — recent intervention history ───────────────────
    fastify.get('/api/interventions', async (_req, reply) => {
        const db = getDb();
        return reply.send(getInterventionHistory(db, 20));
    });
    // ── POST /api/confirm/:planId — confirm + execute, or allow (cancel) a plan ─
    fastify.post('/api/confirm/:planId', async (req, reply) => {
        const { planId } = req.params;
        const action = req.body?.action ?? 'block';
        try {
            const db = getDb();
            const interventionRow = db
                .prepare(`SELECT * FROM interventions
             WHERE execution_plan_id = ? AND status = 'SHOWN'`)
                .get(planId);
            if (action === 'allow') {
                // User confirmed the transaction is legitimate — cancel the block plan
                await cancelPlan(planId);
                if (interventionRow)
                    resolveIntervention(db, interventionRow.id, 'DISMISSED');
            }
            else {
                // Block action: confirm then execute the CANCEL_DRAFT plan
                // Constitutional rule: confirm first, then execute — never skip confirm step
                await confirmPlan(planId);
                await executePlan(planId);
                if (interventionRow) {
                    resolveIntervention(db, interventionRow.id, 'EXECUTED');
                    // Async background: ask Claude if this confirmed action is a repeatable pattern
                    void offerPatternPromotion(db, interventionRow.type, interventionRow.narration, JSON.parse(interventionRow.oracle_votes));
                }
            }
            return reply.send({ ok: true });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return reply.status(400).send({ ok: false, error: message });
        }
    });
    // ── POST /api/dismiss/:interventionId — dismiss an active intervention ────
    fastify.post('/api/dismiss/:interventionId', async (req, reply) => {
        const { interventionId } = req.params;
        const db = getDb();
        resolveIntervention(db, interventionId, 'DISMISSED');
        return reply.send({ ok: true });
    });
    // ── GET /api/dna — Financial DNA card + patterns ──────────────────────────
    fastify.get('/api/dna', async (_req, reply) => {
        const db = getDb();
        const session = db
            .prepare(`SELECT dna_card, suggestions, completed_at FROM dream_sessions
         WHERE status = 'COMPLETED' ORDER BY completed_at DESC LIMIT 1`)
            .get();
        const patterns = db
            .prepare(`SELECT name, confidence FROM patterns
         WHERE confidence > 0.4 ORDER BY confidence DESC LIMIT 6`)
            .all();
        if (!session?.dna_card) {
            return reply.send({ dnaCard: null, suggestions: [], patterns, completedAt: null });
        }
        let suggestions = [];
        try {
            suggestions = JSON.parse(session.suggestions ?? '[]');
        }
        catch { /* ignore parse errors */ }
        return reply.send({
            dnaCard: session.dna_card,
            suggestions,
            patterns,
            completedAt: session.completed_at,
        });
    });
    // ── GET /api/transactions — recent transactions from DB ───────────────────
    fastify.get('/api/transactions', async (req, reply) => {
        const db = getDb();
        const limit = Math.min(parseInt(req.query.limit ?? '30', 10), 100);
        const rows = db
            .prepare(`SELECT t.*, j.category AS je_category
           FROM transactions t
           LEFT JOIN journal_entries j ON j.tx_id = t.id
           ORDER BY t.created_at DESC LIMIT ?`)
            .all(limit);
        return reply.send(rows);
    });
    // ── GET /api/insights — weekly spending, goals, and latest dream session ────
    fastify.get('/api/insights', async (_req, reply) => {
        const db = getDb();
        const spendingRows = db
            .prepare(`SELECT strftime('%w', created_at) as dow, SUM(ABS(amount)) as total
         FROM transactions
         WHERE created_at >= datetime('now', '-7 days') AND amount < 0
         GROUP BY dow`)
            .all();
        const DOW_LABELS = {
            '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu',
            '5': 'Fri', '6': 'Sat', '0': 'Sun',
        };
        const DOW_ORDER = ['1', '2', '3', '4', '5', '6', '0'];
        const spendingMap = new Map(spendingRows.map((r) => [r.dow, r.total]));
        const weeklySpending = DOW_ORDER.map((dow) => ({
            day: DOW_LABELS[dow],
            amount: spendingMap.get(dow) ?? 0,
        }));
        const goalRows = db
            .prepare(`SELECT name, target_amount, current_amount FROM goals
         WHERE enabled = 1 ORDER BY created_at DESC LIMIT 5`)
            .all();
        const goals = goalRows.map((g) => ({
            name: g.name,
            targetAmount: g.target_amount,
            currentAmount: g.current_amount,
        }));
        const dreamRow = db
            .prepare(`SELECT briefing_text, dna_card, suggestions, completed_at,
                patterns_updated, patterns_created
         FROM dream_sessions WHERE status = 'COMPLETED'
         ORDER BY completed_at DESC LIMIT 1`)
            .get();
        let dreamSession = null;
        if (dreamRow !== undefined) {
            let suggestions = [];
            try {
                suggestions = JSON.parse(dreamRow.suggestions);
            }
            catch { /* ignore malformed JSON */ }
            dreamSession = {
                briefingText: dreamRow.briefing_text,
                dnaCard: dreamRow.dna_card ?? null,
                suggestions,
                completedAt: dreamRow.completed_at ?? null,
                patternsUpdated: dreamRow.patterns_updated ?? null,
                patternsCreated: dreamRow.patterns_created ?? null,
            };
        }
        const kpiCurrent = db.prepare(`
      SELECT
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END)        as total_income,
        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END)   as total_expenses
      FROM transactions
      WHERE created_at >= datetime('now', '-30 days')
    `).get();
        const kpiPrev = db.prepare(`
      SELECT
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END)        as total_income,
        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END)   as total_expenses
      FROM transactions
      WHERE created_at >= datetime('now', '-60 days')
        AND created_at <  datetime('now', '-30 days')
    `).get();
        const income30 = kpiCurrent?.total_income ?? 0;
        const expenses30 = kpiCurrent?.total_expenses ?? 0;
        const incPrev = kpiPrev?.total_income ?? 0;
        const expPrev = kpiPrev?.total_expenses ?? 0;
        const savingRate = income30 > 0 ? Math.round(((income30 - expenses30) / income30) * 100) : 0;
        const prevSavingRate = incPrev > 0 ? Math.round(((incPrev - expPrev) / incPrev) * 100) : 0;
        const burnRateDaily = Math.round((expenses30 / 30) * 100) / 100;
        return reply.send({
            weeklySpending,
            goals,
            dreamSession,
            kpis: {
                savingRate,
                savingRateDelta: savingRate - prevSavingRate,
                burnRateDaily,
                totalIncome30d: Math.round(income30 * 100) / 100,
                totalExpenses30d: Math.round(expenses30 * 100) / 100,
            },
        });
    });
    // ── GET /api/cards — live card list from bunq ─────────────────────────────
    fastify.get('/api/cards', async (_req, reply) => {
        if (!client)
            return reply.status(503).send({ error: 'bunq client not available' });
        try {
            const cards = await client.getCards();
            const summaries = cards.map((c) => {
                const raw = c;
                const typeLower = (c.type ?? '').toLowerCase();
                return {
                    id: c.id,
                    type: c.type ?? null,
                    cardEndpoint: typeLower.includes('credit') ? 'card-credit' : 'card-debit',
                    status: c.status ?? null,
                    nameOnCard: raw['name_on_card'] ?? null,
                    lastFourDigits: raw['primary_account_number_four_digit'] ?? null,
                    expiryDate: raw['expiry_date'] ?? null,
                };
            });
            return reply.send(summaries);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return reply.status(503).send({ error: 'Unable to fetch cards from bunq', detail: message });
        }
    });
    // ── POST /api/cards/:cardId/freeze — create a CARD_FREEZE ExecutionPlan ───
    fastify.post('/api/cards/:cardId/freeze', async (req, reply) => {
        const { cardId } = req.params;
        const body = req.body;
        const cardEndpoint = body?.cardEndpoint ?? 'card-debit';
        const nameOnCard = body?.nameOnCard ?? 'card';
        const lastFourDigits = body?.lastFourDigits ?? '****';
        const plan = await createExecutionPlan([{
                id: uuid(),
                type: 'CARD_FREEZE',
                description: `Freeze ${nameOnCard} (…${lastFourDigits})`,
                payload: { cardId: parseInt(cardId, 10), cardEndpoint },
            }], `Freezing your ${nameOnCard} card ending in ${lastFourDigits}. All new transactions will be blocked until you unfreeze it. This action can be reversed at any time.`);
        return reply.send({ planId: plan.id, narratedText: plan.narratedText });
    });
    // ── POST /api/cards/:cardId/unfreeze — create a CARD_UNFREEZE ExecutionPlan
    fastify.post('/api/cards/:cardId/unfreeze', async (req, reply) => {
        const { cardId } = req.params;
        const body = req.body;
        const cardEndpoint = body?.cardEndpoint ?? 'card-debit';
        const nameOnCard = body?.nameOnCard ?? 'card';
        const lastFourDigits = body?.lastFourDigits ?? '****';
        const plan = await createExecutionPlan([{
                id: uuid(),
                type: 'CARD_UNFREEZE',
                description: `Unfreeze ${nameOnCard} (…${lastFourDigits})`,
                payload: { cardId: parseInt(cardId, 10), cardEndpoint },
            }], `Reactivating your ${nameOnCard} card ending in ${lastFourDigits}. The card will accept transactions again immediately after confirmation.`);
        return reply.send({ planId: plan.id, narratedText: plan.narratedText });
    });
    // ── GET /api/bunq-goals — savings goals from bunq per savings account ──────
    fastify.get('/api/bunq-goals', async (_req, reply) => {
        if (!client)
            return reply.send([]);
        try {
            const accounts = await client.getAccounts();
            const savingsAccounts = accounts.filter((a) => a.status === 'ACTIVE' &&
                (a._wrapperType === 'MonetaryAccountSavings' || a._wrapperType === 'MonetaryAccountBank'));
            const allGoals = [];
            for (const account of savingsAccounts) {
                const goals = await client.getSavingsGoals(account.id);
                for (const g of goals) {
                    if ((g.status ?? 'ACTIVE') !== 'ACTIVE')
                        continue;
                    const raw = g;
                    const goalAmt = parseFloat((raw['goal_amount']?.value) ?? '0');
                    const savedAmt = parseFloat((raw['saved_amount']?.value) ?? '0');
                    const currency = (raw['goal_amount']?.currency) ?? 'EUR';
                    allGoals.push({
                        id: g.id,
                        name: g.name ?? `Goal ${g.id}`,
                        targetAmount: goalAmt,
                        currentAmount: savedAmt,
                        currency,
                        status: g.status ?? 'ACTIVE',
                        source: 'bunq',
                    });
                }
            }
            return reply.send(allGoals);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.warn('[api] /api/bunq-goals failed (non-fatal):', message);
            return reply.send([]);
        }
    });
    // ── POST /api/webhook — bunq event webhook ─────────────────────────────────
    fastify.post('/api/webhook', async (req, reply) => {
        const remoteIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
            ?? req.socket.remoteAddress
            ?? '';
        if (!isAllowedOrigin(remoteIp)) {
            return reply.status(403).send({ error: 'Forbidden — IP not in bunq CIDR range' });
        }
        // Parse the bunq notification payload
        // Shape: { NotificationUrl: { category, event_type, object } }
        const body = req.body;
        const category = body?.NotificationUrl?.category ?? 'UNKNOWN';
        const eventType = body?.NotificationUrl?.event_type ?? 'UNKNOWN';
        console.log(`[webhook] Received: category=${category} event=${eventType}`);
        // Trigger an immediate heartbeat tick for payment-relevant events
        const TICK_CATEGORIES = new Set(['PAYMENT', 'MUTATION', 'REQUEST', 'SCHEDULE_RESULT']);
        if (TICK_CATEGORIES.has(category) && triggerTick) {
            // Slight delay so bunq has committed the transaction before we fetch
            setTimeout(() => {
                void triggerTick().catch((err) => console.error('[webhook] Triggered tick failed:', err.message));
            }, 800);
        }
        return reply.status(200).send({ ok: true });
    });
}
