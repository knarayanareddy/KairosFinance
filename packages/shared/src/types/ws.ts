import type { OracleVerdict, OracleVote } from './oracle.js';
import type { ExecutionPlan } from './plan.js';

export interface BUNQSYScoreComponents {
  balance: number;    // 0–100 contribution
  velocity: number;   // 0–100 contribution
  goals: number;      // 0–100 contribution
  upcoming: number;   // 0–100 contribution
}

export interface BUNQSYScore {
  value: number;                    // 0–100 composite
  components: BUNQSYScoreComponents;
  trend: 'up' | 'down' | 'flat';
  computedAt: string;               // ISO 8601
}

export interface InterventionPayload {
  id: string;
  type: string;
  riskScore: number;
  verdict: string;
  modality: string;
  narration: string;
  oracleVotes: OracleVote[];
  executionPlanId?: string | null;
  title?: string;
  actionLabel?: string;
  dismissLabel?: string;
}

export interface DreamBriefingPayload {
  sessionId:    string;
  briefingText: string;
  dnaCard:      string;
  suggestions:  string[];
}

export type WSMessage =
  | { type: 'score_update';   payload: BUNQSYScore }
  | { type: 'oracle_vote';    payload: OracleVote }
  | { type: 'oracle_verdict'; payload: OracleVerdict }
  | { type: 'intervention';   payload: InterventionPayload }
  | { type: 'plan_update';    payload: ExecutionPlan }
  | { type: 'dream_complete'; payload: DreamBriefingPayload }
  | { type: 'tick';           payload: { tickId: string; timestamp: string } }
  | { type: 'error';          payload: { message: string } };
