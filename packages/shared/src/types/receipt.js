import { z } from 'zod';
export const LineItemSchema = z.object({
    description: z.string(),
    quantity: z.number().optional(),
    unitPrice: z.number().optional(),
    total: z.number(),
});
export const ReceiptDataSchema = z.object({
    merchant: z.string(),
    total: z.number(),
    currency: z.string(),
    date: z.string(), // ISO 8601 date (YYYY-MM-DD)
    lineItems: z.array(LineItemSchema),
    category: z.enum([
        'groceries', 'dining', 'transport', 'entertainment',
        'health', 'shopping', 'utilities', 'other',
    ]),
    confidence: z.number().min(0).max(1),
});
