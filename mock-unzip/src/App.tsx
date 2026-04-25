import { useSimulation } from './hooks/useSimulation';
import { BUNQSYScore } from './components/BUNQSYScore';
import { OracleVotingPanel } from './components/OracleVotingPanel';
import { ForecastChart } from './components/ForecastChart';
import { InterventionCard } from './components/InterventionCard';
import { FraudBlock } from './components/FraudBlock';
import { VoiceOrb } from './components/VoiceOrb';
import { DreamTrigger, DreamBriefingModal } from './components/DreamBriefing';

export default function App() {
  const sim = useSimulation();

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080E1A',
      color: '#F1F5F9',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* CSS Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pingRing {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes loadingBar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Background gradient mesh */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: `
          radial-gradient(ellipse 80% 50% at 20% 10%, rgba(91,141,239,0.06) 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 80% 80%, rgba(139,92,246,0.05) 0%, transparent 60%),
          radial-gradient(ellipse 40% 30% at 50% 50%, rgba(0,200,150,0.03) 0%, transparent 60%)
        `,
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Topbar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(8,14,26,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 24px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              boxShadow: '0 4px 12px rgba(91,141,239,0.4)',
            }}>
              ⚡
            </div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.02em' }}>
                BUNQSY
              </div>
              <div style={{ fontSize: '10px', color: '#334155', fontWeight: 600, letterSpacing: '0.08em', lineHeight: 1 }}>
                FINANCIAL GUARDIAN
              </div>
            </div>
            <div style={{
              marginLeft: '8px',
              background: 'rgba(255,200,0,0.1)',
              border: '1px solid rgba(255,200,0,0.25)',
              borderRadius: '6px',
              padding: '2px 8px',
              fontSize: '10px',
              fontWeight: 700,
              color: '#FFC300',
              letterSpacing: '0.05em',
            }}>
              bunq Hackathon 7.0
            </div>
          </div>

          {/* Nav actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Heartbeat indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: '#475569',
              padding: '6px 12px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '8px',
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#00C896',
                animation: 'pulse 2s infinite',
              }} />
              <span>Heartbeat active · Every 30s</span>
            </div>

            {/* Salary trigger */}
            <button
              onClick={sim.triggerSalary}
              disabled={sim.salaryLanding}
              style={{
                background: sim.salaryLanding ? 'rgba(0,200,150,0.05)' : 'rgba(0,200,150,0.1)',
                border: `1px solid ${sim.salaryLanding ? 'rgba(0,200,150,0.15)' : 'rgba(0,200,150,0.3)'}`,
                borderRadius: '10px',
                padding: '8px 14px',
                color: sim.salaryLanding ? '#334155' : '#00C896',
                fontSize: '12px',
                fontWeight: 600,
                cursor: sim.salaryLanding ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              💰 Simulate Salary
            </button>

            {/* Dream trigger */}
            <DreamTrigger running={sim.dreamRunning} onTrigger={sim.triggerDream} />

            {/* Voice orb button */}
            <VoiceOrb
              active={sim.voiceActive}
              recording={sim.voiceRecording}
              plan={sim.voicePlan}
              onStart={sim.triggerVoice}
              onStop={sim.stopVoice}
              onConfirm={sim.confirmVoicePlan}
              onClose={() => sim.setVoiceActive(false)}
            />

            {/* User avatar */}
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FFC300, #FF6B35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 700,
              color: '#0F172A',
              cursor: 'pointer',
              border: '2px solid rgba(255,195,0,0.3)',
            }}>
              K
            </div>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '32px 24px',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Intervention card — floats above */}
        {sim.intervention && (
          <div style={{ marginBottom: '24px', animation: 'slideUp 0.4s ease' }}>
            <InterventionCard
              intervention={sim.intervention}
              onConfirm={sim.confirmSalaryPlan}
              onDismiss={sim.dismissIntervention}
            />
          </div>
        )}

        {/* Three-column grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '340px 1fr 340px',
          gap: '20px',
          alignItems: 'start',
        }}>
          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* BUNQSY Score */}
            <BUNQSYScore
              score={sim.bunqsyScore}
              lastTick={sim.lastTick}
              heartbeatTick={sim.heartbeatTick}
            />

            {/* Account Summary Card */}
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px',
              padding: '24px',
            }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.12em', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '16px' }}>
                ACCOUNT OVERVIEW
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Primary Account', balance: '€2,147.32', iban: 'NL91 BUNQ 0417 1643 00', color: '#5B8DEF' },
                  { label: 'Rent Reserve', balance: '€950.00', iban: 'NL91 BUNQ 0417 1643 01', color: '#00C896' },
                  { label: 'Emergency Fund', balance: '€3,200.00', iban: 'NL91 BUNQ 0417 1643 02', color: '#F5A623' },
                  { label: '🗺️ Amsterdam Trip', balance: '€680.00 / €1,000', iban: 'NL91 BUNQ 0417 1643 03', color: '#A78BFA' },
                ].map(acct => (
                  <div key={acct.label} style={{
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    borderLeft: `3px solid ${acct.color}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#475569', marginBottom: '2px' }}>{acct.label}</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#E2E8F0' }}>{acct.balance}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '10px', color: '#334155', marginTop: '4px', fontFamily: 'monospace' }}>{acct.iban}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Savings Goals Progress */}
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px',
              padding: '24px',
            }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.12em', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '16px' }}>
                SAVINGS GOALS
              </div>
              {[
                { name: '🗺️ Amsterdam Trip', current: 680, target: 1000, color: '#A78BFA', deadline: '6 weeks' },
                { name: '🛡️ Emergency Fund', current: 3200, target: 6000, color: '#F5A623', deadline: 'Ongoing' },
                { name: '💻 New Laptop', current: 240, target: 1500, color: '#5B8DEF', deadline: '4 months' },
              ].map(goal => {
                const pct = Math.round((goal.current / goal.target) * 100);
                return (
                  <div key={goal.name} style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                      <span style={{ color: '#CBD5E1', fontWeight: 500 }}>{goal.name}</span>
                      <span style={{ color: '#64748B' }}>{pct}% · {goal.deadline}</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: goal.color,
                        borderRadius: '3px',
                        transition: 'width 0.8s ease',
                      }} />
                    </div>
                    <div style={{ fontSize: '10px', color: '#334155', marginTop: '3px' }}>
                      €{goal.current.toLocaleString()} / €{goal.target.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CENTER COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Oracle Voting Panel */}
            <OracleVotingPanel
              votes={sim.oracleVotes}
              verdict={sim.oracleVerdict}
              running={sim.oracleRunning}
              onTriggerFraud={sim.runFraudOracle}
            />

            {/* Forecast Chart */}
            <ForecastChart data={sim.forecast} />

            {/* Demo script guide */}
            <div style={{
              background: 'rgba(255,195,0,0.04)',
              border: '1px solid rgba(255,195,0,0.15)',
              borderRadius: '16px',
              padding: '20px',
            }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.12em', color: '#FFC300', fontWeight: 700, textTransform: 'uppercase', marginBottom: '12px' }}>
                🎯 DEMO GUIDE — bunq Hackathon 7.0
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { step: '1', label: 'Dream Mode', action: 'Click "Trigger Dream Mode" in the header', icon: '💤' },
                  { step: '2', label: 'Fraud Detection', action: 'Click "Simulate Fraud Event" in the Oracle panel', icon: '🔍' },
                  { step: '3', label: 'Voice Command', action: 'Click the 🎙️ orb → "Send €20 to Sarah"', icon: '🎙️' },
                  { step: '4', label: 'Salary & Jars', action: 'Click "Simulate Salary" in the header', icon: '💰' },
                  { step: '5', label: '30-Day Forecast', action: 'Hover over the chart — risk events marked in red', icon: '📈' },
                ].map(item => (
                  <div key={item.step} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12px' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'rgba(255,195,0,0.15)',
                      border: '1px solid rgba(255,195,0,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#FFC300',
                      flexShrink: 0,
                      marginTop: '1px',
                    }}>
                      {item.step}
                    </div>
                    <div>
                      <span style={{ color: '#E2E8F0', fontWeight: 600 }}>{item.icon} {item.label}</span>
                      <span style={{ color: '#64748B' }}> — {item.action}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Recent Transactions */}
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px',
              padding: '24px',
            }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.12em', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '16px' }}>
                RECENT TRANSACTIONS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {[
                  { merchant: 'Albert Heijn', category: '🛒 Groceries', amount: '-€47.32', time: '2h ago', color: '#00C896' },
                  { merchant: 'Spotify', category: '🎵 Subscription', amount: '-€9.99', time: '1d ago', color: '#F5A623' },
                  { merchant: 'NS Railways', category: '🚆 Transport', amount: '-€24.80', time: '1d ago', color: '#5B8DEF' },
                  { merchant: 'Boulangerie', category: '🍞 Dining', amount: '-€12.50', time: '2d ago', color: '#F5A623' },
                  { merchant: 'Employer BV', category: '💼 Salary', amount: '+€3,200', time: '20d ago', color: '#00C896' },
                  { merchant: 'Café Bruin', category: '☕ Dining', amount: '-€18.40', time: '3d ago', color: '#F5A623' },
                  { merchant: 'Netflix', category: '📺 Subscription', amount: '-€15.99', time: '5d ago', color: '#FF4757' },
                ].map((tx, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        background: tx.amount.startsWith('+') ? 'rgba(0,200,150,0.1)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${tx.amount.startsWith('+') ? 'rgba(0,200,150,0.2)' : 'rgba(255,255,255,0.06)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                      }}>
                        {tx.category.split(' ')[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#E2E8F0' }}>{tx.merchant}</div>
                        <div style={{ fontSize: '10px', color: '#475569' }}>{tx.category.split(' ').slice(1).join(' ')} · {tx.time}</div>
                      </div>
                    </div>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: tx.amount.startsWith('+') ? '#00C896' : '#CBD5E1',
                    }}>
                      {tx.amount}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pattern insights */}
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px',
              padding: '24px',
            }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.12em', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', marginBottom: '16px' }}>
                DETECTED PATTERNS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { pattern: 'Weekend dining spike', confidence: 87, icon: '🍽️', color: '#F5A623' },
                  { pattern: 'Monthly salary — 25th', confidence: 96, icon: '💼', color: '#00C896' },
                  { pattern: 'Streaming subscriptions', confidence: 91, icon: '📺', color: '#5B8DEF' },
                  { pattern: 'Rent — 1st of month', confidence: 99, icon: '🏠', color: '#FF4757' },
                  { pattern: 'Grocery run — Mondays', confidence: 74, icon: '🛒', color: '#A78BFA' },
                ].map(p => (
                  <div key={p.pattern} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '10px',
                  }}>
                    <span style={{ fontSize: '16px' }}>{p.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: '#CBD5E1', fontWeight: 500, marginBottom: '3px' }}>{p.pattern}</div>
                      <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
                        <div style={{ height: '100%', width: `${p.confidence}%`, background: p.color, borderRadius: '2px' }} />
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: p.color }}>{p.confidence}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Spec compliance badge */}
            <div style={{
              background: 'rgba(91,141,239,0.06)',
              border: '1px solid rgba(91,141,239,0.15)',
              borderRadius: '16px',
              padding: '16px',
            }}>
              <div style={{ fontSize: '11px', color: '#5B8DEF', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
                🏗️ Build Spec Compliance
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {[
                  '✅ Tier 1: BUNQSY Score (live, every 30s)',
                  '✅ Tier 1: Risk Oracle (6 sub-agents)',
                  '✅ Tier 1: Intervention Engine',
                  '✅ Tier 2: Dream Mode + DNA Card',
                  '✅ Tier 2: 30-Day Forecast Chart',
                  '✅ Tier 2: Voice Command Pipeline',
                  '✅ Tier 2: Savings Jar Agent',
                  '✅ Tier 3: Fraud Block (hold-to-confirm)',
                  '✅ Constitutional: Plan-before-act',
                  '✅ Constitutional: Single write gateway',
                ].map(item => (
                  <div key={item} style={{ fontSize: '11px', color: item.startsWith('✅') ? '#94A3B8' : '#64748B' }}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '20px 24px',
        textAlign: 'center',
        fontSize: '11px',
        color: '#1E293B',
        position: 'relative',
        zIndex: 1,
      }}>
        <span style={{ color: '#334155' }}>BUNQSY Finance</span>
        {' · '}
        <span>bunq Hackathon 7.0</span>
        {' · '}
        <span>Always-on background financial guardian</span>
        {' · '}
        <span style={{ color: '#1E293B' }}>Powered by bunq API + Anthropic Claude</span>
      </footer>

      {/* Fraud Block Modal */}
      {sim.fraudActive && (
        <FraudBlock
          onAllow={sim.handleFraudAllow}
          onBlock={sim.handleFraudBlock}
        />
      )}

      {/* Dream Briefing Modal */}
      {sim.dreamModalOpen && sim.dreamBriefing && (
        <DreamBriefingModal
          briefing={sim.dreamBriefing}
          onClose={() => sim.setDreamModalOpen(false)}
        />
      )}
    </div>
  );
}
