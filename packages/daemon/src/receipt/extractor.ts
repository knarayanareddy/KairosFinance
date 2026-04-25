import Anthropic from '@anthropic-ai/sdk';
import { ReceiptDataSchema } from '@bunqsy/shared';
import type { ReceiptData } from '@bunqsy/shared';

const EXTRACT_SYSTEM = `
You are a receipt-parsing assistant for a financial app.
Given a receipt image, extract the data and return ONLY valid JSON — no markdown, no explanation.

Return this exact structure:
{
  "merchant": "Store name",
  "total": 12.50,
  "currency": "EUR",
  "date": "YYYY-MM-DD",
  "lineItems": [
    { "description": "Item name", "quantity": 1, "unitPrice": 5.00, "total": 5.00 }
  ],
  "category": "groceries|dining|transport|entertainment|health|shopping|utilities|other",
  "confidence": 0.95
}

Rules:
- total must be the final amount paid (after tax/discounts)
- date must be ISO 8601 (YYYY-MM-DD); use today if unreadable
- If a field is unreadable, use the most reasonable default
- confidence: 0.0 (unreadable) to 1.0 (perfect scan)
- quantity and unitPrice are optional — omit if not on the receipt
`.trim();

export async function extractReceipt(
  imageBuffer: Buffer,
  mimeType: string,
): Promise<ReceiptData> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  const client = new Anthropic({ apiKey });

  const mediaType = normaliseMediaType(mimeType);
  const base64 = imageBuffer.toString('base64');

  const msg = await client.messages.create({
    model:      'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    system:     EXTRACT_SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          {
            type:   'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          { type: 'text', text: 'Extract all receipt data from this image.' },
        ],
      },
    ],
  });

  const block = msg.content[0];
  if (!block || block.type !== 'text') {
    throw new Error('Claude returned no text block for receipt extraction');
  }

  const jsonText = block.text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`Receipt extraction returned invalid JSON: ${jsonText.slice(0, 200)}`);
  }

  const result = ReceiptDataSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Receipt data failed schema validation: ${result.error.message}`);
  }

  return result.data;
}

function normaliseMediaType(
  mimeType: string,
): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  if (mimeType.includes('png'))  return 'image/png';
  if (mimeType.includes('gif'))  return 'image/gif';
  if (mimeType.includes('webp')) return 'image/webp';
  return 'image/jpeg'; // default for jpg / unknown
}
