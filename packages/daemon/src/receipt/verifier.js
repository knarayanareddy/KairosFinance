const TOLERANCE = 0.02; // ±2%
/**
 * Checks whether the sum of line item totals is within ±2% of the receipt total.
 * Handles tax/rounding quirks that cause slight discrepancies.
 */
export function verifyLineItems(receipt) {
    if (receipt.lineItems.length === 0) {
        // No line items extracted — cannot verify but don't fail
        return { valid: true, lineItemSum: receipt.total, delta: 0, deltaPercent: 0 };
    }
    const lineItemSum = receipt.lineItems.reduce((acc, item) => acc + item.total, 0);
    const delta = Math.abs(lineItemSum - receipt.total);
    const deltaPercent = receipt.total > 0 ? delta / receipt.total : 0;
    const valid = deltaPercent <= TOLERANCE;
    return { valid, lineItemSum, delta, deltaPercent };
}
