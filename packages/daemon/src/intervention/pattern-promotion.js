import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { insertPattern } from '../memory/patterns.js';
const PROMOTION_SYSTEM = `You analyze confirmed user interventions to decide if they represent a repeatable financial behavior pattern worth tracking.

If yes, respond ONLY with JSON matching exactly:
{
  "isPattern": true,
  "name": "short pattern name (3-5 words)",
  "description": "one-sentence description of when this pattern fires",
  "triggerConditions": {
    "keywords": ["keyword1", "keyword2"],
    "amountThreshold": 0,
    "category": "optional spend category"
  },
  "interventionTemplate": {
    "type": "VELOCITY_SPIKE",
    "modalitySuggestion": "CARD"
  }
}

If this is a one-off event that does NOT suggest a repeatable pattern, respond ONLY with:
{"isPattern": false}

No markdown. No explanation. Valid JSON only.`;
const PatternProposalSchema = z.discriminatedUnion('isPattern', [
    z.object({
        isPattern: z.literal(true),
        name: z.string().min(1).max(80),
        description: z.string().min(1).max(300),
        triggerConditions: z.record(z.unknown()),
        interventionTemplate: z.record(z.unknown()),
    }),
    z.object({ isPattern: z.literal(false) }),
]);
export async function offerPatternPromotion(db, interventionType, narration, votes) {
    const client = new Anthropic();
    const flaggedSignals = votes
        .filter(v => v.shouldIntervene)
        .map(v => `${v.agentId} (risk ${v.riskScore}): ${v.rationale}`)
        .join('; ');
    const userPrompt = `Confirmed intervention:\n` +
        `Type: ${interventionType}\n` +
        `Narration: ${narration}\n` +
        `Agent signals: ${flaggedSignals || 'none'}\n\n` +
        `Does confirming this action represent a repeatable financial behavior pattern worth tracking?`;
    let raw;
    try {
        const msg = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 300,
            system: PROMOTION_SYSTEM,
            messages: [{ role: 'user', content: userPrompt }],
        });
        raw = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : '';
    }
    catch (err) {
        console.error('[pattern-promotion] Claude call failed:', err instanceof Error ? err.message : err);
        return;
    }
    const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    let parsed;
    try {
        parsed = JSON.parse(json);
    }
    catch {
        return;
    }
    const result = PatternProposalSchema.safeParse(parsed);
    if (!result.success || !result.data.isPattern)
        return;
    const { name, description, triggerConditions, interventionTemplate } = result.data;
    try {
        insertPattern(db, {
            id: uuid(),
            name,
            description,
            triggerConditions,
            interventionTemplate,
            confidence: 0.4,
        });
        console.log(`[pattern-promotion] Pattern promoted: "${name}"`);
    }
    catch (err) {
        console.error('[pattern-promotion] Insert failed:', err instanceof Error ? err.message : err);
    }
}
