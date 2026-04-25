import React, { useState } from 'react';

interface Props {
  onClose: () => void;
}

export function ExportModal({ onClose }: Props): React.JSX.Element {
  const currentYear  = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate,   setEndDate]   = useState(new Date().toISOString().slice(0, 10));
  const [downloading, setDownloading] = useState<'csv' | 'mt940' | null>(null);

  function buildUrl(format: 'csv' | 'mt940'): string {
    return `/api/bookkeeping/export/${format}?start=${startDate}&end=${endDate}`;
  }

  async function download(format: 'csv' | 'mt940'): Promise<void> {
    setDownloading(format);
    try {
      const res = await fetch(buildUrl(format));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob    = await res.blob();
      const url     = URL.createObjectURL(blob);
      const anchor  = document.createElement('a');
      const ext     = format === 'csv' ? 'csv' : 'mt940';
      anchor.href     = url;
      anchor.download = `bunqsy-${startDate}-${endDate}.${ext}`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
    setDownloading(null);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: '24px', padding: '32px', width: '440px', maxWidth: '95vw',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff', fontFamily: "'Montserrat', sans-serif", marginBottom: '4px' }}>
              Export Books
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
              Download for accountant · Exact Online · Belastingdienst
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>
            ✕
          </button>
        </div>

        {/* Date range */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Start Date</label>
            <input
              type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>End Date</label>
            <input
              type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Export buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => { void download('csv'); }}
            disabled={downloading !== null}
            style={{ ...exportBtnStyle, borderColor: 'rgba(0,255,149,0.25)', color: '#00ff95' }}
          >
            <span style={{ fontSize: '16px' }}>📊</span>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '13px' }}>
                {downloading === 'csv' ? 'Downloading…' : 'CSV Export'}
              </div>
              <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '2px' }}>
                All journal entries · works with Excel, Exact Online
              </div>
            </div>
            <span style={{ fontSize: '12px', opacity: 0.5 }}>↓</span>
          </button>

          <button
            onClick={() => { void download('mt940'); }}
            disabled={downloading !== null}
            style={{ ...exportBtnStyle, borderColor: 'rgba(0,191,255,0.25)', color: '#00bfff' }}
          >
            <span style={{ fontSize: '16px' }}>🏦</span>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '13px' }}>
                {downloading === 'mt940' ? 'Downloading…' : 'MT940 Export'}
              </div>
              <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '2px' }}>
                SWIFT format · accepted by NL accountants
              </div>
            </div>
            <span style={{ fontSize: '12px', opacity: 0.5 }}>↓</span>
          </button>
        </div>

        <div style={{ marginTop: '20px', fontSize: '10px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', lineHeight: 1.6 }}>
          Exports include categorized transactions only. Uncategorized transactions are excluded.
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '12px',
  fontFamily: 'inherit', boxSizing: 'border-box',
};

const exportBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '12px',
  background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '14px', padding: '14px 16px', cursor: 'pointer',
  fontFamily: 'inherit', width: '100%',
  transition: 'all 0.2s',
};
