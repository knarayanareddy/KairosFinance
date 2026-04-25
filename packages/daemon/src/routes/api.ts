import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb } from '../memory/db.js';
import { isAllowedOrigin } from '../bunq/webhook.js';
import { getInterventionHistory, resolveIntervention } from '../memory/interventions.js';
import { confirmPlan, executePlan, cancelPlan } from '../bunq/execute.js';
import { offerPatternPromotion } from '../intervention/pattern-promotion.js';
import { getAccountSummaries } from '../state.js';
import type { ScoreLogRow, OracleVote, InterventionRow, TransactionRow } from '@bunqsy/shared';

export async function registerApiRoutes(
  fastify: FastifyInstance,
  triggerTick?: () => Promise<void>,
): Promise<void> {

  // ── GET /api/score — latest BUNQSY score ────────────────────────────────────
  fastify.get('/api/score', async (_req: FastifyRequest, reply: FastifyReply) => {
    const db = getDb();
    const score = db
      .prepare(`SELECT * FROM score_log ORDER BY logged_at DESC LIMIT 1`)
      .get() as ScoreLogRow | undefined;
    return reply.send(score ?? null);
  });

  // ── GET /api/accounts — multi-account summaries (Phase 14) ────────────────
  fastify.get('/api/accounts', async (_req: FastifyRequest, reply: FastifyReply) => {
    const summaries = getAccountSummaries();
    return reply.send(summaries);
  });

  // ── GET /api/interventions — recent intervention history ───────────────────
  fastify.get('/api/interventions', async (_req: FastifyRequest, reply: FastifyReply) => {
    const db = getDb();
    return reply.send(getInterventionHistory(db, 20));
  });

  // ── POST /api/confirm/:planId — confirm + execute, or allow (cancel) a plan ─
  fastify.post(
    '/api/confirm/:planId',
    async (
      req: FastifyRequest<{
        Params: { planId: string };
        Body:   { action?: 'allow' | 'block' };
      }>,
      reply: FastifyReply,
    ) => {
      const { planId } = req.params;
      const action = (req.body as { action?: string } | undefined)?.action ?? 'block';

      try {
        const db = getDb();
        const interventionRow = db
          .prepare(
            `SELECT * FROM interventions
             WHERE execution_plan_id = ? AND status = 'SHOWN'`,
          )
          .get(planId) as InterventionRow | undefined;

        if (action === 'allow') {
          // User confirmed the transaction is legitimate — cancel the block plan
          await cancelPlan(planId);
          if (interventionRow) resolveIntervention(db, interventionRow.id, 'DISMISSED');
        } else {
          // Block action: confirm then execute the CANCEL_DRAFT plan
          // Constitutional rule: confirm first, then execute — never skip confirm step
          await confirmPlan(planId);
          await executePlan(planId);
          if (interventionRow) {
            resolveIntervention(db, interventionRow.id, 'EXECUTED');
            // Async background: ask Claude if this confirmed action is a repeatable pattern
            void offerPatternPromotion(
              db,
              interventionRow.type,
              interventionRow.narration,
              JSON.parse(interventionRow.oracle_votes) as OracleVote[],
            );
          }
        }

        return reply.send({ ok: true });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return reply.status(400).send({ ok: false, error: message });
      }
    },
  );

  // ── POST /api/dismiss/:interventionId — dismiss an active intervention ────
  fastify.post(
    '/api/dismiss/:interventionId',
    async (req: FastifyRequest<{ Params: { interventionId: string } }>, reply: FastifyReply) => {
      const { interventionId } = req.params;
      const db = getDb();
      resolveIntervention(db, interventionId, 'DISMISSED');
      return reply.send({ ok: true });
    },
  );

  // ── GET /api/dna — Financial DNA card + patterns ──────────────────────────
  fastify.get('/api/dna', async (_req: FastifyRequest, reply: FastifyReply) => {
    const db = getDb();

    const session = db
      .prepare(
        `SELECT dna_card, suggestions, completed_at FROM dream_sessions
         WHERE status = 'COMPLETED' ORDER BY completed_at DESC LIMIT 1`,
      )
      .get() as { dna_card: string | null; suggestions: string | null; completed_at: string } | undefined;

    const patterns = db
      .prepare(
        `SELECT name, confidence FROM patterns
         WHERE confidence > 0.4 ORDER BY confidence DESC LIMIT 6`,
      )
      .all() as Array<{ name: string; confidence: number }>;

    if (!session?.dna_card) {
      return reply.send({ dnaCard: null, suggestions: [], patterns, completedAt: null });
    }

    let suggestions: string[] = [];
    try {
      suggestions = JSON.parse(session.suggestions ?? '[]') as string[];
    } catch { /* ignore parse errors */ }

    return reply.send({
      dnaCard:     session.dna_card,
      suggestions,
      patterns,
      completedAt: session.completed_at,
    });
  });

  // ── GET /api/transactions — recent transactions from DB ───────────────────
  fastify.get(
    '/api/transactions',
    async (req: FastifyRequest<{ Querystring: { limit?: string } }>, reply: FastifyReply) => {
      const db = getDb();
      const limit = Math.min(parseInt((req.query as { limit?: string }).limit ?? '30', 10), 100);
      const rows = db
        .prepare(
          `SELECT t.*, j.category AS je_category
           FROM transactions t
           LEFT JOIN journal_entries j ON j.tx_id = t.id
           ORDER BY t.created_at DESC LIMIT ?`,
        )
        .all(limit) as TransactionRow[];
      return reply.send(rows);
    },
  );

  // ── POST /api/webhook — bunq event webhook ─────────────────────────────────
  fastify.post('/api/webhook', async (req: FastifyRequest, reply: FastifyReply) => {
    const remoteIp =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
      ?? req.socket.remoteAddress
      ?? '';

    if (!isAllowedOrigin(remoteIp)) {
      return reply.status(403).send({ error: 'Forbidden — IP not in bunq CIDR range' });
    }

    // Parse the bunq notification payload
    // Shape: { NotificationUrl: { category, event_type, object } }
    const body = req.body as { NotificationUrl?: { category?: string; event_type?: string } } | undefined;
    const category  = body?.NotificationUrl?.category ?? 'UNKNOWN';
    const eventType = body?.NotificationUrl?.event_type ?? 'UNKNOWN';

    console.log(`[webhook] Received: category=${category} event=${eventType}`);

    // Trigger an immediate heartbeat tick for payment-relevant events
    const TICK_CATEGORIES = new Set(['PAYMENT', 'MUTATION', 'REQUEST', 'SCHEDULE_RESULT']);
    if (TICK_CATEGORIES.has(category) && triggerTick) {
      // Slight delay so bunq has committed the transaction before we fetch
      setTimeout(() => {
        void triggerTick().catch((err: Error) =>
          console.error('[webhook] Triggered tick failed:', err.message),
        );
      }, 800);
    }

    return reply.status(200).send({ ok: true });
  });
}
