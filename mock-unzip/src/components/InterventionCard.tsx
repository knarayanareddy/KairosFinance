import type { InterventionPayload } from '../types';

interface Props {
  intervention: InterventionPayload;
  onConfirm: () => void;
  onDismiss: () => void;
}

const severityConfig = {
  LOW: { color: '#00C896', bg: 'rgba(0,200,150,0.08)', border: 'rgba(0,200,150,0.25)' },
  MEDIUM: { color: '#F5A623', bg: 'rgba(245,166,35,0.08)', border: 'rgba(245,166,35,0.25)' },
  HIGH: { color: '#FF4757', bg: 'rgba(255,71,87,0.08)', border: 'rgba(255,71,87,0.25)' },
  CRITICAL: { color: '#FF4757', bg: 'rgba(255,71,87,0.12)', border: 'rgba(255,71,87,0.4)' },
};

export function InterventionCard({ intervention, onConfirm, onDismiss }: Props) {
  const config = severityConfig[intervention.severity];

  return (
    <div style={{
      background: config.bg,
      border: `1px solid ${config.border}`,
      borderRadius: '20px',
      padding: '24px',
      animation: 'slideUp 0.4s ease',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', letterSpacing: '0.12em', color: config.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
            ⚡ BUNQSY INTERVENTION
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#F1F5F9' }}>
            {intervention.title}
          </div>
        </div>
        <div style={{
          background: config.bg,
          border: `1px solid ${config.border}`,
          borderRadius: '8px',
          padding: '4px 10px',
          fontSize: '10px',
          fontWeight: 700,
          color: config.color,
          letterSpacing: '0.08em',
        }}>
          {intervention.severity}
        </div>
      </div>

      {/* Narration */}
      <div style={{
        fontSize: '13px',
        color: '#94A3B8',
        lineHeight: 1.6,
        marginBottom: '20px',
        padding: '16px',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '12px',
        borderLeft: `3px solid ${config.color}`,
      }}>
        {intervention.narration}
      </div>

      {/* Explainability note */}
      <div style={{
        fontSize: '11px',
        color: '#334155',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <span>🔍</span>
        <span>Explainability: BUNQSY narrated this decision — no black boxes.</span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px' }}>
        {intervention.actionLabel && (
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              background: config.color,
              border: 'none',
              borderRadius: '12px',
              padding: '12px',
              color: '#0F172A',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            ✓ {intervention.actionLabel}
          </button>
        )}
        <button
          onClick={onDismiss}
          style={{
            flex: intervention.actionLabel ? '0 0 auto' : 1,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '12px 20px',
            color: '#64748B',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
        >
          {intervention.dismissLabel || 'Dismiss'}
        </button>
      </div>
    </div>
  );
}
