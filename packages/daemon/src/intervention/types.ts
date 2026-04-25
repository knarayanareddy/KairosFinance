import type Database from 'better-sqlite3';
import type { OracleVerdict } from '@bunqsy/shared';
import type { RecallSnapshot } from '../heartbeat/recall.js';

export interface HandlerResult {
  type:     string;
  modality: 'VOICE' | 'CARD' | 'SILENT';
  planId:   string | null;
}

export type HandlerFn = (
  verdict:  OracleVerdict,
  snapshot: RecallSnapshot,
  db:       Database.Database,
) => Promise<HandlerResult>;
