import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import type Database from 'better-sqlite3';
import type { OracleVerdict, ExecutionStep } from '@bunqsy/shared';
import { createExecutionPlan } from '../../bunq/execute.js';
import type { RecallSnapshot } from '../../heartbeat/recall.js';
import type { HandlerResult } from '../types.js';

// ─── Schema to extract bunq draft payment ID from a step result ───────────────

const BunqDraftCreatedSchema = z.object({
  Response: z.array(
    z.object({ Id: z.object({ id: z.number() }).passthrough() }).passthrough(),
  ).min(1),
});

interface ExecRow {
  bunq_response: string | null;
  plan_steps:    string;
}

/**
 * Looks for the most recently executed DRAFT_PAYMENT step whose bunq response
 * contains a parseable draft payment ID. Returns the ID as a string, or null
 * if none found.
 */
function findCancellableDraftId(db: Database.Database): string | null {
  const rows = db.prepare(`
    SELECT esr.bunq_response, ep.steps AS plan_steps
    FROM execution_step_results esr
    JOIN execution_plans        ep  ON ep.id = esr.plan_id
    WHERE esr.success = 1
    ORDER BY esr.executed_at DESC
    LIMIT 20
  `).all() as ExecRow[];

  for (const row of rows) {
    let steps: Array<{ type: string }>;
    try {
      steps = JSON.parse(row.plan_steps) as Array<{ type: string }>;
    } catch {
      continue;
    }
    if (!steps.some((s) => s.type === 'DRAFT_PAYMENT')) continue;
    if (!row.bunq_response) continue;

    try {
      const parsed = BunqDraftCreatedSchema.safeParse(JSON.parse(row.bunq_response));
      if (parsed.success) {
        return String(parsed.data.Response[0].Id.id);
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ─── Agent entry point ────────────────────────────────────────────────────────

export async function run(
  verdict:   OracleVerdict,
  _snapshot: RecallSnapshot,
  db:        Database.Database,
): Promise<HandlerResult> {
  // Only attempt to draft a CANCEL_DRAFT plan if a vote explicitly flagged FREEZE_CARD
  const wantsCancelDraft = verdict.votes.some((v) => v.suggestedType === 'FREEZE_CARD');

  if (wantsCancelDraft) {
    const draftPaymentId = findCancellableDraftId(db);

    if (draftPaymentId !== null) {
      const step: ExecutionStep = {
        id:          uuid(),
        type:        'CANCEL_DRAFT',
        description: `Cancel suspicious draft payment ${draftPaymentId}`,
        payload:     { draftPaymentId },
      };

      const plan = await createExecutionPlan(
        [step],
        `BUNQSY detected suspicious activity linked to a pending payment (ID ${draftPaymentId}). Confirming this will cancel it immediately.`,
      );

      return { type: 'FREEZE_CARD', modality: 'CARD', planId: plan.id };
    }
  }

  // No cancellable draft found — fraud alert only
  return {
    type:     'FRAUD',
    modality: 'CARD',
    planId:   null,
  };
}
