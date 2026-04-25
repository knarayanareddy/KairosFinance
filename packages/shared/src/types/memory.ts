// ─── Raw DB row types ─────────────────────────────────────────────────────────
// These mirror the SQLite schema column-for-column.
// JSON columns are kept as strings here; callers parse them as needed.

export interface SessionRow {
  id: number;
  installation_token: string;
  session_token: string;
  user_id: number;
  public_key_pem: string;
  private_key_pem: string;
  server_public_key: string;
  expires_at: string;
  created_at: string;
}

export interface TransactionRow {
  id: string;
  bunq_account_id: number;
  amount: number;
  currency: string;
  counterparty_name: string | null;
  counterparty_iban: string | null;
  description: string | null;
  category: string | null;
  is_recurring: 0 | 1;
  created_at: string;
  synced_at: string;
  receipt_id: string | null;
  categorized_at: string | null;
  journal_entry_id: string | null;
  je_category: string | null;
}

export interface PatternRow {
  id: string;
  name: string;
  description: string;
  trigger_conditions: string;   // JSON
  intervention_template: string; // JSON
  confidence: number;
  hit_count: number;
  confirmed_count: number;
  dismissed_count: number;
  enabled: 0 | 1;
  created_at: string;
  updated_at: string;
}

export interface UserProfileRow {
  id: 1;
  name: string | null;
  salary_day: number | null;
  salary_amount: number | null;
  rent_amount: number | null;
  rent_day: number | null;
  timezone: string;
  voice_enabled: 0 | 1;
  active_hours_start: number;
  active_hours_end: number;
  updated_at: string;
}

export interface GoalRow {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  jar_account_id: number | null;
  enabled: 0 | 1;
  created_at: string;
}

export interface InterventionRow {
  id: string;
  type: string;
  risk_score: number;
  verdict: string;
  modality: string;
  narration: string;
  oracle_votes: string;         // JSON array of OracleVote
  execution_plan_id: string | null;
  status: string;               // SHOWN | CONFIRMED | DISMISSED | EXECUTED
  created_at: string;
  resolved_at: string | null;
}

export interface ExecutionPlanRow {
  id: string;
  narrated_text: string;
  steps: string;                // JSON array of ExecutionStep
  status: string;               // PENDING | CONFIRMED | EXECUTED | CANCELLED
  created_at: string;
  confirmed_at: string | null;
  executed_at: string | null;
}

export interface ExecutionStepResultRow {
  id: string;
  plan_id: string;
  step_id: string;
  success: 0 | 1;
  bunq_response: string | null; // JSON
  error_message: string | null;
  executed_at: string;
}

export interface TickLogRow {
  id: number;
  tick_at: string;
  duration_ms: number | null;
  reason_ran: 0 | 1;
  verdict: string | null;
  risk_score: number | null;
  bunqsy_score: number | null;
  intervention_id: string | null;
}

export interface DreamSessionRow {
  id: string;
  triggered_at: string;
  trigger_type: string;         // 'scheduled' | 'manual'
  completed_at: string | null;
  duration_ms: number | null;
  patterns_updated: number | null;
  patterns_created: number | null;
  briefing_text: string | null;
  dna_card: string | null;
  suggestions: string | null;   // JSON array of strings
  status: string;               // RUNNING | COMPLETED | FAILED | KILLED
}

export interface ScoreLogRow {
  id: number;
  score: number;
  balance_component: number | null;
  velocity_component: number | null;
  goals_component: number | null;
  upcoming_component: number | null;
  logged_at: string;
}
