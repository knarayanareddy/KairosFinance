import { v4 as uuid } from 'uuid';
export function getQuarterForDate(dateStr) {
    const d = new Date(dateStr);
    return {
        year: d.getFullYear(),
        quarter: Math.floor(d.getMonth() / 3) + 1,
    };
}
export function getQuarterDateRange(year, quarter) {
    const startMonth = (quarter - 1) * 3; // 0-based months
    const start = new Date(year, startMonth, 1);
    const end = new Date(year, startMonth + 3, 0); // last day of last month
    return {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
    };
}
export function getVatDueDate(year, quarter) {
    // NL BTW due: last day of month following the quarter end
    const endMonth = quarter * 3; // 1-based: Q1=3, Q2=6, Q3=9, Q4=12
    const dueMonth = endMonth + 1; // month after quarter end
    const dueYear = dueMonth > 12 ? year + 1 : year;
    const month = dueMonth > 12 ? 1 : dueMonth;
    const lastDay = new Date(dueYear, month, 0); // day 0 of next month = last day
    return lastDay.toISOString().slice(0, 10);
}
function rowToVatPeriod(row) {
    return {
        id: row.id,
        year: row.year,
        quarter: row.quarter,
        periodStart: row.period_start,
        periodEnd: row.period_end,
        dueDate: row.due_date,
        vatCollected: row.vat_collected,
        vatPaid: row.vat_paid,
        vatNetDue: row.vat_net_due,
        status: row.status,
        filedAt: row.filed_at,
    };
}
export function computeVatPeriod(db, year, quarter) {
    const { start, end } = getQuarterDateRange(year, quarter);
    const dueDate = getVatDueDate(year, quarter);
    // Compute VAT collected (from income journal entries)
    const collectedRow = db.prepare(`
    SELECT COALESCE(SUM(vat_amount_cents), 0) as total
    FROM journal_entries
    WHERE date BETWEEN ? AND ?
      AND credit_account IN ('4000','4100')
  `).get(start, end);
    // Compute VAT paid on business expenses
    const paidRow = db.prepare(`
    SELECT COALESCE(SUM(vat_amount_cents), 0) as total
    FROM journal_entries
    WHERE date BETWEEN ? AND ?
      AND is_business_expense = 1
      AND debit_account NOT IN ('1000','1010','4000','4100','3000','3100')
  `).get(start, end);
    const vatCollected = collectedRow.total / 100;
    const vatPaid = paidRow.total / 100;
    const vatNetDue = Math.max(0, vatCollected - vatPaid);
    const now = new Date().toISOString().slice(0, 10);
    const isOverdue = now > dueDate;
    // Check existing status
    const existing = db.prepare(`SELECT id, status FROM vat_periods WHERE year = ? AND quarter = ?`).get(year, quarter);
    let status;
    if (existing?.status === 'FILED') {
        status = 'FILED';
    }
    else if (isOverdue) {
        status = 'OVERDUE';
    }
    else {
        status = 'OPEN';
    }
    if (existing) {
        db.prepare(`
      UPDATE vat_periods
      SET vat_collected = ?, vat_paid = ?, vat_net_due = ?, status = ?, updated_at = datetime('now')
      WHERE year = ? AND quarter = ?
    `).run(vatCollected, vatPaid, vatNetDue, status, year, quarter);
        return rowToVatPeriod(db.prepare(`SELECT * FROM vat_periods WHERE year = ? AND quarter = ?`)
            .get(year, quarter));
    }
    const id = uuid();
    db.prepare(`
    INSERT INTO vat_periods (id, year, quarter, period_start, period_end, due_date,
      vat_collected, vat_paid, vat_net_due, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, year, quarter, start, end, dueDate, vatCollected, vatPaid, vatNetDue, status);
    return {
        id, year, quarter,
        periodStart: start, periodEnd: end, dueDate,
        vatCollected, vatPaid, vatNetDue, status,
        filedAt: null,
    };
}
export function checkVatReminders(db) {
    const reminders = [];
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const openPeriods = db.prepare(`SELECT * FROM vat_periods WHERE status IN ('OPEN','OVERDUE') ORDER BY year, quarter`).all();
    for (const period of openPeriods) {
        const due = new Date(period.due_date);
        const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        // Remind at 30, 14, 7, 3 days before due
        if ([30, 14, 7, 3].includes(diffDays)) {
            reminders.push({
                quarter: period.quarter,
                year: period.year,
                daysUntilDue: diffDays,
                dueDate: period.due_date,
                netDue: period.vat_net_due,
            });
        }
    }
    void todayStr; // suppress unused warning
    return reminders;
}
export function markVatPeriodFiled(db, year, quarter) {
    const result = db.prepare(`
    UPDATE vat_periods
    SET status = 'FILED', filed_at = datetime('now'), updated_at = datetime('now')
    WHERE year = ? AND quarter = ? AND status != 'FILED'
  `).run(year, quarter);
    return result.changes > 0;
}
export function getAllVatPeriods(db) {
    const currentYear = new Date().getFullYear();
    // Always show current year's quarters
    for (let q = 1; q <= 4; q++) {
        computeVatPeriod(db, currentYear, q);
    }
    const rows = db.prepare(`SELECT * FROM vat_periods WHERE year >= ? ORDER BY year DESC, quarter DESC`).all(currentYear - 1);
    return rows.map(rowToVatPeriod);
}
