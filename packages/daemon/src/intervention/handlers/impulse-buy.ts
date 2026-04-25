import type Database from 'better-sqlite3';
import type { OracleVerdict } from '@bunqsy/shared';
import type { RecallSnapshot } from '../../heartbeat/recall.js';
import type { HandlerResult } from '../types.js';

export async function run(
  verdict:   OracleVerdict,
  _snapshot: RecallSnapshot,
  _db:       Database.Database,
): Promise<HandlerResult> {
  // High-risk velocity spikes (≥75) get a voice alert; pattern-based coaching is a card
  return {
    type:     'IMPULSE_BUY',
    modality: verdict.aggregateRiskScore >= 75 ? 'VOICE' : 'CARD',
    planId:   null,
  };
}
