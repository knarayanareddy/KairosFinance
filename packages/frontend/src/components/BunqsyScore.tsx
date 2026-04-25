import type { BUNQSYScore } from '@bunqsy/shared';

interface Props {
  score: BUNQSYScore | null;
}

const RADIUS = 80;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function trendArrow(trend: 'up' | 'down' | 'flat'): string {
  if (trend === 'up') return '↑';
  if (trend === 'down') return '↓';
  return '→';
}

function trendColor(trend: 'up' | 'down' | 'flat'): string {
  if (trend === 'up') return 'var(--color-green)';
  if (trend === 'down') return 'var(--color-red)';
  return 'var(--text-secondary)';
}

function scoreColor(score: number): string {
  if (score >= 75) return '#00ff95';
  if (score >= 50) return '#ff6a00';
  return '#ff1500';
}

function scoreGradientId(score: number): string {
  if (score >= 75) return 'ringGradGreen';
  if (score >= 50) return 'ringGradOrange';
  return 'ringGradRed';
}

export function BUNQSYScore({ score }: Props): React.JSX.Element {
  const value = score?.value ?? 0;
  const trend = score?.trend ?? 'flat';
  const dashOffset = CIRCUMFERENCE - (value / 100) * CIRCUMFERENCE;
  const color = scoreColor(value);
  const gradId = scoreGradientId(value);

  return (
    <div className="glass" style={styles.card}>
      <div style={styles.header}>
        <span style={styles.title}>BUNQSY Score</span>
        {score && (
          <span style={styles.liveRow}>
            <span className="live-dot" />
            <span style={styles.liveLabel}>LIVE</span>
          </span>
        )}
      </div>

      <div style={styles.ringWrap}>
        <svg width={200} height={200} style={styles.svg}>
          <defs>
            <linearGradient id="ringGradGreen" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00bfff" />
              <stop offset="100%" stopColor="#00ff95" />
            </linearGradient>
            <linearGradient id="ringGradOrange" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff6a00" />
              <stop offset="100%" stopColor="#ffaa00" />
            </linearGradient>
            <linearGradient id="ringGradRed" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff1500" />
              <stop offset="100%" stopColor="#ff4757" />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle
            cx={100} cy={100} r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={10}
          />
          {/* Progress */}
          <circle
            cx={100} cy={100} r={RADIUS}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: '100px 100px',
              transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)',
              filter: `drop-shadow(0 0 10px ${color}90)`,
            }}
          />
          {/* Score label */}
          <text
            x={100} y={94}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fill: '#ffffff', fontSize: '2.6rem', fontWeight: 800, fontFamily: "'Montserrat', 'Inter', sans-serif" }}
          >
            {value}
          </text>
          <text
            x={100} y={120}
            textAnchor="middle"
            style={{ fill: 'rgba(255,255,255,0.30)', fontSize: '0.7rem', fontFamily: 'Inter, sans-serif', letterSpacing: '0.08em' }}
          >
            / 100
          </text>
        </svg>
      </div>

      <div style={styles.trendRow}>
        <span style={{ ...styles.trendBadge, color: trendColor(trend), borderColor: trendColor(trend) }}>
          {trendArrow(trend)} {trend.toUpperCase()}
        </span>
      </div>

      {score && (
        <div style={styles.breakdown}>
          <BreakdownBar label="Balance" value={score.components.balance} />
          <BreakdownBar label="Velocity" value={score.components.velocity} />
          <BreakdownBar label="Goals" value={score.components.goals} />
          <BreakdownBar label="Upcoming" value={score.components.upcoming} />
        </div>
      )}

      {!score && (
        <div style={styles.placeholder}>
          <span style={styles.placeholderText}>Waiting for first heartbeat…</span>
        </div>
      )}
    </div>
  );
}

function BreakdownBar({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <div style={barStyles.row}>
      <span style={barStyles.label}>{label}</span>
      <div style={barStyles.track}>
        <div
          style={{
            ...barStyles.fill,
            width: `${value}%`,
            background: scoreColor(value),
            transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </div>
      <span style={barStyles.value}>{Math.round(value)}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    padding: '28px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    animation: 'fadeSlideUp 0.5s ease both',
  },
  header: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: 'var(--text-secondary)',
  },
  liveRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  liveLabel: {
    fontSize: '0.65rem',
    letterSpacing: '0.1em',
    color: 'var(--color-green)',
    fontWeight: 600,
  },
  ringWrap: {
    position: 'relative' as const,
  },
  svg: {
    overflow: 'visible',
  },
  trendRow: {
    display: 'flex',
    justifyContent: 'center',
  },
  trendBadge: {
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    padding: '4px 10px',
    borderRadius: 20,
    border: '1px solid',
  },
  breakdown: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  placeholder: {
    padding: '16px 0',
  },
  placeholderText: {
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
  },
};

const barStyles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    width: 64,
    fontSize: '0.7rem',
    color: 'var(--text-secondary)',
    flexShrink: 0,
  },
  track: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    background: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  value: {
    width: 24,
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    textAlign: 'right' as const,
    flexShrink: 0,
  },
};
