import type Database from 'better-sqlite3';
import type { OracleVerdict } from '@bunqsy/shared';
import type { RecallSnapshot } from '../../heartbeat/recall.js';
import type { HandlerResult } from '../types.js';

export async function run(
  verdict:   OracleVerdict,
  _snapshot: RecallSnapshot,
  _db:       Database.Database,
): Promise<HandlerResult> {
  const isRent = verdict.interventionType === 'RENT_CRITICAL'
              || verdict.interventionType === 'RENT_WARNING';

  const isCritical = verdict.interventionType === 'BALANCE_CRITICAL'
                  || verdict.interventionType === 'RENT_CRITICAL';

  return {
    type:     isRent ? 'RENT_WARNING' : 'LOW_BALANCE',
    modality: isCritical ? 'VOICE' : 'CARD',
    planId:   null,
  };
}
