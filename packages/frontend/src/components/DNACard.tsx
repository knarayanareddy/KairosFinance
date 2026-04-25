import { useState, useEffect } from 'react';

interface DNAData {
  dnaCard: string | null;
  suggestions: string[];
  patterns: Array<{ name: string; confidence: number }>;
  completedAt: string | null;
}

export function DNACard(): React.JSX.Element {
  const [data, setData] = useState<DNAData | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchDNA(): Promise<void> {
      try {
        const res = await fetch('/api/dna');
        if (!res.ok) return;
        const json = await res.json() as DNAData;
        if (!cancelled) setData(json);
      } catch { /* daemon not running */ }
    }
    void fetchDNA();
    return () => { cancelled = true; };
  }, []);

  if (!data?.dnaCard) return <></>;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.label}>Financial DNA</span>
        {data.completedAt && (
          <span style={styles.timestamp}>
            {new Date(data.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>

      {/* DNA string — the 4–6 word personality phrase */}
      <div style={styles.dnaString}>
        {data.dnaCard}
      </div>

      {/* Pattern confidence bars */}
      {data.patterns.length > 0 && (
        <div style={styles.patterns}>
          {data.patterns.map((p) => (
            <div key={p.name} style={styles.patternRow}>
              <span style={styles.patternName}>{p.name}</span>
              <div style={styles.barTrack}>
                <div style={{
                  ...styles.barFill,
                  width: `${Math.round(p.confidence * 100)}%`,
                  background: confidenceColor(p.confidence),
                }} />
              </div>
              <span style={{ ...styles.patternPct, color: confidenceColor(p.confidence) }}>
                {Math.round(p.confidence * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Top suggestions */}
      {data.suggestions.length > 0 && (
        <div style={styles.suggestions}>
          <span style={styles.suggestLabel}>Recommendations</span>
          {data.suggestions.slice(0, 3).map((s, i) => (
            <div key={i} style={styles.suggestionRow}>
              <span style={styles.bulletDot} />
              <span style={styles.suggestionText}>{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function confidenceColor(confidence: number): string {
  if (confidence >= 0.85) return '#00ff95';
  if (confidence >= 0.65) return '#00bfff';
  return '#f59e0b';
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'rgba(255,255,255,0.042)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '22px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    animation: 'fadeSlideUp 0.4s ease both',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: 'rgba(255,255,255,0.35)',
  },
  timestamp: {
    fontSize: '0.65rem',
    color: 'rgba(255,255,255,0.22)',
  },
  dnaString: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#E2E8F0',
    letterSpacing: '-0.01em',
    lineHeight: 1.3,
    background: 'linear-gradient(135deg, #00bfff, #00ff95)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  patterns: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '7px',
  },
  patternRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  patternName: {
    width: '130px',
    fontSize: '0.7rem',
    color: 'rgba(255,255,255,0.55)',
    flexShrink: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  barTrack: {
    flex: 1,
    height: '3px',
    background: 'rgba(255,255,255,0.07)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
  },
  patternPct: {
    width: '28px',
    fontSize: '0.68rem',
    fontWeight: 700,
    textAlign: 'right' as const,
    flexShrink: 0,
  },
  suggestions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    paddingTop: '4px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  suggestLabel: {
    fontSize: '0.65rem',
    fontWeight: 600,
    letterSpacing: '0.08em',
    color: 'rgba(255,255,255,0.28)',
    textTransform: 'uppercase' as const,
    marginBottom: '2px',
  },
  suggestionRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  },
  bulletDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: '#00bfff',
    flexShrink: 0,
    marginTop: '5px',
  },
  suggestionText: {
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 1.45,
  },
};
