export type OracleAgentId =
  | 'balance-sentinel'
  | 'velocity-analyzer'
  | 'pattern-matcher'
  | 'subscription-watcher'
  | 'rent-proximity-guard'
  | 'fraud-shadow'
  | 'jar-optimizer';

export interface OracleVote {
  agentId: OracleAgentId;
  riskScore: number;         // 0–100
  rationale: string;
  shouldIntervene: boolean;
  suggestedType?: string;    // intervention type hint if shouldIntervene is true
}

export interface OracleVerdict {
  votes: OracleVote[];
  aggregateRiskScore: number; // 0–100 weighted average of votes
  shouldIntervene: boolean;
  interventionType?: string;
  rationale: string;
}
