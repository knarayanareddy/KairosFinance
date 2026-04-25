import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import { getDb } from '../memory/db.js';
import { extractReceipt } from '../receipt/extractor.js';
import { verifyLineItems } from '../receipt/verifier.js';
import { categorizeReceipt } from '../receipt/categorizer.js';
import type { ReceiptResult } from '@bunqsy/shared';

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
]);

export async function registerReceiptRoute(fastify: FastifyInstance): Promise<void> {
  // ── POST /api/receipt ────────────────────────────────────────────────────────
  fastify.post('/api/receipt', async (req: FastifyRequest, reply: FastifyReply) => {
    const uploaded = await req.file();

    if (!uploaded) {
      return reply.status(400).send({ error: 'No image file uploaded' });
    }

    const mimeType = uploaded.mimetype || 'image/jpeg';
    const normMime = mimeType.split(';')[0]?.trim() ?? mimeType;

    if (!ALLOWED_MIME.has(normMime)) {
      return reply.status(415).send({
        error: `Unsupported image type: ${normMime}. Use JPEG, PNG, WebP, or GIF.`,
      });
    }

    const imageBuffer = await uploaded.toBuffer();

    if (imageBuffer.length === 0) {
      return reply.status(400).send({ error: 'Image file is empty' });
    }

    // ── Step 1: Claude Vision extraction ──────────────────────────────────────
    let receipt;
    try {
      receipt = await extractReceipt(imageBuffer, mimeType);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[receipt] Extraction failed:', message);
      return reply.status(502).send({ error: `Receipt extraction failed: ${message}` });
    }

    // ── Step 2: Self-verify line item sums ────────────────────────────────────
    const { valid: lineItemSumValid, lineItemSum } = verifyLineItems(receipt);

    // ── Step 3: Match to transaction + generate insight ────────────────────────
    const db = getDb();
    const { matched, matchedTransactionId, insight } = categorizeReceipt(db, receipt);

    // ── Step 4: Persist receipt ────────────────────────────────────────────────
    const receiptId = randomUUID();
    db.prepare(`
      INSERT INTO receipts
        (id, merchant, total, currency, date, category, line_items, confidence, matched_tx_id, insight)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      receiptId,
      receipt.merchant,
      receipt.total,
      receipt.currency,
      receipt.date,
      receipt.category,
      JSON.stringify(receipt.lineItems),
      receipt.confidence,
      matchedTransactionId,
      insight,
    );

    const result: ReceiptResult = {
      receiptId,
      receipt,
      lineItemSumValid,
      lineItemSum,
      matched,
      matchedTransactionId,
      insight,
    };

    return reply.send(result);
  });

  // ── POST /api/receipt/:id/log-expense ─────────────────────────────────────
  // Manually logs a scanned receipt as a transaction when no auto-match was found.
  fastify.post(
    '/api/receipt/:id/log-expense',
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const db = getDb();
      const row = db
        .prepare(`SELECT * FROM receipts WHERE id = ?`)
        .get(req.params.id) as {
          id: string; merchant: string; total: number; currency: string;
          date: string; category: string; logged_expense: number;
        } | undefined;

      if (!row) return reply.status(404).send({ error: 'Receipt not found' });
      if (row.logged_expense) return reply.send({ alreadyLogged: true });

      // Insert as a manual (non-bunq) transaction with a negative amount (debit)
      const txId = `receipt-${row.id}`;
      db.prepare(`
        INSERT OR IGNORE INTO transactions
          (id, bunq_account_id, amount, currency, counterparty_name, description, category, created_at)
        VALUES (?, 0, ?, ?, ?, ?, ?, ?)
      `).run(
        txId,
        -Math.abs(row.total),
        row.currency,
        row.merchant,
        `Receipt scan — ${row.merchant}`,
        row.category,
        row.date + 'T12:00:00Z',
      );

      db.prepare(`UPDATE receipts SET logged_expense = 1 WHERE id = ?`).run(row.id);

      return reply.send({ logged: true, transactionId: txId });
    },
  );
}
