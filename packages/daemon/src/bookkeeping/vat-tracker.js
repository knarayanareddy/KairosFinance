import { v4 as uuid } from 'uuid';
export function getQuarterForDate(dateStr) {
    const parts = dateStr.slice(0, 10).split('-');
    const year = parseInt(parts[0] ?? '2026', 10);
    const month = parseInt(parts[1] ?? '1', 10); // 1-based
    return { year, quarter: Math.ceil(month / 3) };
}
function toDateStr(year, month1, day) {
    // month1 is 1-based; pad to ISO YYYY-MM-DD without timezone conversion
    return `${year}-${String(month1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
function lastDayOfMonth(year, month1) {
    // Returns last day of month (1-based month)
    return new Date(year, month1, 0).getDate();
}
export function getQuarterDateRange(year, quarter) {
    const startMonth1 = (quarter - 1) * 3 + 1; // 1-based: Q1=1, Q2=4, Q3=7, Q4=10
    const endMonth1 = quarter * 3; // 1-based: Q1=3, Q2=6, Q3=9, Q4=12
    return {
        start: toDateStr(year, startMonth1, 1),
        end: toDateStr(year, endMonth1, lastDayOfMonth(year, endMonth1)),
    };
}
export function getVatDueDate(year, quarter) {
    // NL BTW due: last day of month following the quarter end
    const endMonth1 = quarter * 3; // 1-based
    const dueMonth1 = endMonth1 + 1;
    const dueYear = dueMonth1 > 12 ? year + 1 : year;
    const dueMonth = dueMonth1 > 12 ? 1 : dueMonth1;
    return toDateStr(dueYear, dueMonth, lastDayOfMonth(dueYear, dueMonth));
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
      SET period_start = ?, period_end = ?, due_date = ?,
          vat_collected = ?, vat_paid = ?, vat_net_due = ?, status = ?, updated_at = datetime('now')
      WHERE year = ? AND quarter = ?
    `).run(start, end, dueDate, vatCollected, vatPaid, vatNetDue, status, year, quarter);
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
