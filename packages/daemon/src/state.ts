import type { AccountSummary } from '@bunqsy/shared';

let _accountSummaries: AccountSummary[] = [];

export function setAccountSummaries(summaries: AccountSummary[]): void {
  _accountSummaries = summaries;
}

export function getAccountSummaries(): AccountSummary[] {
  return _accountSummaries;
}
