import type { BUNQSYScore as BUNQSYScoreType } from '../types';

interface Props {
  score: BUNQSYScoreType;
  lastTick: Date;
  heartbeatTick: number;
}

export function BUNQSYScore({ score, lastTick, heartbeatTick }: Props) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return '#00C896';
    if (s >= 60) return '#F5A623';
    return '#FF4757';
  };

  const getScoreBg = (s: number) => {
    if (s >= 80) return 'rgba(0,200,150,0.12)';
    if (s >= 60) return 'rgba(245,166,35,0.12)';
    return 'rgba(255,71,87,0.12)';
  };

  const color = getScoreColor(score.score);
  getScoreBg(score.score);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score.score / 100) * circumference;

  const trendIcon = score.trend === 'up' ? '↑' : score.trend === 'down' ? '↓' : '→';
  const trendColor = score.trend === 'up' ? '#00C896' : score.trend === 'down' ? '#FF4757' : '#A0AEC0';

  const breakdownItems = [
    { label: 'Balance', value: score.breakdown.balance, weight: '35%' },
    { label: 'Velocity', value: score.breakdown.velocity, weight: '25%' },
    { label: 'Goals', value: score.breakdown.goals, weight: '25%' },
    { label: 'Upcoming', value: score.breakdown.upcoming, weight: '15%' },
  ];

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '20px',
      padding: '28px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '11px', letterSpacing: '0.12em', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
            BUNQSY SCORE
          </div>
          <div style={{ fontSize: '13px', color: '#94A3B8' }}>Live financial health index</div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(0,200,150,0.1)',
          border: '1px solid rgba(0,200,150,0.2)',
          borderRadius: '20px',
          padding: '4px 12px',
          fontSize: '11px',
          color: '#00C896',
          fontWeight: 600,
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#00C896',
            animation: 'pulse 2s infinite',
          }} />
          LIVE · Tick #{heartbeatTick}
        </div>
      </div>

      {/* Score Ring */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <div style={{ position: 'relative', width: '132px', height: '132px', flexShrink: 0 }}>
          <svg width="132" height="132" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="66" cy="66" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
            <circle
              cx="66" cy="66" r="54"
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1.2s ease, stroke 0.6s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              fontSize: '38px',
              fontWeight: 800,
              color,
              lineHeight: 1,
              transition: 'color 0.6s ease',
            }}>
              {score.score}
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', fontWeight: 600 }}>/ 100</div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px',
          }}>
            <div style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#F1F5F9',
            }}>
              {score.label}
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: 700,
              color: trendColor,
              transition: 'color 0.4s',
            }}>
              {trendIcon}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {breakdownItems.map(item => (
              <div key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
                    {item.label} <span style={{ color: '#334155' }}>({item.weight})</span>
                  </span>
                  <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>{item.value}</span>
                </div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${item.value}%`,
                    background: getScoreColor(item.value),
                    borderRadius: '2px',
                    transition: 'width 0.8s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timestamp */}
      <div style={{
        fontSize: '11px',
        color: '#334155',
        textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        paddingTop: '12px',
      }}>
        Last updated: {lastTick.toLocaleTimeString()} · Next tick in ~30s
      </div>
    </div>
  );
}
