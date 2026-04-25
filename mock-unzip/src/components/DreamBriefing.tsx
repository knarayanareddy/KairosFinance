import { useState } from 'react';
import type { DreamBriefing as DreamBriefingType } from '../types';

interface DreamTriggerProps {
  running: boolean;
  onTrigger: () => void;
}

export function DreamTrigger({ running, onTrigger }: DreamTriggerProps) {
  return (
    <button
      onClick={onTrigger}
      disabled={running}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: running
          ? 'rgba(91,141,239,0.08)'
          : 'linear-gradient(135deg, rgba(91,141,239,0.15), rgba(139,92,246,0.15))',
        border: `1px solid ${running ? 'rgba(91,141,239,0.2)' : 'rgba(91,141,239,0.35)'}`,
        borderRadius: '12px',
        padding: '10px 18px',
        color: running ? '#5B8DEF' : '#A78BFA',
        fontSize: '13px',
        fontWeight: 600,
        cursor: running ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <span style={{
        fontSize: '16px',
        animation: running ? 'spin 3s linear infinite' : 'none',
      }}>
        {running ? '🌙' : '💤'}
      </span>
      <span>{running ? 'Dreaming...' : 'Trigger Dream Mode'}</span>
      {running && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '2px',
          background: 'linear-gradient(90deg, #5B8DEF, #8B5CF6)',
          animation: 'loadingBar 3s ease infinite',
          width: '100%',
        }} />
      )}
    </button>
  );
}

interface BriefingModalProps {
  briefing: DreamBriefingType;
  onClose: () => void;
}

export function DreamBriefingModal({ briefing, onClose }: BriefingModalProps) {
  const [visible, setVisible] = useState(true);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(12px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.3s ease',
    }}>
      <div style={{
        background: 'linear-gradient(145deg, #0F172A, #0D1526)',
        border: '1px solid rgba(91,141,239,0.2)',
        borderRadius: '28px',
        padding: '40px',
        maxWidth: '560px',
        width: '100%',
        boxShadow: '0 0 80px rgba(91,141,239,0.15), 0 40px 80px rgba(0,0,0,0.7)',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.96)',
        transition: 'transform 0.4s ease',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        {/* Stars background effect */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🌙</div>
          <div style={{ fontSize: '11px', color: '#5B8DEF', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>
            DREAM MODE COMPLETE
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#F1F5F9' }}>
            Your Morning Briefing
          </div>
          <div style={{ fontSize: '11px', color: '#334155', marginTop: '4px' }}>
            {new Date(briefing.completedAt).toLocaleString()}
          </div>
        </div>

        {/* Briefing text */}
        <div style={{
          background: 'rgba(91,141,239,0.06)',
          border: '1px solid rgba(91,141,239,0.15)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '20px',
          fontSize: '14px',
          color: '#CBD5E1',
          lineHeight: 1.7,
          fontStyle: 'italic',
          borderLeft: '3px solid #5B8DEF',
        }}>
          "{briefing.briefingText}"
        </div>

        {/* Financial DNA Card */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
            Your Financial DNA
          </div>
          <div style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(91,141,239,0.15))',
            border: '1px solid rgba(139,92,246,0.3)',
            borderRadius: '14px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{ fontSize: '28px' }}>🧬</div>
            <div>
              <div style={{ fontSize: '11px', color: '#7C3AED', fontWeight: 600, marginBottom: '3px' }}>Identified from your patterns</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#E2E8F0' }}>
                {briefing.dnaCard}
              </div>
            </div>
          </div>
        </div>

        {/* Suggestions */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
            3 Actionable Suggestions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {briefing.suggestions.map((s, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: '12px',
                padding: '14px 16px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
              }}>
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'rgba(91,141,239,0.2)',
                  border: '1px solid rgba(91,141,239,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#5B8DEF',
                  flexShrink: 0,
                  marginTop: '1px',
                }}>
                  {i + 1}
                </div>
                <div style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.5 }}>{s}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Dismiss */}
        <button
          onClick={handleClose}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
            border: 'none',
            borderRadius: '14px',
            padding: '16px',
            color: '#fff',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Got it — start my day ✓
        </button>
      </div>
    </div>
  );
}
