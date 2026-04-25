import type { OracleVote, OracleVerdict } from '../types';

interface Props {
  votes: OracleVote[];
  verdict: OracleVerdict | null;
  running: boolean;
  onTriggerFraud: () => void;
}

const statusStyles: Record<OracleVote['status'], { color: string; bg: string; label: string }> = {
  PENDING: { color: '#475569', bg: 'rgba(71,85,105,0.1)', label: '○ IDLE' },
  RUNNING: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', label: '◐ RUNNING' },
  CLEAR: { color: '#00C896', bg: 'rgba(0,200,150,0.1)', label: '✓ CLEAR' },
  WARN: { color: '#F5A623', bg: 'rgba(245,166,35,0.1)', label: '⚠ WARN' },
  INTERVENE: { color: '#FF4757', bg: 'rgba(255,71,87,0.1)', label: '🚨 INTERVENE' },
};

export function OracleVotingPanel({ votes, verdict, running, onTriggerFraud }: Props) {
  const isIdle = votes.every(v => v.status === 'PENDING');

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '20px',
      padding: '28px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '11px', letterSpacing: '0.12em', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
            RISK ORACLE
          </div>
          <div style={{ fontSize: '13px', color: '#94A3B8' }}>6 independent sub-agents</div>
        </div>
        <button
          onClick={onTriggerFraud}
          disabled={running}
          style={{
            background: running ? 'rgba(255,255,255,0.04)' : 'rgba(255,71,87,0.1)',
            border: `1px solid ${running ? 'rgba(255,255,255,0.08)' : 'rgba(255,71,87,0.3)'}`,
            borderRadius: '10px',
            padding: '8px 16px',
            color: running ? '#475569' : '#FF6B7A',
            fontSize: '12px',
            fontWeight: 600,
            cursor: running ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {running ? '⚡ Running...' : '⚡ Simulate Fraud Event'}
        </button>
      </div>

      {/* Agent Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {votes.map((vote) => {
          const style = statusStyles[vote.status];
          return (
            <div
              key={vote.agent}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: vote.status !== 'PENDING' ? style.bg : 'rgba(255,255,255,0.02)',
                border: `1px solid ${vote.status !== 'PENDING' ? style.color + '30' : 'rgba(255,255,255,0.05)'}`,
                borderRadius: '12px',
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{ fontSize: '20px', flexShrink: 0 }}>{vote.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#E2E8F0' }}>{vote.agent}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {vote.status !== 'PENDING' && vote.confidence > 0 && (
                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                        {vote.confidence}%
                      </span>
                    )}
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: style.color,
                      letterSpacing: '0.05em',
                    }}>
                      {vote.status === 'RUNNING' ? (
                        <span style={{ animation: 'blink 1s infinite' }}>{style.label}</span>
                      ) : style.label}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {vote.status === 'PENDING' ? 'Awaiting trigger...' : vote.message}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Verdict */}
      {verdict && (
        <div style={{
          background: verdict.status === 'INTERVENE'
            ? 'rgba(255,71,87,0.08)'
            : verdict.status === 'WARN'
              ? 'rgba(245,166,35,0.08)'
              : 'rgba(0,200,150,0.08)',
          border: `1px solid ${verdict.status === 'INTERVENE' ? 'rgba(255,71,87,0.3)' : verdict.status === 'WARN' ? 'rgba(245,166,35,0.3)' : 'rgba(0,200,150,0.3)'}`,
          borderRadius: '14px',
          padding: '16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 800,
              color: verdict.status === 'INTERVENE' ? '#FF4757' : verdict.status === 'WARN' ? '#F5A623' : '#00C896',
              letterSpacing: '0.05em',
            }}>
              {verdict.status === 'INTERVENE' ? '🚨 VERDICT: INTERVENE' : verdict.status === 'WARN' ? '⚠️ VERDICT: WARN' : '✅ VERDICT: CLEAR'}
            </div>
            <div style={{
              fontSize: '12px',
              fontWeight: 700,
              color: verdict.status === 'INTERVENE' ? '#FF4757' : '#64748B',
            }}>
              Risk Score: {verdict.riskScore}
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: 1.5 }}>
            {verdict.narration}
          </div>
        </div>
      )}

      {isIdle && (
        <div style={{
          textAlign: 'center',
          padding: '16px',
          fontSize: '12px',
          color: '#334155',
          fontStyle: 'italic',
        }}>
          Oracle is monitoring quietly. Trigger a fraud event above to see it activate.
        </div>
      )}
    </div>
  );
}
