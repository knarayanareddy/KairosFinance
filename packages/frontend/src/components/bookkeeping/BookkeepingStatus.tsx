import React, { useState, useEffect } from 'react';

interface Status {
  totalTransactions: number;
  journalEntries: number;
  uncategorized: number;
  pendingReview: number;
}

export function BookkeepingStatus({ onExportClick }: { onExportClick: () => void }): React.JSX.Element {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/bookkeeping/status');
        if (res.ok) setStatus(await res.json() as Status);
      } catch { /* daemon offline */ }
    })();
  }, []);

  const categorizedPct = status && status.totalTransactions > 0
    ? Math.round((status.journalEntries / status.totalTransactions) * 100)
    : 0;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '20px', padding: '24px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={sectionLabelStyle}>Bookkeeping Status</div>
          {status && (
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
              {status.journalEntries} / {status.totalTransactions} transactions categorized
            </div>
          )}
        </div>
        <button onClick={onExportClick} style={exportBtnStyle}>
          Export ↓
        </button>
      </div>

      {status && (
        <>
          {/* Progress bar */}
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', marginBottom: '16px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${categorizedPct}%`,
              background: categorizedPct >= 90 ? '#00ff95' : categorizedPct >= 60 ? '#ff6a00' : '#ff1500',
              borderRadius: '4px', transition: 'width 0.8s ease',
            }} />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {[
              { label: 'Total Transactions', value: status.totalTransactions, color: 'rgba(255,255,255,0.6)' },
              { label: 'Journal Entries',    value: status.journalEntries,    color: '#00bfff' },
              { label: 'Uncategorized',      value: status.uncategorized,     color: status.uncategorized > 0 ? '#ff6a00' : '#00ff95' },
              { label: 'Pending Review',     value: status.pendingReview,     color: status.pendingReview > 0 ? '#ff6a00' : '#00ff95' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                flex: 1, padding: '10px 12px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '10px',
              }}>
                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
                  {label}
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color, fontFamily: "'Montserrat', sans-serif" }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!status && (
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
          Connect to daemon to see status.
        </div>
      )}
    </div>
  );
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, letterSpacing: '0.10em',
  textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)',
};

const exportBtnStyle: React.CSSProperties = {
  background: 'rgba(0,191,255,0.08)', border: '1px solid rgba(0,191,255,0.25)',
  borderRadius: '100px', padding: '7px 16px', color: '#00bfff',
  fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
};
