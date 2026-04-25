export interface OracleVote {
  agent: string;
  icon: string;
  status: 'CLEAR' | 'WARN' | 'INTERVENE' | 'PENDING' | 'RUNNING';
  confidence: number;
  message: string;
  timeMs: number;
}

export interface OracleVerdict {
  status: 'CLEAR' | 'WARN' | 'INTERVENE';
  riskScore: number;
  narration: string;
}

export interface BUNQSYScore {
  score: number;
  trend: 'up' | 'down' | 'stable';
  breakdown: {
    balance: number;
    velocity: number;
    goals: number;
    upcoming: number;
  };
  label: string;
}

export interface ForecastPoint {
  date: string;
  projectedBalance: number;
  lowerBound: number;
  upperBound: number;
  events: ForecastEvent[];
}

export interface ForecastEvent {
  type: 'RENT' | 'SALARY' | 'SUBSCRIPTION' | 'IMPULSE_RISK' | 'GOAL_MILESTONE';
  description: string;
  amount?: number;
  probability: number;
}

export interface InterventionPayload {
  id: string;
  type: 'LOW_BALANCE' | 'IMPULSE_BUY' | 'SALARY_RECEIVED' | 'SUBSCRIPTION_DUPLICATE' | 'FRAUD_BLOCK' | 'DREAM_SUGGESTION';
  title: string;
  narration: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  actionLabel?: string;
  dismissLabel?: string;
  planId?: string;
}

export interface DreamBriefing {
  sessionId: string;
  briefingText: string;
  dnaCard: string;
  suggestions: string[];
  completedAt: string;
}

export interface ExecutionPlan {
  id: string;
  narratedText: string;
  steps: { id: string; type: string; description: string }[];
  status: 'PENDING' | 'CONFIRMED' | 'EXECUTED' | 'CANCELLED';
}

export interface FraudSignal {
  label: string;
  detected: boolean;
}
