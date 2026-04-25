import Anthropic from '@anthropic-ai/sdk';
import type Database from 'better-sqlite3';
import type { CategorizationResult, TaxCategory, VatRate } from '@bunqsy/shared';
import { TaxCategorySchema, VatRateSchema, CategorizationResultSchema } from '@bunqsy/shared';
import { matchCategoryRules } from './rules.js';

interface TxRow {
  id: string;
  counterparty_name: string | null;
  description: string | null;
  amount: number;
}

interface CorrectionRow {
  new_category: string;
  cnt: number;
}

const LLM_THRESHOLD = parseFloat(process.env['LLM_CATEGORIZE_CONFIDENCE_THRESHOLD'] ?? '0.70');
const REVIEW_THRESHOLD_CENTS = parseInt(process.env['REVIEW_THRESHOLD_AMOUNT_CENTS'] ?? '50000', 10);

// ─── Tier 2: pattern match from correction history ───────────────────────────

function getPatternMatch(
  db: Database.Database,
  counterparty: string,
): TaxCategory | null {
  const row = db.prepare(`
    SELECT new_category, COUNT(*) as cnt
    FROM categorization_corrections
    WHERE counterparty = ?
    GROUP BY new_category
    ORDER BY cnt DESC
    LIMIT 1
  `).get(counterparty) as CorrectionRow | undefined;

  if (!row || row.cnt < 2) return null;

  const parsed = TaxCategorySchema.safeParse(row.new_category);
  return parsed.success ? parsed.data : null;
}

// ─── Tier 3: LLM fallback ────────────────────────────────────────────────────

const CATEGORIES_LIST = TaxCategorySchema.options.join('\n');

async function llmCategorize(
  counterparty: string,
  description: string,
  amountEur: number,
  recentCorrections: string,
): Promise<{ category: TaxCategory; vatRate: VatRate; confidence: number } | null> {
  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 80,
      system: `You are a Dutch tax categorization assistant. Classify transactions for a Netherlands-based freelancer/ZZP-er.
Return ONLY valid JSON: {"category":"<CATEGORY>","vatRate":"<VAT>","confidence":<0-1>}
Categories:\n${CATEGORIES_LIST}
VAT rates: 0, 9, 21, EXEMPT
Rules: income is never a business expense; meals are 9% VAT, 80% deductible; travel (air) = 0% VAT; software/SaaS = 21%; groceries = 9%; healthcare = EXEMPT.
${recentCorrections ? `Recent corrections from this user:\n${recentCorrections}` : ''}`,
      messages: [{
        role: 'user',
        content: `Counterparty: ${counterparty}\nDescription: ${description}\nAmount: €${amountEur.toFixed(2)}`,
      }],
    });

    const text = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : '';
    const jsonMatch = text.match(/\{[^}]+\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as { category: string; vatRate: string; confidence: number };
    const catParsed = TaxCategorySchema.safeParse(parsed.category);
    const vatParsed = VatRateSchema.safeParse(String(parsed.vatRate));
    if (!catParsed.success || !vatParsed.success) return null;

    return {
      category:   catParsed.data,
      vatRate:    vatParsed.data,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5)),
    };
  } catch {
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function categorizeTx(
  db: Database.Database,
  tx: TxRow,
): Promise<CategorizationResult> {
  const counterparty = (tx.counterparty_name ?? '').trim();
  const description  = (tx.description ?? '').trim();
  const amountEur    = Math.abs(tx.amount);
  const amountCents  = Math.round(amountEur * 100);

  // Tier 1: rule-based
  const rule = matchCategoryRules(counterparty, description);
  if (rule && rule.confidence >= 0.95) {
    const reviewRequired = amountCents > REVIEW_THRESHOLD_CENTS;
    return CategorizationResultSchema.parse({
      category:          rule.category,
      confidence:        rule.confidence,
      vatRate:           rule.vatRate,
      isBusinessExpense: rule.isBusinessExpense,
      deductibilityPct:  rule.deductibilityPct,
      reviewRequired,
      reviewReason:      reviewRequired ? `Large amount: €${amountEur.toFixed(2)}` : undefined,
      method:            'rule',
    });
  }

  // Tier 2: corrections history
  const patternCat = getPatternMatch(db, counterparty);
  if (patternCat) {
    const ruleHint = matchCategoryRules(counterparty, description);
    const reviewRequired = amountCents > REVIEW_THRESHOLD_CENTS;
    return CategorizationResultSchema.parse({
      category:          patternCat,
      confidence:        0.88,
      vatRate:           ruleHint?.vatRate ?? '21',
      isBusinessExpense: ruleHint?.isBusinessExpense ?? false,
      deductibilityPct:  ruleHint?.deductibilityPct ?? 100,
      reviewRequired,
      reviewReason:      reviewRequired ? `Large amount: €${amountEur.toFixed(2)}` : undefined,
      method:            'pattern',
    });
  }

  // Tier 3: LLM
  const recentRows = db.prepare(`
    SELECT counterparty, old_category, new_category
    FROM categorization_corrections
    ORDER BY corrected_at DESC LIMIT 10
  `).all() as { counterparty: string; old_category: string; new_category: string }[];
  const recentCorrections = recentRows
    .map(r => `${r.counterparty}: ${r.old_category} → ${r.new_category}`)
    .join('\n');

  const llmResult = await llmCategorize(counterparty, description, amountEur, recentCorrections);

  if (llmResult && llmResult.confidence >= LLM_THRESHOLD) {
    const reviewRequired = llmResult.confidence < 0.80 || amountCents > REVIEW_THRESHOLD_CENTS;
    const reasons: string[] = [];
    if (llmResult.confidence < 0.80) reasons.push(`Low confidence: ${Math.round(llmResult.confidence * 100)}%`);
    if (amountCents > REVIEW_THRESHOLD_CENTS) reasons.push(`Large amount: €${amountEur.toFixed(2)}`);

    return CategorizationResultSchema.parse({
      category:          llmResult.category,
      confidence:        llmResult.confidence,
      vatRate:           llmResult.vatRate,
      isBusinessExpense: llmResult.category.startsWith('BIZ_') || llmResult.category.startsWith('INCOME_'),
      deductibilityPct:  llmResult.category === 'BIZ_MEALS' ? 80 : (llmResult.category.startsWith('BIZ_') ? 100 : 0),
      reviewRequired,
      reviewReason:      reasons.join('; ') || undefined,
      method:            'llm',
    });
  }

  // Fallback: UNCATEGORIZED, always review
  return CategorizationResultSchema.parse({
    category:          'UNCATEGORIZED',
    confidence:        0.0,
    vatRate:           'EXEMPT',
    isBusinessExpense: false,
    deductibilityPct:  0,
    reviewRequired:    true,
    reviewReason:      'Could not determine category automatically',
    method:            'llm',
  });
}

/** Batch-categorize transactions that don't have a journal entry yet. */
export async function categorizePending(
  db: Database.Database,
  limit: number = 5,
): Promise<number> {
  const rows = db.prepare(`
    SELECT t.id, t.counterparty_name, t.description, t.amount
    FROM transactions t
    LEFT JOIN journal_entries j ON j.tx_id = t.id
    WHERE j.id IS NULL AND t.journal_entry_id IS NULL
    ORDER BY t.created_at DESC
    LIMIT ?
  `).all(limit) as TxRow[];

  let count = 0;
  for (const tx of rows) {
    try {
      const result = await categorizeTx(db, tx);
      const { insertJournalEntry } = await import('./ledger.js');
      insertJournalEntry(db, tx.id, tx.amount, tx.description ?? '', result);
      count++;
    } catch {
      // Non-fatal: skip this tx
    }
  }
  return count;
}
