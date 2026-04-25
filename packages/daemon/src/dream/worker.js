/**
 * Dream Mode Worker — runs in a forked child process.
 * CONSTITUTIONAL RULE: Must NOT import execute.ts or make bunq write calls.
 * Opens its own DB connection (new process = new module scope).
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../../../.env') });
import Database from 'better-sqlite3';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { generateDNACard } from './dna.js';
import { getAllPatterns, insertPattern, updatePatternConfidence } from '../memory/patterns.js';
import { getRecentTransactions } from '../memory/transactions.js';
import { getProfile, getGoals } from '../memory/profile.js';
// ─── Claude output schema ─────────────────────────────────────────────────────
const PatternUpdateSchema = z.object({
    id: z.string(),
    newConfidence: z.number().min(0).max(1),
});
const NewPatternSchema = z.object({
    name: z.string(),
    description: z.string(),
    triggerConditions: z.record(z.unknown()),
    interventionTemplate: z.record(z.unknown()),
    confidence: z.number().min(0).max(1).default(0.5),
});
const BriefingOutputSchema = z.object({
    insights: z.array(z.string()).min(1).max(5),
    patternUpdates: z.array(PatternUpdateSchema),
    newPatterns: z.array(NewPatternSchema).max(2),
    briefingText: z.string().min(1),
    suggestions: z.array(z.string()).length(3),
});
// ─── Main worker logic ────────────────────────────────────────────────────────
async function runWorker() {
    const startMs = Date.now();
    const sessionId = process.env['DREAM_SESSION_ID'];
    if (!sessionId)
        throw new Error('DREAM_SESSION_ID not set in worker env');
    const dbPath = process.env['DB_PATH'] ?? './bunqsy.db';
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    const apiKey = process.env['ANTHROPIC_API_KEY'];
    if (!apiKey)
        throw new Error('ANTHROPIC_API_KEY not set');
    const client = new Anthropic({ apiKey });
    // ── Load context ─────────────────────────────────────────────────────────────
    const transactions = getRecentTransactions(db, 200); // last N transactions
    const patterns = getAllPatterns(db);
    const profile = getProfile(db);
    const goals = getGoals(db);
    // Filter to last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const recentTx = transactions.filter(t => t.created_at >= sevenDaysAgo);
    // ── Build prompt context ──────────────────────────────────────────────────────
    const txSummary = buildTransactionSummary(recentTx);
    const patternsSummary = buildPatternsSummary(patterns);
    const profileSummary = profile
        ? `Name: ${profile.name ?? 'Unknown'}, Salary day: ${profile.salary_day ?? '?'}, Rent day: ${profile.rent_day ?? '?'}`
        : 'Profile not configured';
    const goalsSummary = goals.length > 0
        ? goals.map(g => `${g.name}: €${g.current_amount}/${g.target_amount}`).join(', ')
        : 'No goals set';
    const systemPrompt = `You are BUNQSY, a financial AI running its nightly Dream Mode analysis.
Analyse the user's last 7 days of financial activity and return ONLY valid JSON — no markdown, no extra text.

Return this exact structure:
{
  "insights": ["3-5 brief spending insights from the week"],
  "patternUpdates": [{"id": "<existing-pattern-id>", "newConfidence": 0.0-1.0}],
  "newPatterns": [
    {
      "name": "Pattern name",
      "description": "Description",
      "triggerConditions": {},
      "interventionTemplate": {},
      "confidence": 0.5
    }
  ],
  "briefingText": "3-4 sentence conversational morning briefing",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}

Rules:
- insights: 3-5 factual observations from the transaction data
- patternUpdates: adjust confidence for existing patterns based on evidence (only include if changed)
- newPatterns: suggest 0-2 NEW patterns not already in the list (omit array or use empty array if none needed)
- briefingText: warm, conversational, 3-4 sentences — what happened this week + what to watch
- suggestions: exactly 3 specific, actionable suggestions for the coming week`;
    const userContent = [
        `## Transactions (last 7 days)\n${txSummary}`,
        `## Existing patterns\n${patternsSummary}`,
        `## Profile\n${profileSummary}`,
        `## Goals\n${goalsSummary}`,
    ].join('\n\n');
    // ── Claude briefing call ──────────────────────────────────────────────────────
    const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1400,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
    });
    const block = msg.content[0];
    if (!block || block.type !== 'text')
        throw new Error('Claude returned no text');
    const jsonText = block.text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
    const parsed = JSON.parse(jsonText);
    const briefingData = BriefingOutputSchema.parse(parsed);
    // ── Apply pattern confidence updates ─────────────────────────────────────────
    let patternsUpdated = 0;
    for (const update of briefingData.patternUpdates) {
        const existing = patterns.find(p => p.id === update.id);
        if (existing) {
            updatePatternConfidence(db, update.id, update.newConfidence);
            patternsUpdated++;
        }
    }
    // ── Insert new patterns ───────────────────────────────────────────────────────
    let patternsCreated = 0;
    for (const np of briefingData.newPatterns) {
        insertPattern(db, {
            id: uuid(),
            name: np.name,
            description: np.description,
            triggerConditions: np.triggerConditions,
            interventionTemplate: np.interventionTemplate,
            confidence: np.confidence,
        });
        patternsCreated++;
    }
    // ── Generate DNA card ─────────────────────────────────────────────────────────
    const dnaCard = await generateDNACard(patterns, profile, briefingData.insights);
    // ── Send completion to parent ─────────────────────────────────────────────────
    const durationMs = Date.now() - startMs;
    const completeMsg = {
        type: 'COMPLETE',
        briefingText: briefingData.briefingText,
        dnaCard,
        suggestions: briefingData.suggestions,
        patternsUpdated,
        patternsCreated,
        durationMs,
    };
    process.send?.(completeMsg);
    db.close();
    process.exit(0);
}
// ─── Summary builders ─────────────────────────────────────────────────────────
function buildTransactionSummary(txs) {
    if (txs.length === 0)
        return 'No transactions in the last 7 days.';
    const totalSpend = txs
        .filter(t => t.amount < 0)
        .reduce((s, t) => s + Math.abs(t.amount), 0);
    const byCategory = {};
    for (const tx of txs) {
        if (tx.amount < 0) {
            const cat = tx.category ?? 'uncategorized';
            byCategory[cat] = (byCategory[cat] ?? 0) + Math.abs(tx.amount);
        }
    }
    const catLines = Object.entries(byCategory)
        .sort(([, a], [, b]) => b - a)
        .map(([cat, amount]) => `  ${cat}: €${amount.toFixed(2)}`)
        .join('\n');
    const topTxLines = txs.slice(0, 10).map(t => `  ${t.created_at.slice(0, 10)} | €${t.amount.toFixed(2)} | ${t.counterparty_name ?? 'Unknown'} | ${t.description ?? ''}`).join('\n');
    return [
        `Total spend: €${totalSpend.toFixed(2)} across ${txs.length} transactions`,
        `By category:\n${catLines || '  none categorised'}`,
        `Recent transactions:\n${topTxLines}`,
    ].join('\n');
}
function buildPatternsSummary(patterns) {
    if (patterns.length === 0)
        return 'No patterns learned yet.';
    return patterns.slice(0, 10).map(p => `- [${p.id}] ${p.name} (conf: ${(p.confidence * 100).toFixed(0)}%, hits: ${p.hit_count})`).join('\n');
}
// ─── Run ──────────────────────────────────────────────────────────────────────
runWorker().catch((err) => {
    const errorMsg = {
        type: 'ERROR',
        error: err instanceof Error ? err.message : String(err),
    };
    process.send?.(errorMsg);
    process.exit(1);
});
