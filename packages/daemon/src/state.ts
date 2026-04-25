import type { AccountSummary, BUNQSYScore } from '@bunqsy/shared';

let _accountSummaries: AccountSummary[] = [];
let _lastScore: BUNQSYScore | null = null;

export function setAccountSummaries(summaries: AccountSummary[]): void {
  _accountSummaries = summaries;
}

export function getAccountSummaries(): AccountSummary[] {
  return _accountSummaries;
}

export function setLastScore(score: BUNQSYScore): void {
  _lastScore = score;
}

export function getLastScore(): BUNQSYScore | null {
  return _lastScore;
}
