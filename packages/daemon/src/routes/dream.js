import { getDb } from '../memory/db.js';
import { triggerDream } from '../dream/trigger.js';
import { wsEmit } from './ws.js';
export async function registerDreamRoutes(fastify) {
    // ── POST /api/dream/trigger — manual Dream Mode invocation ──────────────────
    fastify.post('/api/dream/trigger', async (_req, reply) => {
        const db = getDb();
        // Prevent concurrent dream sessions
        const running = db
            .prepare(`SELECT id FROM dream_sessions WHERE status = 'RUNNING' LIMIT 1`)
            .get();
        if (running) {
            return reply.status(409).send({
                error: 'A dream session is already running',
                sessionId: running.id,
                status: 'RUNNING',
            });
        }
        const sessionId = await triggerDream(db, wsEmit, 'manual');
        return reply.status(202).send({ sessionId, status: 'RUNNING' });
    });
    // ── GET /api/dream/latest — most recent completed session ───────────────────
    fastify.get('/api/dream/latest', async (_req, reply) => {
        const db = getDb();
        const row = db
            .prepare(`SELECT * FROM dream_sessions
         WHERE status = 'COMPLETED'
         ORDER BY completed_at DESC LIMIT 1`)
            .get();
        if (!row) {
            return reply.status(404).send({ error: 'No completed dream sessions found' });
        }
        return reply.send({
            sessionId: row.id,
            briefingText: row.briefing_text,
            dnaCard: row.dna_card,
            suggestions: row.suggestions ? JSON.parse(row.suggestions) : [],
            completedAt: row.completed_at,
            durationMs: row.duration_ms,
        });
    });
}
