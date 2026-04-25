let _accountSummaries = [];
let _lastScore = null;
export function setAccountSummaries(summaries) {
    _accountSummaries = summaries;
}
export function getAccountSummaries() {
    return _accountSummaries;
}
export function setLastScore(score) {
    _lastScore = score;
}
export function getLastScore() {
    return _lastScore;
}
