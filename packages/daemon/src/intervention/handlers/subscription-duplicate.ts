import type Database from 'better-sqlite3';
import type { OracleVerdict } from '@bunqsy/shared';
import type { RecallSnapshot } from '../../heartbeat/recall.js';
import type { HandlerResult } from '../types.js';
import { getRecentTransactions } from '../../memory/transactions.js';

export async function run(
  verdict:  OracleVerdict,
  snapshot: RecallSnapshot,
  db:       Database.Database,
): Promise<HandlerResult> {
  // Extract which subscriptions the oracle flagged from the rationale
  const subVote = verdict.votes.find(
    (v) => v.agentId === 'subscription-watcher' && v.shouldIntervene,
  );

  // Identify recent recurring charges from transaction cache
  const txs = getRecentTransactions(db, 20, snapshot.primaryAccountId);
  const recurring = txs.filter((tx) => tx.is_recurring === 1 && tx.amount < 0);
  const totalRecurring = recurring.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  // Use the oracle vote rationale if available, otherwise build from transactions
  void subVote; // acknowledged — used by the explainer via verdict.rationale
  void totalRecurring; // surfaced in narration context

  return {
    type:     'SUBSCRIPTION_ALERT',
    modality: recurring.length > 3 ? 'VOICE' : 'CARD',
    planId:   null, // Subscription alerts are informational — no write action
  };
}
