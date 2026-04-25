import { getDb } from '../memory/db.js';
import { getReviewQueue, approveReviewItem, bulkApproveQueue, getPendingReviewCount } from '../bookkeeping/review-queue.js';
import { generateProfitAndLoss, generateTaxSummary } from '../bookkeeping/reports.js';
import { getAllVatPeriods, markVatPeriodFiled } from '../bookkeeping/vat-tracker.js';
import { exportToCSV, exportToMT940 } from '../bookkeeping/exporter.js';
import { getUncategorizedCount } from '../bookkeeping/ledger.js';
import { TaxCategorySchema } from '@bunqsy/shared';
import { wsEmit } from './ws.js';
export async function registerBookkeepingRoutes(fastify, getIBAN) {
    const db = getDb();
    // ── GET /api/bookkeeping/review-queue ────────────────────────────────────────
    fastify.get('/api/bookkeeping/review-queue', async (_req, reply) => {
        const queue = getReviewQueue(db);
        return reply.send({ items: queue, total: queue.length });
    });
    // ── POST /api/bookkeeping/review-queue/:entryId/approve ─────────────────────
    fastify.post('/api/bookkeeping/review-queue/:entryId/approve', async (req, reply) => {
        const { entryId } = req.params;
        const body = req.body;
        let override;
        if (body?.categoryOverride) {
            const parsed = TaxCategorySchema.safeParse(body.categoryOverride);
            if (!parsed.success) {
                return reply.status(400).send({ error: 'Invalid category' });
            }
            override = parsed.data;
        }
        const ok = approveReviewItem(db, entryId, override);
        if (!ok)
            return reply.status(404).send({ error: 'Entry not found' });
        // Push updated count
        wsEmit({ type: 'review_queue_update', payload: { pendingCount: getPendingReviewCount(db) } });
        return reply.send({ success: true });
    });
    // ── POST /api/bookkeeping/review-queue/bulk-approve ─────────────────────────
    fastify.post('/api/bookkeeping/review-queue/bulk-approve', async (_req, reply) => {
        const count = bulkApproveQueue(db);
        wsEmit({ type: 'review_queue_update', payload: { pendingCount: 0 } });
        return reply.send({ approved: count });
    });
    // ── GET /api/bookkeeping/pl ───────────────────────────────────────────────────
    fastify.get('/api/bookkeeping/pl', async (req, reply) => {
        const now = new Date();
        const start = req.query.start ?? `${now.getFullYear()}-01-01`;
        const end = req.query.end ?? now.toISOString().slice(0, 10);
        const pl = generateProfitAndLoss(db, start, end);
        return reply.send(pl);
    });
    // ── GET /api/bookkeeping/tax-summary ─────────────────────────────────────────
    fastify.get('/api/bookkeeping/tax-summary', async (req, reply) => {
        const year = parseInt(req.query.year ?? String(new Date().getFullYear()), 10);
        const summary = generateTaxSummary(db, year);
        return reply.send(summary);
    });
    // ── GET /api/bookkeeping/vat ──────────────────────────────────────────────────
    fastify.get('/api/bookkeeping/vat', async (_req, reply) => {
        const periods = getAllVatPeriods(db);
        return reply.send({ periods });
    });
    // ── POST /api/bookkeeping/vat/:quarter/file ───────────────────────────────────
    fastify.post('/api/bookkeeping/vat/:quarter/file', async (req, reply) => {
        const quarter = parseInt(req.params.quarter, 10);
        const year = req.body?.year ?? new Date().getFullYear();
        const ok = markVatPeriodFiled(db, year, quarter);
        if (!ok)
            return reply.status(404).send({ error: 'Period not found or already filed' });
        return reply.send({ success: true });
    });
    // ── GET /api/bookkeeping/export/csv ──────────────────────────────────────────
    fastify.get('/api/bookkeeping/export/csv', async (req, reply) => {
        const now = new Date();
        const start = req.query.start ?? `${now.getFullYear()}-01-01`;
        const end = req.query.end ?? now.toISOString().slice(0, 10);
        const csv = exportToCSV(db, start, end);
        return reply
            .header('Content-Type', 'text/csv; charset=utf-8')
            .header('Content-Disposition', `attachment; filename="bunqsy-export-${start}-${end}.csv"`)
            .send(csv);
    });
    // ── GET /api/bookkeeping/export/mt940 ─────────────────────────────────────────
    fastify.get('/api/bookkeeping/export/mt940', async (req, reply) => {
        const now = new Date();
        const start = req.query.start ?? `${now.getFullYear()}-01-01`;
        const end = req.query.end ?? now.toISOString().slice(0, 10);
        const iban = getIBAN();
        const mt940 = exportToMT940(db, start, end, iban);
        return reply
            .header('Content-Type', 'text/plain; charset=utf-8')
            .header('Content-Disposition', `attachment; filename="bunqsy-export-${start}-${end}.mt940"`)
            .send(mt940);
    });
    // ── GET /api/bookkeeping/status ───────────────────────────────────────────────
    fastify.get('/api/bookkeeping/status', async (_req, reply) => {
        const uncategorized = getUncategorizedCount(db);
        const pendingReview = getPendingReviewCount(db);
        const totalRow = db.prepare(`SELECT COUNT(*) as cnt FROM transactions`).get();
        const journalRow = db.prepare(`SELECT COUNT(*) as cnt FROM journal_entries`).get();
        return reply.send({
            totalTransactions: totalRow.cnt,
            journalEntries: journalRow.cnt,
            uncategorized,
            pendingReview,
        });
    });
}
