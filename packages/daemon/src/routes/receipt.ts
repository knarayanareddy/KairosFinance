import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
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

    const result: ReceiptResult = {
      receipt,
      lineItemSumValid,
      lineItemSum,
      matched,
      matchedTransactionId,
      insight,
    };

    return reply.send(result);
  });
}
