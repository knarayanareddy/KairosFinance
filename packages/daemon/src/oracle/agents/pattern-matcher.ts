import { z } from 'zod';
import type Database from 'better-sqlite3';
import type { OracleVote, PatternRow } from '@bunqsy/shared';
import { getAllEnabledPatterns } from '../../memory/patterns.js';
import { getDailySpend, getAverageDailySpend, getRecentTransactions } from '../../memory/transactions.js';
import { isSqliteVecLoaded } from '../../memory/db.js';
import { searchSimilarPatterns } from '../../memory/vector.js';
import type { RecallSnapshot } from '../../heartbeat/recall.js';

// ─── Ollama embed response schema ─────────────────────────────────────────────

const OllamaEmbedResponseSchema = z.object({
  embeddings: z.array(z.array(z.number())).min(1),
});

// ─── Pattern trigger_conditions schema (permissive) ──────────────────────────

const TriggerConditionsSchema = z.object({
  minDailySpendEur: z.number().optional(),
  maxBalanceCents:  z.number().optional(),
  minBalanceCents:  z.number().optional(),
  category:         z.string().optional(),
  isRecurring:      z.boolean().optional(),
}).passthrough();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildActivityText(
  snapshot: RecallSnapshot,
  dailySpend: number,
  avgDailySpend: number,
  db: Database.Database,
): string {
  const txs = getRecentTransactions(db, 5, snapshot.primaryAccountId);
  const txParts = txs.map((tx) => {
    const sign = tx.amount > 0 ? '+' : '';
    const cat = tx.category ? ` (${tx.category})` : '';
    return `${sign}€${tx.amount.toFixed(2)} ${tx.counterparty_name ?? 'unknown'}${cat}`;
  });
  return [
    `Balance €${(snapshot.balanceCents / 100).toFixed(2)}.`,
    `Daily spend €${dailySpend.toFixed(2)} vs 30d avg €${avgDailySpend.toFixed(2)}.`,
    `Recent: ${txParts.join(', ')}.`,
  ].join(' ');
}

async function embedText(text: string): Promise<number[]> {
  const base = process.env['OLLAMA_URL'] ?? 'http://localhost:11434';
  const res = await fetch(`${base}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env['OLLAMA_EMBED_MODEL'] ?? 'nomic-embed-text', input: text }),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const parsed = OllamaEmbedResponseSchema.parse(await res.json());
  const embedding = parsed.embeddings[0]; // .min(1) guarantees existence
  if (embedding.length !== 768) {
    throw new Error(`Expected 768-dim embedding, got ${embedding.length}`);
  }
  return embedding;
}

function matchesTrigger(
  pattern: PatternRow,
  snapshot: RecallSnapshot,
  dailySpend: number,
): boolean {
  let conditions: z.infer<typeof TriggerConditionsSchema>;
  try {
    conditions = TriggerConditionsSchema.parse(JSON.parse(pattern.trigger_conditions));
  } catch {
    return false;
  }

  if (conditions.minDailySpendEur !== undefined && dailySpend < conditions.minDailySpendEur) return false;
  if (conditions.maxBalanceCents !== undefined && snapshot.balanceCents > conditions.maxBalanceCents) return false;
  if (conditions.minBalanceCents !== undefined && snapshot.balanceCents < conditions.minBalanceCents) return false;

  return true;
}

// ─── Agent entry point ────────────────────────────────────────────────────────

export async function run(
  snapshot: RecallSnapshot,
  db: Database.Database,
): Promise<OracleVote> {
  const patterns = getAllEnabledPatterns(db);

  if (patterns.length === 0) {
    return {
      agentId:         'pattern-matcher',
      riskScore:       0,
      rationale:       'No enabled patterns to match against',
      shouldIntervene: false,
    };
  }

  const dailySpend  = getDailySpend(db, snapshot.primaryAccountId);
  const avgDailySpend = getAverageDailySpend(db, snapshot.primaryAccountId, 30);

  // ── Attempt vector search first ───────────────────────────────────────────
  if (isSqliteVecLoaded()) {
    try {
      const text = buildActivityText(snapshot, dailySpend, avgDailySpend, db);
      const embedding = await embedText(text);
      const similar = searchSimilarPatterns(db, embedding, 3);

      if (similar.length > 0) {
        const top = similar[0];
        const matched = patterns.find((p) => p.id === top.patternId);
        if (matched) {
          const riskScore = Math.round(matched.confidence * 100);
          return {
            agentId:         'pattern-matcher',
            riskScore,
            rationale:       `Vector match: "${matched.name}" (conf ${matched.confidence.toFixed(2)}, dist ${top.distance.toFixed(3)})`,
            shouldIntervene: riskScore >= 60,
            suggestedType:   riskScore >= 60 ? 'PATTERN_MATCH' : undefined,
          };
        }
      }

      return {
        agentId:         'pattern-matcher',
        riskScore:       5,
        rationale:       'No similar patterns found via vector search',
        shouldIntervene: false,
      };
    } catch (err: unknown) {
      // Degrade gracefully — vector search failure falls through to SQL
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[pattern-matcher] Vector search failed, using SQL fallback: ${msg}`);
    }
  }

  // ── SQL trigger_conditions fallback ──────────────────────────────────────
  const matched = patterns
    .filter((p) => matchesTrigger(p, snapshot, dailySpend))
    .sort((a, b) => b.confidence - a.confidence);

  if (matched.length === 0) {
    return {
      agentId:         'pattern-matcher',
      riskScore:       5,
      rationale:       'No patterns triggered (SQL conditions matching)',
      shouldIntervene: false,
    };
  }

  const top = matched[0];
  const riskScore = Math.round(top.confidence * 100);

  return {
    agentId:         'pattern-matcher',
    riskScore,
    rationale:       `SQL match: "${top.name}" (confidence ${top.confidence.toFixed(2)})`,
    shouldIntervene: riskScore >= 60,
    suggestedType:   riskScore >= 60 ? 'PATTERN_MATCH' : undefined,
  };
}
