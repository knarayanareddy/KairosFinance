function dateDiffDays(a, b) {
    return Math.abs((new Date(a).getTime() - new Date(b).getTime()) / (1000 * 60 * 60 * 24));
}
export function matchReceiptToTransaction(db, receiptId) {
    const receipt = db.prepare(`SELECT id, merchant, total, date FROM receipts WHERE id = ?`)
        .get(receiptId);
    if (!receipt)
        return { status: 'no_match', confidence: 0 };
    const targetAmount = -Math.abs(receipt.total); // expenses are negative
    // Candidates: same currency, amount within ±2%, within ±7 days
    const candidates = db.prepare(`
    SELECT id, amount, created_at, counterparty_name
    FROM transactions
    WHERE ABS(amount - ?) < ABS(?) * 0.02
      AND date(created_at) BETWEEN date(?, '-7 days') AND date(?, '+7 days')
      AND receipt_id IS NULL
    ORDER BY ABS(amount - ?) ASC, ABS(julianday(created_at) - julianday(?)) ASC
    LIMIT 10
  `).all(targetAmount, targetAmount, receipt.date, receipt.date, targetAmount, receipt.date);
    if (candidates.length === 0) {
        return { status: 'no_match', confidence: 0 };
    }
    const best = candidates[0];
    const days = dateDiffDays(best.created_at.slice(0, 10), receipt.date);
    if (days === 0) {
        // Link the match
        db.prepare(`UPDATE transactions SET receipt_id = ? WHERE id = ?`).run(receiptId, best.id);
        db.prepare(`UPDATE receipts SET matched_tx_id = ? WHERE id = ?`).run(best.id, receiptId);
        return { status: 'exact', txId: best.id, confidence: 0.97, matchedOn: `Same day, amount match` };
    }
    if (days <= 3) {
        const conf = Math.max(0.70, 0.95 - days * 0.08);
        db.prepare(`UPDATE transactions SET receipt_id = ? WHERE id = ?`).run(receiptId, best.id);
        db.prepare(`UPDATE receipts SET matched_tx_id = ? WHERE id = ?`).run(best.id, receiptId);
        return { status: 'fuzzy', txId: best.id, confidence: conf, matchedOn: `${days} day(s) apart` };
    }
    return { status: 'no_match', confidence: 0 };
}
export function matchAllUnmatchedReceipts(db) {
    const unmatched = db.prepare(`
    SELECT id FROM receipts WHERE matched_tx_id IS NULL AND logged_expense = 0
    ORDER BY scanned_at DESC LIMIT 50
  `).all();
    let matched = 0;
    for (const row of unmatched) {
        const result = matchReceiptToTransaction(db, row.id);
        if (result.status !== 'no_match')
            matched++;
    }
    return matched;
}
