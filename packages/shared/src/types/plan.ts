export type ExecutionStepType =
  | 'PAYMENT'
  | 'DRAFT_PAYMENT'
  | 'SAVINGS_TRANSFER'
  | 'CANCEL_DRAFT'
  | 'SANDBOX_FUND'
  | 'CARD_FREEZE'
  | 'CARD_UNFREEZE'
  | 'CREATE_SAVINGS_GOAL';

export type ExecutionPlanStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'EXECUTED'
  | 'CANCELLED';

export interface ExecutionStep {
  id: string;
  type: ExecutionStepType;
  description: string;
  payload: unknown;
}

export interface ExecutionPlan {
  id: string;
  createdAt: Date;
  narratedText: string;
  steps: ExecutionStep[];
  status: ExecutionPlanStatus;
  confirmedAt?: Date;
  executedAt?: Date;
}
