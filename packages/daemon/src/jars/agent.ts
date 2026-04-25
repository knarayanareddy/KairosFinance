import { v4 as uuid } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type Database from 'better-sqlite3';
import type { ExecutionStep } from '@bunqsy/shared';
import { getProfile, getGoals } from '../memory/profile.js';
import { createExecutionPlan } from '../bunq/execute.js';
import { wsEmit } from '../routes/ws.js';
import type { RecallSnapshot } from '../heartbeat/recall.js';

// ─── Claude output schema ─────────────────────────────────────────────────────

const JarTransferSchema = z.object({
  jarId:     z.number(),
  jarName:   z.string(),
  amount:    z.number().positive(),
  rationale: z.string(),
});

const JarSplitSchema = z.object({
  transfers: z.array(JarTransferSchema),
  narrative: z.string().min(1),
});

type JarSplit = z.infer<typeof JarSplitSchema>;

// ─── System prompt ────────────────────────────────────────────────────────────

const AGENT_SYSTEM = `You are BUNQSY, a proactive savings allocation agent.
The user's salary just landed. Allocate it across their savings goals intelligently.

Allocation rules (apply in order, stop when salary is exhausted):
1. Rent reserve: if rent is due within 14 days, ring-fence the full rent amount first
2. Emergency fund: allocate 10% of salary to the emergency fund goal if it is below target
3. Time-urgent goals: allocate proportionally to goals where target_date is within 90 days
4. Remaining goals: allocate proportionally by shortfall (target - current)
5. Any remaining amount stays in the primary account — do NOT allocate more than 60% of salary total

Only include goals that have a jar_account_id. Never exceed the salary amount in total transfers.

Return ONLY valid JSON — no markdown, no explanation:
{
  "transfers": [
    { "jarId": <number>, "jarName": "<name>", "amount": <number>, "rationale": "<one sentence>" }
  ],
  "narrative": "<2–3 sentences explaining the full allocation in plain English, first person>"
}

If no allocation is appropriate (no goals linked, rent reserves everything, etc.),
return { "transfers": [], "narrative": "Your full salary is reserved for upcoming expenses." }`;

// ─── Main agent function ──────────────────────────────────────────────────────

export interface AgentResult {
  planId:      string | null;
  narratedText: string;
}

export async function runSavingsJarAgent(
  snapshot: RecallSnapshot,
  db:       Database.Database,
): Promise<AgentResult> {
  const profile = getProfile(db);
  const goals   = getGoals(db).filter(g => g.jar_account_id !== null && g.enabled);

  if (!profile?.salary_amount) {
    return { planId: null, narratedText: 'Salary amount not configured in your profile.' };
  }

  if (goals.length === 0) {
    return { planId: null, narratedText: 'No savings goals with linked jar accounts found.' };
  }

  const salaryEur  = profile.salary_amount;
  const rentAmount = profile.rent_amount ?? 0;
  const rentDay    = profile.rent_day ?? null;

  const today     = new Date();
  const daysToRent = rentDay !== null
    ? ((rentDay - today.getDate() + 31) % 31)  // days until next rent day
    : 99;

  // Build goal context for Claude
  const goalsContext = goals.map(g => {
    const urgency = g.target_date
      ? `target date: ${g.target_date} (${Math.max(0, Math.ceil((new Date(g.target_date).getTime() - Date.now()) / 86_400_000))} days left)`
      : 'no target date';
    return `- ${g.name} (jarId: ${g.jar_account_id}, current: €${g.current_amount}, target: €${g.target_amount}, ${urgency})`;
  }).join('\n');

  const context = [
    `Salary amount: €${salaryEur.toFixed(2)}`,
    `Current account balance: €${(snapshot.balanceCents / 100).toFixed(2)}`,
    `Rent: €${rentAmount.toFixed(2)}, due in ${daysToRent} day(s)`,
    `Savings goals with jar accounts:\n${goalsContext}`,
  ].join('\n');

  // ── Claude call ──────────────────────────────────────────────────────────────
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) return { planId: null, narratedText: 'ANTHROPIC_API_KEY not configured.' };

  const client = new Anthropic({ apiKey });

  let split: JarSplit;
  try {
    const msg = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system:     AGENT_SYSTEM,
      messages:   [{ role: 'user', content: context }],
    });

    const block = msg.content[0];
    if (!block || block.type !== 'text') throw new Error('No text block');

    const jsonText = block.text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(jsonText) as unknown;
    split = JarSplitSchema.parse(parsed);
  } catch (err) {
    console.error('[jars] Claude allocation failed:', err instanceof Error ? err.message : String(err));
    // Graceful fallback: one 10% transfer to the first goal
    const firstGoal = goals[0]!;
    split = {
      transfers: [{
        jarId:     firstGoal.jar_account_id!,
        jarName:   firstGoal.name,
        amount:    parseFloat((salaryEur * 0.10).toFixed(2)),
        rationale: 'Automatic 10% allocation to first savings goal',
      }],
      narrative: `I've set aside 10% of your salary (€${(salaryEur * 0.10).toFixed(2)}) for your "${firstGoal.name}" goal.`,
    };
  }

  if (split.transfers.length === 0) {
    return { planId: null, narratedText: split.narrative };
  }

  // ── Build ExecutionPlan steps ─────────────────────────────────────────────
  const steps: ExecutionStep[] = split.transfers.map(t => ({
    id:          uuid(),
    type:        'SAVINGS_TRANSFER' as const,
    description: `Transfer €${t.amount.toFixed(2)} to "${t.jarName}" — ${t.rationale}`,
    payload: {
      fromAccountId: snapshot.primaryAccountId,
      toAccountId:   t.jarId,
      amount:        t.amount.toFixed(2),
      currency:      'EUR',
      description:   `BUNQSY auto-save: ${t.jarName}`,
    },
  }));

  const totalAllocated = split.transfers.reduce((s, t) => s + t.amount, 0);

  const narratedText =
    `Your salary of €${salaryEur.toFixed(2)} just landed. ` +
    split.narrative +
    ` Total allocated: €${totalAllocated.toFixed(2)} across ${steps.length} jar${steps.length !== 1 ? 's' : ''}. ` +
    `Confirm to execute all transfers automatically.`;

  const plan = await createExecutionPlan(steps, narratedText);

  // Broadcast to connected clients immediately
  wsEmit({ type: 'plan_update', payload: plan });

  return { planId: plan.id, narratedText };
}
