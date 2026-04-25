export function generateProfitAndLoss(db, startDate, endDate) {
    // Income lines (credit to income accounts)
    const incomeRows = db.prepare(`
    SELECT category, SUM(amount_cents) as total_cents, COUNT(*) as tx_count
    FROM journal_entries
    WHERE date BETWEEN ? AND ?
      AND (category LIKE 'INCOME_%' OR category = 'TAX_REFUND')
    GROUP BY category
    ORDER BY total_cents DESC
  `).all(startDate, endDate);
    // Expense lines
    const expenseRows = db.prepare(`
    SELECT category,
           SUM(amount_cents * deductibility_pct / 100) as total_cents,
           COUNT(*) as tx_count
    FROM journal_entries
    WHERE date BETWEEN ? AND ?
      AND category NOT LIKE 'INCOME_%'
      AND category NOT LIKE 'TRANSFER_%'
      AND category != 'TAX_REFUND'
      AND category != 'TAX_PAYMENT'
    GROUP BY category
    ORDER BY total_cents DESC
  `).all(startDate, endDate);
    const incomeLines = incomeRows.map(r => ({
        category: r.category,
        amountEur: r.total_cents / 100,
        txCount: r.tx_count,
    }));
    const expenseLines = expenseRows.map(r => ({
        category: r.category,
        amountEur: r.total_cents / 100,
        txCount: r.tx_count,
    }));
    const totalIncome = incomeLines.reduce((s, l) => s + l.amountEur, 0);
    const totalExpenses = expenseLines.reduce((s, l) => s + l.amountEur, 0);
    // Deductible vs non-deductible
    const deductibleRows = db.prepare(`
    SELECT SUM(amount_cents * deductibility_pct / 100) as total
    FROM journal_entries
    WHERE date BETWEEN ? AND ?
      AND is_business_expense = 1
      AND category NOT LIKE 'TRANSFER_%'
  `).get(startDate, endDate);
    const nonDeductibleRows = db.prepare(`
    SELECT SUM(amount_cents) as total
    FROM journal_entries
    WHERE date BETWEEN ? AND ?
      AND is_business_expense = 0
      AND category NOT LIKE 'INCOME_%'
      AND category NOT LIKE 'TRANSFER_%'
  `).get(startDate, endDate);
    const deductibleExpenses = (deductibleRows.total ?? 0) / 100;
    const nonDeductibleExpenses = (nonDeductibleRows.total ?? 0) / 100;
    return {
        periodStart: startDate,
        periodEnd: endDate,
        totalIncome,
        totalExpenses,
        grossProfit: totalIncome - totalExpenses,
        deductibleExpenses,
        nonDeductibleExpenses,
        netProfit: totalIncome - deductibleExpenses,
        incomeLines,
        expenseLines,
        generatedAt: new Date().toISOString(),
    };
}
export function generateTaxSummary(db, year) {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    const incomeRow = db.prepare(`
    SELECT COALESCE(SUM(amount_cents), 0) as total
    FROM journal_entries WHERE date BETWEEN ? AND ? AND category LIKE 'INCOME_%'
  `).get(startDate, endDate);
    const deductibleRow = db.prepare(`
    SELECT COALESCE(SUM(amount_cents * deductibility_pct / 100), 0) as total
    FROM journal_entries WHERE date BETWEEN ? AND ? AND is_business_expense = 1
  `).get(startDate, endDate);
    const mealsRow = db.prepare(`
    SELECT COALESCE(SUM(amount_cents * 0.8), 0) as total
    FROM journal_entries WHERE date BETWEEN ? AND ? AND category = 'BIZ_MEALS'
  `).get(startDate, endDate);
    const vatRows = db.prepare(`SELECT quarter, vat_collected, vat_paid, vat_net_due, status
     FROM vat_periods WHERE year = ? ORDER BY quarter`).all(year);
    const totalIncome = incomeRow.total / 100;
    const totalDeductibleExpenses = deductibleRow.total / 100;
    const mealsDeducted = mealsRow.total / 100;
    const taxableProfit = totalIncome - totalDeductibleExpenses;
    return {
        year,
        totalIncome,
        totalDeductibleExpenses,
        mealsDeducted,
        taxableProfit,
        vatQuarters: vatRows.map(r => ({
            quarter: r.quarter,
            collected: r.vat_collected,
            paid: r.vat_paid,
            netDue: r.vat_net_due,
            status: r.status,
        })),
    };
}
