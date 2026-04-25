import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb } from '../memory/db.js';
import { isAllowedOrigin } from '../bunq/webhook.js';
import { getInterventionHistory, resolveIntervention } from '../memory/interventions.js';
import { confirmPlan, executePlan, cancelPlan } from '../bunq/execute.js';
import { offerPatternPromotion } from '../intervention/pattern-promotion.js';
import { getAccountSummaries } from '../state.js';
import type { ScoreLogRow, OracleVote, InterventionRow } from '@bunqsy/shared';

export async function registerApiRoutes(fastify: FastifyInstance): Promise<void> {

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

  // ── POST /api/webhook — bunq event webhook ─────────────────────────────────
  fastify.post('/api/webhook', async (req: FastifyRequest, reply: FastifyReply) => {
    const remoteIp =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
      ?? req.socket.remoteAddress
      ?? '';

    if (!isAllowedOrigin(remoteIp)) {
      return reply.status(403).send({ error: 'Forbidden — IP not in bunq CIDR range' });
    }

    // Signature validation is done by validateWebhookRequest in webhook.ts;
    // full wiring happens in Phase 7 when real-time events drive recall().
    // For now, acknowledge receipt so bunq does not retry.
    return reply.status(200).send({ ok: true });
  });
}
