import { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ─── Types ───────────────────────────────────────────────────────────────────
type Slide = { id: number; title: string; component: React.FC<{ active: boolean }> };

// ─── Constants ────────────────────────────────────────────────────────────────
const RAINBOW = 'linear-gradient(90deg,#ef4444 0%,#f97316 17%,#eab308 33%,#22c55e 50%,#3b82f6 67%,#6366f1 83%,#a855f7 100%)';
const BUNQ_YELLOW = '#f5c842';

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useAnimateIn(active: boolean, delay = 0) {
  // If already active on first mount, show immediately (no blank flash)
  const [visible, setVisible] = useState(active);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      if (active) { setVisible(true); return; }
    }
    if (active) {
      const t = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [active, delay]);
  return visible;
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function RainbowBar({ h = 3 }: { h?: number }) {
  return (
    <div style={{ height: h, background: RAINBOW, borderRadius: h, width: '100%' }} />
  );
}

function Badge({ children, color = BUNQ_YELLOW }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 100,
      background: color + '18', color, border: `1px solid ${color}30`,
      letterSpacing: '0.10em', textTransform: 'uppercase' as const,
    }}>
      {children}
    </span>
  );
}

// ─── Slide 1: Hero ───────────────────────────────────────────────────────────
function SlideHero({ active }: { active: boolean }) {
  const v1 = useAnimateIn(active, 100);
  const v2 = useAnimateIn(active, 350);
  const v3 = useAnimateIn(active, 650);
  const v4 = useAnimateIn(active, 950);
  const v5 = useAnimateIn(active, 1200);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-full overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/images/hero-bg.jpg)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 50%, #000 100%)' }} />
      <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />

      {/* bunq rainbow top border */}
      <div className="absolute top-0 left-0 right-0" style={{ height: 4, background: RAINBOW }} />

      {/* Hackathon badge */}
      <div className={`relative z-10 mb-8 transition-all duration-700 ${v1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 100, padding: '8px 22px' }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: BUNQ_YELLOW }}>BUNQ HACKATHON 7.0</span>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: BUNQ_YELLOW, animation: 'pulse 2s infinite' }} />
        </div>
      </div>

      {/* Main title */}
      <div className={`relative z-10 text-center transition-all duration-700 ${v2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <h1 style={{ fontSize: 'clamp(5rem,14vw,9rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, color: '#fff', margin: 0 }}>
          BUNQSY
        </h1>
        <div style={{ marginTop: 6, height: 5, borderRadius: 5, background: RAINBOW, maxWidth: 480, margin: '12px auto 0' }} />
      </div>

      {/* Tagline */}
      <div className={`relative z-10 mt-8 text-center transition-all duration-700 ${v3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        <p style={{ fontSize: 'clamp(1.1rem,2.5vw,1.6rem)', color: 'rgba(255,255,255,0.7)', fontWeight: 300, maxWidth: 640, lineHeight: 1.5 }}>
          Your money's always-on AI guardian.{' '}
          <span style={{ color: '#fff', fontWeight: 600 }}>Acts before you even notice something's wrong.</span>
        </p>
      </div>

      {/* Pillars */}
      <div className={`relative z-10 mt-10 flex flex-wrap justify-center gap-3 transition-all duration-700 ${v4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        {[
          { icon: '⚡', label: 'Proactive', desc: '60s heartbeat' },
          { icon: '🧠', label: '7-Agent Oracle', desc: 'Concurrent AI votes' },
          { icon: '🛡️', label: 'Consent-gated', desc: 'Plan before act' },
          { icon: '🌙', label: 'Dream Mode', desc: 'Learns while you sleep' },
          { icon: '📒', label: 'Bookkeeping', desc: 'Auto double-entry' },
        ].map((p) => (
          <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16, padding: '10px 18px' }}>
            <span style={{ fontSize: 20 }}>{p.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{p.label}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{p.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Built on bunq */}
      <div className={`relative z-10 mt-10 transition-all duration-700 ${v5 ? 'opacity-100' : 'opacity-0'}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
          <div style={{ height: 1, width: 60, background: 'rgba(255,255,255,0.15)' }} />
          Built entirely on the bunq API
          <div style={{ height: 1, width: 60, background: 'rgba(255,255,255,0.15)' }} />
        </div>
      </div>
    </div>
  );
}

// ─── Slide 2: Problem → Solution ──────────────────────────────────────────────
function SlideVision({ active }: { active: boolean }) {
  const v1 = useAnimateIn(active, 100);
  const v2 = useAnimateIn(active, 400);
  const v3 = useAnimateIn(active, 750);

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-8">
      <div className={`text-center mb-10 transition-all duration-700 ${v1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'}`}>
        <Badge>Product Vision</Badge>
        <h2 style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 900, color: '#fff', marginTop: 12 }}>
          Every financial app waits.<br />BUNQSY doesn't.
        </h2>
      </div>

      <div className={`grid grid-cols-2 gap-6 max-w-5xl w-full transition-all duration-700 ${v2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 24, padding: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>😴</div>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: '#ef4444', marginBottom: 16 }}>Traditional Financial Apps</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {['Wait for you to open the app', 'Notify you after damage is done', 'Require manual categorisation', 'Show you black-box decisions', 'Execute without explanation'].map(item => (
              <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
                <span style={{ color: '#ef4444', marginTop: 1 }}>✗</span>{item}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 24, padding: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛡️</div>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: '#22c55e', marginBottom: 16 }}>BUNQSY</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {['Monitors every 60 seconds, autonomously', 'Intervenes before damage happens', 'Auto-categorises every transaction', 'Every decision narrated in plain English', 'Plan → Explain → Confirm → Execute'].map(item => (
              <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>
                <span style={{ color: '#22c55e', marginTop: 1 }}>✓</span>{item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={`mt-8 max-w-3xl text-center transition-all duration-700 ${v3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderLeft: `4px solid ${BUNQ_YELLOW}`, borderRadius: 16, padding: '20px 28px' }}>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', fontWeight: 400, lineHeight: 1.6 }}>
            "BUNQSY is not a chatbot for your bank. It's an immune system for your financial life."
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Slide 3: Architecture ────────────────────────────────────────────────────
function SlideArchitecture({ active }: { active: boolean }) {
  const v1 = useAnimateIn(active, 100);
  const v2 = useAnimateIn(active, 300);
  const v3 = useAnimateIn(active, 600);

  const layers = [
    { label: 'bunq API', color: BUNQ_YELLOW, icon: '🏦', items: ['RSA-2048 signing', 'Cards & Goals API', 'Webhooks (push)', 'Savings jars'] },
    { label: 'Daemon (Fastify)', color: '#3b82f6', icon: '⚙️', items: ['60s Heartbeat loop', 'SQLite WAL + vec', '25+ REST endpoints', 'WebSocket gateway'] },
    { label: 'Risk Oracle (Claude)', color: '#a855f7', icon: '🧠', items: ['7 sub-agents concurrent', '800-token hard budget', 'Vote aggregator', 'Plain-English narration'] },
    { label: 'Frontend (React)', color: '#22c55e', icon: '🖥️', items: ['5 tabs live', 'Rainbow Health Score', 'Guardian Feed', 'Voice Orb'] },
    { label: 'Bookkeeping', color: '#f97316', icon: '📒', items: ['Double-entry journal', 'P&L + VAT tracker', 'CSV/MT940 export', 'Auto-categorisation'] },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-8">
      <div className={`text-center mb-8 transition-all duration-700 ${v1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'}`}>
        <Badge>Technical Architecture</Badge>
        <h2 style={{ fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 900, color: '#fff', marginTop: 12 }}>End-to-End TypeScript Monorepo</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: 6, fontSize: 14 }}>Turborepo · daemon / frontend / shared</p>
      </div>

      <div className={`grid grid-cols-5 gap-3 max-w-6xl w-full transition-all duration-700 ${v2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        {layers.map((layer) => (
          <div key={layer.label} style={{ background: layer.color + '0f', border: `1px solid ${layer.color}35`, borderRadius: 20, padding: '20px 16px', borderTop: `3px solid ${layer.color}` }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{layer.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: layer.color, marginBottom: 12, letterSpacing: '-0.01em' }}>{layer.label}</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {layer.items.map(item => (
                <li key={item} style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: layer.color, marginTop: 4, flexShrink: 0 }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className={`mt-6 max-w-6xl w-full transition-all duration-700 ${v3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '16px 24px' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Data Flow</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            {['bunq Webhook', '→', 'Heartbeat Tick', '→', '7 Oracle Votes', '→', 'Intervention Card', '→', 'User Confirms', '→', 'execute.ts only'].map((s, i) => (
              <span key={i} style={i % 2 === 0
                ? { fontSize: 11, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '6px 14px' }
                : { color: 'rgba(255,255,255,0.25)', fontSize: 18 }
              }>{s}</span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { color: '#ef4444', label: 'Single Write Gateway — execute.ts is the ONLY file that touches bunq writes' },
            { color: '#3b82f6', label: 'Strict TypeScript + Zod throughout' },
            { color: '#22c55e', label: 'Append-only audit log' },
          ].map(l => (
            <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, flexShrink: 0 }} />{l.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Slide 4: BUNQSY Health Score ─────────────────────────────────────────────
function SlideBunqsyScore({ active }: { active: boolean }) {
  const v1 = useAnimateIn(active, 100);
  const v2 = useAnimateIn(active, 400);
  const v3 = useAnimateIn(active, 700);
  const [score, setScore] = useState(74);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => {
      setTick(n => (n + 1) % 60);
      setScore(s => Math.max(35, Math.min(99, s + (Math.random() > 0.5 ? 1 : -1))));
    }, 1000);
    return () => clearInterval(t);
  }, [active]);

  const label = score >= 75 ? 'Healthy ✓' : score >= 55 ? 'Caution ⚠' : 'At Risk 🚨';
  const components = [
    { label: 'Balance Health', w: 35, color: '#3b82f6' },
    { label: 'Spend Velocity', w: 25, color: '#22c55e' },
    { label: 'Goal Progress',  w: 25, color: '#a855f7' },
    { label: 'Upcoming Risk',  w: 15, color: '#f97316' },
  ];
  const circumference = 2 * Math.PI * 80;

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-8">
      <div className={`text-center mb-8 transition-all duration-700 ${v1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'}`}>
        <Badge>Health Score</Badge>
        <h2 style={{ fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 900, color: '#fff', marginTop: 12 }}>BUNQSY Health Score</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: 6, fontSize: 14 }}>Live 0–100 composite · updated every 60s heartbeat</p>
      </div>

      <div className={`flex gap-10 items-center max-w-5xl w-full transition-all duration-700 ${v2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        {/* Rainbow ring */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ position: 'relative', width: 220, height: 220 }}>
            <svg viewBox="0 0 200 200" width={220} height={220} style={{ transform: 'rotate(-90deg)' }}>
              <defs>
                <linearGradient id="scoreRainbow" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#ef4444" />
                  <stop offset="17%"  stopColor="#f97316" />
                  <stop offset="33%"  stopColor="#eab308" />
                  <stop offset="50%"  stopColor="#22c55e" />
                  <stop offset="67%"  stopColor="#3b82f6" />
                  <stop offset="83%"  stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={14} />
              <circle cx="100" cy="100" r="80" fill="none"
                stroke="url(#scoreRainbow)" strokeWidth={14}
                strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.8s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 56, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{score}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{label}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 100, padding: '6px 16px' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Tick {tick}s / 60s</span>
          </div>
        </div>

        {/* Components */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {components.map((c) => {
            const val = Math.round(score * c.w / 100);
            return (
              <div key={c.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{c.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{val} pts <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>({c.w}%)</span></span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 8, background: c.color, width: `${(val / c.w) * 100}%`, transition: 'width 0.9s ease', boxShadow: `0 0 8px ${c.color}60` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Heartbeat phases */}
      <div className={`mt-8 max-w-5xl w-full transition-all duration-700 ${v3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {[
            { icon: '📥', step: 'Recall', desc: 'Hydrate from SQLite — transactions, patterns, goals, accounts, score history' },
            { icon: '🧠', step: 'Reason', desc: '7 Risk Oracle sub-agents run in parallel, each 800-token capped, cast typed OracleVote' },
            { icon: '🎯', step: 'React', desc: 'Emit Health Score + any intervention via WebSocket to all connected dashboard clients' },
          ].map(s => (
            <div key={s.step} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{s.step}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Slide 5: Risk Oracle ─────────────────────────────────────────────────────
function SlideOracle({ active }: { active: boolean }) {
  const v1 = useAnimateIn(active, 100);
  const v2 = useAnimateIn(active, 400);
  const [animating, setAnimating] = useState(false);
  const [votes, setVotes] = useState<Record<string, { verdict: string; confidence: number; color: string } | null>>({});

  const agents = [
    { id: 'balance',      name: 'Balance Sentinel',     icon: '⚖️', verdict: 'CLEAR',     confidence: 97, color: '#22c55e' },
    { id: 'velocity',     name: 'Velocity Analyzer',    icon: '⚡', verdict: 'WARN',      confidence: 71, color: '#eab308' },
    { id: 'pattern',      name: 'Pattern Matcher',      icon: '🔮', verdict: 'CLEAR',     confidence: 88, color: '#22c55e' },
    { id: 'subscription', name: 'Subscription Watcher', icon: '🔍', verdict: 'CLEAR',     confidence: 94, color: '#22c55e' },
    { id: 'rent',         name: 'Rent Guard',            icon: '🏠', verdict: 'CLEAR',     confidence: 82, color: '#22c55e' },
    { id: 'fraud',        name: 'Fraud Shadow',          icon: '🛡️', verdict: 'INTERVENE', confidence: 93, color: '#ef4444' },
    { id: 'jar',          name: 'Jar Optimizer',         icon: '🐷', verdict: 'CLEAR',     confidence: 79, color: '#22c55e' },
  ];

  const runDemo = () => {
    if (animating) return;
    setVotes({});
    setAnimating(true);
    agents.forEach((a, i) => {
      setTimeout(() => {
        setVotes(prev => ({ ...prev, [a.id]: { verdict: a.verdict, confidence: a.confidence, color: a.color } }));
        if (i === agents.length - 1) setAnimating(false);
      }, (i + 1) * 500);
    });
  };

  const allVoted = Object.keys(votes).length === agents.length;

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-8">
      <div className={`text-center mb-8 transition-all duration-700 ${v1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'}`}>
        <Badge>Risk Engine</Badge>
        <h2 style={{ fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 900, color: '#fff', marginTop: 12 }}>Risk Oracle</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: 6, fontSize: 14 }}>7 specialised Claude sub-agents · 800-token hard budget each · cannot call each other · cannot write to bunq</p>
      </div>

      <div className={`w-full max-w-5xl transition-all duration-700 ${v2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
          {agents.slice(0, 4).map(a => {
            const vote = votes[a.id];
            return (
              <div key={a.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${vote ? vote.color + '50' : 'rgba(255,255,255,0.07)'}`, borderRadius: 16, padding: '16px 14px', transition: 'border-color 0.4s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <span style={{ fontSize: 22 }}>{a.icon}</span>
                  {vote && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 100, background: vote.color + '20', color: vote.color, letterSpacing: '0.10em' }}>{vote.verdict}</span>}
                  {!vote && animating && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>voting…</span>}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 6 }}>{a.name}</div>
                {vote && (
                  <div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 4 }}>
                      <div style={{ height: '100%', borderRadius: 4, background: vote.color, width: `${vote.confidence}%`, transition: 'width 0.7s ease' }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{vote.confidence}% confidence</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
          {agents.slice(4).map(a => {
            const vote = votes[a.id];
            return (
              <div key={a.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${vote ? vote.color + '50' : 'rgba(255,255,255,0.07)'}`, borderRadius: 16, padding: '16px 14px', transition: 'border-color 0.4s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <span style={{ fontSize: 22 }}>{a.icon}</span>
                  {vote && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 100, background: vote.color + '20', color: vote.color, letterSpacing: '0.10em' }}>{vote.verdict}</span>}
                  {!vote && animating && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>voting…</span>}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 6 }}>{a.name}</div>
                {vote && (
                  <div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 4 }}>
                      <div style={{ height: '100%', borderRadius: 4, background: vote.color, width: `${vote.confidence}%`, transition: 'width 0.7s ease' }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{vote.confidence}% confidence</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {allVoted && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)', borderLeft: '4px solid #ef4444', borderRadius: 16, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#ef4444' }}>🚨 VERDICT: INTERVENE</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Fraud Shadow flagged 93% confidence · Risk Score: 87 · FraudBlock modal dispatched</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#fff' }}>87</div>
              <div style={{ fontSize: 10, color: '#ef4444' }}>Risk Score</div>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={runDemo}
            disabled={animating}
            style={{
              background: animating ? 'rgba(255,255,255,0.05)' : RAINBOW,
              color: animating ? 'rgba(255,255,255,0.4)' : '#000',
              border: 'none', borderRadius: 100, padding: '12px 32px',
              fontWeight: 800, fontSize: 14, cursor: animating ? 'default' : 'pointer',
              transition: 'all 0.3s',
            }}
          >
            {animating ? '⚡ Agents Voting…' : '▶ Simulate Fraud Event'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Slide 6: Interventions ───────────────────────────────────────────────────
function SlideInterventions({ active }: { active: boolean }) {
  const v1 = useAnimateIn(active, 100);
  const v2 = useAnimateIn(active, 400);
  const [selected, setSelected] = useState(0);

  const cards = [
    {
      label: '🔴 Fraud Block', color: '#ef4444',
      title: 'Suspicious Transaction Detected',
      narration: 'Four simultaneous fraud signals: it\'s 2am, the merchant appears for the first time in your history, the amount is a round €200, and the currency is foreign — all four are anomalies for your profile. Fraud Shadow voted INTERVENE at 93% confidence.',
      signals: ['2am local time', 'New merchant — first appearance', 'Round number: €200.00', 'Foreign currency (USD)'],
      action: 'Block Transaction',
    },
    {
      label: '🟡 Rent Warning', color: '#eab308',
      title: 'Balance Nearing Rent Threshold',
      narration: 'Your rent of €950 is due in 6 days. Current balance is €1,042 — just 10% above the threshold. Based on your weekend spend pattern (avg €180), Rent Guard projects a shortfall by Thursday unless you adjust.',
      signals: ['Balance: €1,042', 'Rent due in 6 days: €950', 'Weekend avg spend: €180', 'Projected shortfall: €88'],
      action: 'Review Spending',
    },
    {
      label: '🟢 Salary Landed', color: '#22c55e',
      title: 'Salary Received — Auto-Split Ready',
      narration: 'Your €3,200 salary just arrived. BUNQSY has calculated an optimal split across your bunq jars based on rent due date, emergency fund target, and your Amsterdam savings goal progress (63%).',
      signals: ['€3,200 from employer', '€950 → Rent Reserve jar', '€320 → Emergency Fund', '€200 → Amsterdam Trip 🎯'],
      action: 'Confirm 3 Transfers',
    },
    {
      label: '🟠 Impulse Alert', color: '#f97316',
      title: 'Impulse Pattern Detected',
      narration: 'You\'ve spent €340 on food delivery in 3 days — 280% above your €45 weekly average. Pattern Matcher identified this as your "late-night impulse" pattern (87% confidence, seen 4 times before). Budget resets Monday.',
      signals: ['€340 food delivery (3 days)', '280% above weekly avg', 'Pattern: late-night impulse', 'Confidence: 87%'],
      action: 'Set Limit',
    },
  ];

  const card = cards[selected]!;

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-8">
      <div className={`text-center mb-6 transition-all duration-700 ${v1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'}`}>
        <Badge>Intervention Engine</Badge>
        <h2 style={{ fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 900, color: '#fff', marginTop: 12 }}>PLAN → CONFIRM → EXECUTE</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: 6, fontSize: 14 }}>Every action narrated by Claude · No black boxes · No write without explicit confirmation</p>
      </div>

      <div className={`flex gap-3 mb-6 flex-wrap justify-center transition-all duration-500 ${v1 ? 'opacity-100' : 'opacity-0'}`}>
        {cards.map((c, i) => (
          <button key={c.label} onClick={() => setSelected(i)}
            style={{ padding: '7px 18px', borderRadius: 100, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, transition: 'all 0.2s',
              background: selected === i ? c.color : 'rgba(255,255,255,0.06)', color: selected === i ? '#000' : 'rgba(255,255,255,0.5)' }}
          >{c.label}</button>
        ))}
      </div>

      <div className={`max-w-3xl w-full transition-all duration-700 ${v2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div style={{ background: card.color + '0a', border: `1px solid ${card.color}35`, borderRadius: 24, padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: card.color, marginBottom: 4 }}>{card.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{card.title}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '8px 14px', textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#a855f7' }}>🧠 Claude</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>narrated</div>
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#a855f7', fontWeight: 700, letterSpacing: '0.10em', marginBottom: 8 }}>CLAUDE NARRATION</div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: 0 }}>"{card.narration}"</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
            {card.signals.map(sig => (
              <div key={sig} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: card.color, flexShrink: 0 }} />{sig}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{ flex: 1, padding: '12px', borderRadius: 14, border: 'none', cursor: 'pointer', background: card.color, color: '#000', fontWeight: 800, fontSize: 14 }}>{card.action}</button>
            <button style={{ padding: '12px 20px', borderRadius: 14, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 14 }}>Dismiss</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Slide 7: Cards Management ────────────────────────────────────────────────
function SlideCards({ active }: { active: boolean }) {
  const v1 = useAnimateIn(active, 100);
  const v2 = useAnimateIn(active, 400);
  const v3 = useAnimateIn(active, 700);
  const [frozen, setFrozen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const gradients = [
    'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    'linear-gradient(135deg, #1a0533 0%, #2d0a5e 50%, #1a1a3e 100%)',
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-8">
      <div className={`text-center mb-8 transition-all duration-700 ${v1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'}`}>
        <Badge color="#3b82f6">bunq Cards API</Badge>
        <h2 style={{ fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 900, color: '#fff', marginTop: 12 }}>Live Cards Management</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: 6, fontSize: 14 }}>Real bunq card data · freeze/unfreeze via PLAN → CONFIRM → EXECUTE gateway</p>
      </div>

      <div className={`flex gap-8 max-w-5xl w-full items-start transition-all duration-700 ${v2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        {/* Demo card */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ borderRadius: 20, background: gradients[frozen ? 1 : 0], border: `1px solid rgba(255,255,255,0.10)`, padding: '20px 22px', position: 'relative', overflow: 'hidden', minHeight: 170, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: frozen ? '0 4px 20px rgba(239,68,68,0.15)' : '0 8px 32px rgba(0,0,0,0.4)' }}>
            {/* Rainbow strip */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: RAINBOW, borderRadius: '20px 20px 0 0' }} />
            {/* Top row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#fff', fontFamily: 'Montserrat, sans-serif' }}>bunq</span>
              <span style={{ fontSize: 9, fontWeight: 800, padding: '3px 10px', borderRadius: 100, background: frozen ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.15)', color: frozen ? '#ef4444' : '#22c55e', letterSpacing: '0.12em' }}>{frozen ? 'FROZEN' : 'ACTIVE'}</span>
            </div>
            {/* Chip */}
            <div style={{ width: 36, height: 28, borderRadius: 5, background: 'linear-gradient(135deg,#c8a95b,#e8c97a 40%,#b8913a)', border: '1px solid rgba(255,255,255,0.15)' }} />
            {/* PAN + details */}
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.18em', marginBottom: 8, fontFamily: 'Montserrat, monospace' }}>●●●● &nbsp;●●●● &nbsp;●●●● &nbsp;9610</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.10em', marginBottom: 2 }}>CARD HOLDER</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>MERL CANTERBURY</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.10em', marginBottom: 2 }}>EXPIRES</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>12/28</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action area */}
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none', borderRadius: '0 0 16px 16px', padding: '12px 16px' }}>
            {!confirming ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>💳 Mastercard · {frozen ? 'Frozen' : 'Tap to freeze'}</span>
                <button onClick={() => setConfirming(true)} style={{ padding: '7px 18px', borderRadius: 100, border: 'none', cursor: 'pointer', background: frozen ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)', color: frozen ? '#22c55e' : '#ef4444', fontSize: 11, fontWeight: 700 }}>
                  {frozen ? 'Unfreeze' : 'Freeze'}
                </button>
              </div>
            ) : (
              <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderLeft: '3px solid #ef4444', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, color: '#a855f7', fontWeight: 700, marginBottom: 6 }}>🧠 PLAN CREATED — Claude Narration:</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: 8 }}>Freezing your MERL CANTERBURY Mastercard ending in 9610. This will prevent all future transactions until you unfreeze it.</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginBottom: 10 }}>🔍 PLAN → CONFIRM → EXECUTE · Rule #2</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setFrozen(!frozen); setConfirming(false); }} style={{ flex: 1, padding: '8px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 700 }}>Confirm Freeze</button>
                  <button onClick={() => setConfirming(false)} style={{ padding: '8px 16px', borderRadius: 10, cursor: 'pointer', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600 }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Features list */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { icon: '💳', title: 'Live bunq card data', desc: 'Physical + virtual Mastercards fetched directly from bunq Cards API on every request' },
            { icon: '🔒', title: 'Freeze / Unfreeze', desc: 'PUT to bunq with status DEACTIVATED/ACTIVE — gated through full PLAN→CONFIRM→EXECUTE with Claude narration' },
            { icon: '🎯', title: 'bunq Savings Goals', desc: 'Native bunq savings goals shown with progress bars alongside your cards' },
            { icon: '🧪', title: 'Sandbox demo injection', desc: 'When BUNQ_ENV=sandbox and no cards exist, realistic demo cards inject with the real account holder name from the API' },
            { icon: '🛡️', title: 'Constitutional compliance', desc: 'Card writes are ExecutionStepType: CARD_FREEZE / CARD_UNFREEZE — only execute.ts touches bunq' },
          ].map(f => (
            <div key={f.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 16px' }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{f.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{f.title}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`mt-6 max-w-5xl w-full transition-all duration-700 ${v3 ? 'opacity-100' : 'opacity-0'}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: 12, padding: '10px 18px' }}>
          <span style={{ fontSize: 16 }}>🛡</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>All card write actions require explicit confirmation via PLAN → CONFIRM → EXECUTE. BUNQSY never writes to bunq without your consent. Constitutional Rule #1 & #2.</span>
        </div>
      </div>
    </div>
  );
}

// ─── Slide 8: Voice + Receipt ─────────────────────────────────────────────────
function SlideVoiceReceipt({ active }: { active: boolean }) {
  const v1 = useAnimateIn(active, 100);
  const v2 = useAnimateIn(active, 400);
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'plan'>('idle');

  const triggerVoice = () => {
    if (voiceState !== 'idle') { setVoiceState('idle'); return; }
    setVoiceState('listening');
    setTimeout(() => setVoiceState('plan'), 2800);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-8">
      <div className={`text-center mb-8 transition-all duration-700 ${v1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'}`}>
        <Badge color="#8b5cf6">Voice + Vision</Badge>
        <h2 style={{ fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 900, color: '#fff', marginTop: 12 }}>Speak. Snap. Done.</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: 6, fontSize: 14 }}>ElevenLabs STT → Claude NLU → Execution Plan → TTS confirmation</p>
      </div>

      <div className={`grid grid-cols-2 gap-8 max-w-5xl w-full transition-all duration-700 ${v2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        {/* Voice */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🎤</div>
            {voiceState === 'listening' && (
              <div style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: '3px solid #3b82f6', animation: 'ping 1s infinite', opacity: 0.6 }} />
            )}
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 8 }}>VoiceOrb</h3>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 1.6, marginBottom: 20 }}>
            ElevenLabs scribe_v1 transcribes your speech. Claude Haiku converts it to a typed ExecutionPlan. ElevenLabs TTS reads back the confirmation.
          </p>

          {voiceState === 'idle' && (
            <button onClick={triggerVoice} style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', borderRadius: 100, padding: '10px 24px', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>🎤 Tap to Speak</button>
          )}
          {voiceState === 'listening' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#3b82f6', fontWeight: 600, fontSize: 13, marginBottom: 8 }}>🎙️ Listening…</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontStyle: 'italic' }}>"Send €20 to Sarah for lunch"</div>
            </div>
          )}
          {voiceState === 'plan' && (
            <div style={{ width: '100%', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 800, letterSpacing: '0.10em', marginBottom: 8 }}>✅ EXECUTION PLAN READY</div>
              <div style={{ fontSize: 13, color: '#fff', marginBottom: 4 }}>Send <strong>€20.00</strong> to Sarah</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>Balance after: €1,470 · via primary account</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setVoiceState('idle')} style={{ flex: 1, background: '#22c55e', border: 'none', borderRadius: 10, padding: '8px', color: '#000', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Confirm</button>
                <button onClick={() => setVoiceState('idle')} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '8px', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Receipt */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 100, height: 100, borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '2px dashed rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, marginBottom: 20 }}>🧾</div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Receipt Scanner</h3>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 1.6, marginBottom: 20 }}>
            Snap a receipt. Claude Sonnet extracts line items, a verifier checks totals within ±2%, and a categoriser matches to a bunq transaction.
          </p>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {[['Merchant', 'Albert Heijn'], ['Total', '€47.82'], ['Category', 'Groceries 🛒'], ['Line Items', '8 items parsed'], ['Match', '✅ Matched bunq txn']].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
                <span style={{ color: '#fff', fontWeight: 500 }}>{val}</span>
              </div>
            ))}
          </div>
          <div style={{ width: '100%', background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.20)', borderRadius: 12, padding: '10px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
            🧠 <span style={{ color: '#a855f7', fontWeight: 600 }}>Claude Sonnet</span> confidence: <strong style={{ color: '#fff' }}>97%</strong> · Self-verified with ±2% check
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Slide 9: Dream Mode ──────────────────────────────────────────────────────
function SlideDreamMode({ active }: { active: boolean }) {
  const v1 = useAnimateIn(active, 100);
  const v2 = useAnimateIn(active, 400);
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle');

  const trigger = () => {
    if (state !== 'idle') return;
    setState('running');
    setTimeout(() => setState('done'), 3800);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-8">
      <div className={`text-center mb-8 transition-all duration-700 ${v1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'}`}>
        <Badge color="#6366f1">Dream Mode</Badge>
        <h2 style={{ fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 900, color: '#fff', marginTop: 12 }}>While You Sleep</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: 6, fontSize: 14 }}>Nightly 02:00 · Forked child process · 10-minute kill timeout · Cannot import execute.ts</p>
      </div>

      <div className={`grid grid-cols-2 gap-8 max-w-5xl w-full transition-all duration-700 ${v2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '100%', borderRadius: 24, overflow: 'hidden', marginBottom: 16, aspectRatio: '16/9' }}>
            <img src="/images/dream-mode.jpg" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Dream Mode" />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #000 0%, transparent 60%)' }} />
            <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Dream Mode</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Fires at 02:00 in your configured timezone</div>
            </div>
          </div>
          <button onClick={trigger} disabled={state !== 'idle'}
            style={{ width: '100%', padding: '14px', borderRadius: 16, border: 'none', cursor: state === 'idle' ? 'pointer' : 'default', fontWeight: 800, fontSize: 15,
              background: state === 'idle' ? 'linear-gradient(135deg,#6366f1,#a855f7)' : state === 'running' ? 'rgba(255,255,255,0.04)' : '#22c55e',
              color: state === 'running' ? 'rgba(255,255,255,0.4)' : '#fff' }}>
            {state === 'idle' ? '💤 Trigger Dream Mode' : state === 'running' ? '🌙 Dreaming…' : '✅ Dream Complete'}
          </button>
          {state === 'running' && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
              {['Loading 7-day transactions…', 'Updating pattern confidence scores…', 'Generating DNA card with Claude…', 'Producing 3 actionable suggestions…'].map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />{s}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {state === 'done' ? (
            <>
              <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 16, padding: '16px 18px' }}>
                <div style={{ fontSize: 10, color: '#6366f1', fontWeight: 700, letterSpacing: '0.10em', marginBottom: 8 }}>🌅 MORNING BRIEFING</div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: 0 }}>"Last week you stayed on track with your rent reserve. Weekend dining jumped 40% — matches a pattern seen 3 times. Amsterdam trip is 63% complete; at this rate, you'll hit it in 6 weeks."</p>
              </div>
              <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.12))', border: '1px solid rgba(168,85,247,0.25)', borderRadius: 16, padding: '16px 18px' }}>
                <div style={{ fontSize: 10, color: '#a855f7', fontWeight: 700, letterSpacing: '0.10em', marginBottom: 8 }}>🧬 FINANCIAL DNA CARD</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>"Disciplined saver, impulsive weekends, risk-aware"</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>Updated nightly from confirmed patterns</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '16px 18px' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.10em', marginBottom: 10 }}>💡 THIS WEEK'S ACTIONS</div>
                {['Cap weekend dining at €60', 'Transfer €50 extra to Amsterdam jar', 'Review Netflix + Spotify overlap'].map(s => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>
                    <span style={{ color: BUNQ_YELLOW }}>→</span>{s}
                  </div>
                ))}
              </div>
            </>
          ) : (
            [
              { icon: '📊', title: 'Pattern Analysis', desc: 'Reviews all patterns, updates confidence scores, flags contradictions' },
              { icon: '🧬', title: 'Financial DNA Card', desc: '4–6 word personality summary built from real behaviour, updated nightly' },
              { icon: '💡', title: 'Actionable Suggestions', desc: '3 concrete actions for the coming week, not generic advice' },
              { icon: '🔒', title: 'Worker Isolation', desc: 'Forked child process — cannot import execute.ts · 10-minute kill timeout' },
            ].map(item => (
              <div key={item.title} style={{ display: 'flex', gap: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px' }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Slide 10: Bookkeeping ────────────────────────────────────────────────────
function SlideBookkeeping({ active }: { active: boolean }) {
  const v1 = useAnimateIn(active, 100);
  const v2 = useAnimateIn(active, 350);
  const v3 = useAnimateIn(active, 650);

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-8">
      <div className={`text-center mb-8 transition-all duration-700 ${v1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'}`}>
        <Badge color="#f97316">Bookkeeping</Badge>
        <h2 style={{ fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 900, color: '#fff', marginTop: 12 }}>Auto-Bookkeeping Engine</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: 6, fontSize: 14 }}>Every bunq transaction auto-categorised into a double-entry journal · Dutch BTW compliant</p>
      </div>

      <div className={`grid grid-cols-3 gap-5 max-w-5xl w-full transition-all duration-700 ${v2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        {/* Status */}
        <div style={{ background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 20, padding: 22, borderTop: '3px solid #f97316' }}>
          <div style={{ fontSize: 10, color: '#f97316', fontWeight: 800, letterSpacing: '0.12em', marginBottom: 16 }}>STATUS</div>
          {[['Total Transactions', '46', '#fff'], ['Journal Entries', '24', '#3b82f6'], ['Uncategorized', '22', '#f97316'], ['Pending Review', '1', '#eab308']].map(([label, val, color]) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color }}>{val}</div>
            </div>
          ))}
        </div>

        {/* P&L */}
        <div style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 20, padding: 22, borderTop: '3px solid #22c55e' }}>
          <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 800, letterSpacing: '0.12em', marginBottom: 16 }}>P&L (YTD 2026)</div>
          {[['Revenue', '€7,000.00', '#22c55e'], ['Deductible Expenses', '€795.21', '#f97316'], ['Personal Spend', '€1,480.47', 'rgba(255,255,255,0.45)'], ['Net Profit', '€6,204.79', '#22c55e']].map(([label, val, color]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{label}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color }}>{val}</span>
            </div>
          ))}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>Top expense categories</div>
            {[['BIZ_HARDWARE', 71], ['BIZ_TRAVEL', 10], ['BIZ_MEALS', 11], ['BIZ_BANK_FEES', 8]].map(([cat, pct]) => (
              <div key={cat as string} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>
                  <span>{(cat as string).replace('BIZ_','')}</span><span>{pct}%</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 4 }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, background: '#22c55e' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* VAT */}
        <div style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 20, padding: 22, borderTop: '3px solid #3b82f6' }}>
          <div style={{ fontSize: 10, color: '#3b82f6', fontWeight: 800, letterSpacing: '0.12em', marginBottom: 16 }}>BTW / VAT TRACKER</div>
          {[{ q: 'Q1 2026', collected: 0, paid: 4.93, refund: 4.93 }, { q: 'Q2 2026', collected: 0, paid: 139.31, refund: 139.31 }].map(p => (
            <div key={p.q} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{p.q}</span>
                <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 100, background: 'rgba(59,130,246,0.15)', color: '#3b82f6', fontWeight: 700 }}>OPEN</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['Collected', `€${p.collected.toFixed(2)}`, '#22c55e'], ['Paid', `€${p.paid.toFixed(2)}`, '#f97316'], ['Refund Due', `€${p.refund.toFixed(2)}`, '#22c55e']].map(([label, val, color]) => (
                  <div key={label as string} style={{ flex: 1 }}>
                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: color as string }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[['CSV Export', '#22c55e'], ['MT940 Export', '#22c55e'], ['Review Queue', BUNQ_YELLOW]].map(([label, color]) => (
              <div key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: color as string }} />{label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`mt-6 max-w-5xl w-full transition-all duration-700 ${v3 ? 'opacity-100' : 'opacity-0'}`}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {['Claude Haiku categorises every transaction', 'Dutch BTW quarterly periods', 'Review queue for low-confidence entries', 'CSV + MT940 export', 'Feedback loop: corrections improve future categorisation'].map(f => (
            <span key={f} style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 100, padding: '5px 14px' }}>✓ {f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Slide 11: Forecast ───────────────────────────────────────────────────────
function SlideForecast({ active }: { active: boolean }) {
  const v1 = useAnimateIn(active, 100);
  const v2 = useAnimateIn(active, 400);

  const data = Array.from({ length: 30 }, (_, i) => {
    const base = 1490 - i * 12 + Math.sin(i * 0.6) * 90;
    const rent = i === 15 ? -950 : 0;
    const salary = i === 27 ? 3500 : 0;
    return { day: `D${i + 1}`, projected: Math.max(120, Math.round(base + rent + salary)), upper: Math.max(140, Math.round(base * 1.12 + rent + salary)), lower: Math.max(80, Math.round(base * 0.88 + rent + salary)) };
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-8">
      <div className={`text-center mb-8 transition-all duration-700 ${v1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'}`}>
        <Badge color="#06b6d4">30-Day Forecast</Badge>
        <h2 style={{ fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 900, color: '#fff', marginTop: 12 }}>Balance Projection</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: 6, fontSize: 14 }}>Salary + rent + subscriptions + impulse spend from pattern confidence · 6-hour cache</p>
      </div>

      <div className={`max-w-5xl w-full transition-all duration-700 ${v2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {[['Balance today', '€1,490', '#fff'], ['Projected Day 30', '~€2,100', '#22c55e'], ['⚠️ Risk Day 15', 'Rent: €950', '#ef4444'], ['Next salary', 'Day 27', BUNQ_YELLOW]].map(([label, val, color]) => (
            <div key={label as string} style={{ flex: 1, minWidth: 130, background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.07)`, borderRadius: 14, padding: '12px 16px' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: color as string }}>{val}</div>
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '20px 20px 8px' }}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BUNQ_YELLOW} stopOpacity={0.08} />
                  <stop offset="95%" stopColor={BUNQ_YELLOW} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} tickLine={false} interval={4} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `€${v}`} />
              <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, fontSize: 11 }} formatter={v => [`€${v}`, '']} />
              <Area type="monotone" dataKey="upper" stroke="none" fill="url(#bg)" />
              <Area type="monotone" dataKey="lower" stroke="none" fill="#000" />
              <Area type="monotone" dataKey="projected" stroke="#3b82f6" strokeWidth={2.5} fill="url(#fg)" />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 4, flexWrap: 'wrap' }}>
            {[['#3b82f6','Projected Balance'], [BUNQ_YELLOW,'80% Confidence Band'], ['#ef4444','Rent Day 15'], ['#22c55e','Salary Day 27']].map(([color, label]) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                <span style={{ width: 14, height: 3, borderRadius: 2, background: color }} />{label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Slide 12: bunq Integration ───────────────────────────────────────────────
function SlideBunqIntegration({ active }: { active: boolean }) {
  const v1 = useAnimateIn(active, 100);
  const v2 = useAnimateIn(active, 350);
  const v3 = useAnimateIn(active, 650);

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-8">
      <div className={`text-center mb-8 transition-all duration-700 ${v1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'}`}>
        <Badge>bunq API Depth</Badge>
        <h2 style={{ fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 900, color: '#fff', marginTop: 12 }}>Deep bunq Integration</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: 6, fontSize: 14 }}>Every write gated through the single write gateway · Production-switch ready</p>
      </div>

      <div className={`grid grid-cols-3 gap-5 max-w-5xl w-full transition-all duration-700 ${v2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        {[
          {
            title: 'Authentication', color: BUNQ_YELLOW, icon: '🔐',
            items: ['3-step protocol: install → device → session', 'RSA-2048 + SHA-256 request signing', 'Session stored in SQLite — restored on restart', '5-minute expiry buffer on reload'],
          },
          {
            title: 'Transactions + Accounts', color: '#3b82f6', icon: '🏦',
            items: ['Multi-account sync every heartbeat', 'Account classification: primary/savings/joint', 'Webhook push: PAYMENT + MUTATION events', '7-day sliding window for pattern matching'],
          },
          {
            title: 'Cards + Goals', color: '#22c55e', icon: '💳',
            items: ['Cards API: physical + virtual Mastercards', 'CARD_FREEZE / CARD_UNFREEZE plan steps', 'bunq native Savings Goals per account', 'Sandbox demo card injection (real name)'],
          },
          {
            title: 'Write Gateway', color: '#ef4444', icon: '🛡️',
            items: ['execute.ts — the ONLY write file', 'PAYMENT, SAVINGS_TRANSFER, DRAFT_PAYMENT', 'CANCEL_DRAFT, SANDBOX_FUND', 'CARD_FREEZE/UNFREEZE, CREATE_SAVINGS_GOAL'],
          },
          {
            title: 'Execution Plans', color: '#a855f7', icon: '📋',
            items: ['PENDING → CONFIRMED → EXECUTED flow', 'Append-only step result log', 'Cancellable before CONFIRMED', 'Every step narrated by Claude Haiku'],
          },
          {
            title: 'Production Ready', color: '#f97316', icon: '🚀',
            items: ['BUNQ_ENV=production to go live', 'Webhook push URL via WEBHOOK_PUBLIC_URL', 'All endpoints: sandbox + production', 'Zero hardcoded environment assumptions'],
          },
        ].map(section => (
          <div key={section.title} style={{ background: `${section.color}0d`, border: `1px solid ${section.color}30`, borderRadius: 18, padding: '18px 16px', borderLeft: `3px solid ${section.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>{section.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: section.color }}>{section.title}</span>
            </div>
            {section.items.map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 6, lineHeight: 1.4 }}>
                <span style={{ color: section.color, flexShrink: 0, marginTop: 1 }}>·</span>{item}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className={`mt-6 max-w-5xl w-full transition-all duration-700 ${v3 ? 'opacity-100' : 'opacity-0'}`}>
        <RainbowBar h={3} />
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 16, flexWrap: 'wrap', gap: 12 }}>
          {[['25+', 'API Endpoints'], ['14', 'DB Tables'], ['7', 'Oracle Agents'], ['1', 'Write Gateway']].map(([n, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 900, background: RAINBOW, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{n}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Slide 13: Closing ────────────────────────────────────────────────────────
function SlideClosing({ active }: { active: boolean }) {
  const v1 = useAnimateIn(active, 100);
  const v2 = useAnimateIn(active, 500);
  const v3 = useAnimateIn(active, 900);
  const v4 = useAnimateIn(active, 1300);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-full overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center scale-105" style={{ backgroundImage: 'url(/images/hero-bg.jpg)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 50%, #000 100%)' }} />
      <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />

      {/* Rainbow top */}
      <div className="absolute top-0 left-0 right-0" style={{ height: 4, background: RAINBOW }} />

      <div className={`relative z-10 text-center max-w-3xl px-8 transition-all duration-700 ${v1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div style={{ fontSize: 12, color: BUNQ_YELLOW, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>bunq Hackathon 7.0</div>
        <h1 style={{ fontSize: 'clamp(4rem,12vw,7rem)', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.04em', margin: 0 }}>BUNQSY</h1>
        <div style={{ height: 5, borderRadius: 5, background: RAINBOW, maxWidth: 360, margin: '12px auto' }} />
        <p style={{ fontSize: 'clamp(1rem,2vw,1.4rem)', color: 'rgba(255,255,255,0.55)', fontWeight: 300 }}>The Financial Guardian</p>
      </div>

      <div className={`relative z-10 mt-10 grid grid-cols-4 gap-4 max-w-4xl px-8 transition-all duration-700 ${v2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {[['7', 'AI Sub-Agents'], ['60s', 'Heartbeat Cycle'], ['30d', 'Forecast Horizon'], ['1', 'Write Gateway']].map(([n, label]) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 20, padding: '20px 14px', textAlign: 'center', backdropFilter: 'blur(8px)' }}>
            <div style={{ fontSize: 36, fontWeight: 900, background: RAINBOW, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{n}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      <div className={`relative z-10 mt-10 max-w-3xl px-8 text-center transition-all duration-700 ${v3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <blockquote style={{ fontSize: 'clamp(1rem,2vw,1.3rem)', color: 'rgba(255,255,255,0.65)', fontWeight: 300, fontStyle: 'italic', lineHeight: 1.7, margin: 0 }}>
          "Every other financial AI waits for you to ask a question.<br />
          BUNQSY is different. It watches. It learns. It dreams.<br />
          And it acts — always with your permission,<br />
          always with one audited path through the bunq API."
        </blockquote>
      </div>

      <div className={`relative z-10 mt-10 transition-all duration-700 ${v4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: RAINBOW, padding: '14px 40px', borderRadius: 100, boxShadow: '0 0 60px rgba(245,200,66,0.25)' }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#000' }}>Built for bunq Hackathon 7.0</span>
          <span style={{ fontSize: 20 }}>🚀</span>
        </div>
      </div>
    </div>
  );
}

// ─── Slides Registry ──────────────────────────────────────────────────────────
const SLIDES: Slide[] = [
  { id: 0,  title: 'Hero',             component: SlideHero },
  { id: 1,  title: 'Vision',           component: SlideVision },
  { id: 2,  title: 'Architecture',     component: SlideArchitecture },
  { id: 3,  title: 'Health Score',     component: SlideBunqsyScore },
  { id: 4,  title: 'Risk Oracle',      component: SlideOracle },
  { id: 5,  title: 'Interventions',    component: SlideInterventions },
  { id: 6,  title: 'Cards',            component: SlideCards },
  { id: 7,  title: 'Voice + Receipt',  component: SlideVoiceReceipt },
  { id: 8,  title: 'Dream Mode',       component: SlideDreamMode },
  { id: 9,  title: 'Bookkeeping',      component: SlideBookkeeping },
  { id: 10, title: 'Forecast',         component: SlideForecast },
  { id: 11, title: 'bunq Integration', component: SlideBunqIntegration },
  { id: 12, title: 'Closing',          component: SlideClosing },
];

// ─── App Shell ────────────────────────────────────────────────────────────────
export default function App() {
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const goTo = (idx: number) => {
    if (transitioning || idx === current) return;
    setTransitioning(true);
    setTimeout(() => { setCurrent(idx); setTransitioning(false); }, 280);
  };

  const prev = () => goTo(Math.max(0, current - 1));
  const next = () => goTo(Math.min(SLIDES.length - 1, current + 1));

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') next();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [current, transitioning]);

  return (
    <div ref={containerRef} className="h-screen w-screen overflow-hidden flex flex-col select-none" style={{ background: '#000', fontFamily: "'Space Grotesk','Inter',sans-serif" }}>
      {/* Rainbow top bar */}
      <div style={{ height: 3, background: RAINBOW, flexShrink: 0 }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 28px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: RAINBOW, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, color: '#000' }}>B</div>
          <span style={{ fontWeight: 800, fontSize: 13, color: '#fff' }}>BUNQSY</span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>bunq Hackathon 7.0</span>
        </div>

        {/* Dot nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {SLIDES.map((slide, i) => (
            <button key={slide.id} onClick={() => goTo(i)} title={slide.title}
              style={{ height: 6, width: i === current ? 24 : 6, borderRadius: 3, border: 'none', cursor: 'pointer', transition: 'all 0.3s', background: i === current ? BUNQ_YELLOW : 'rgba(255,255,255,0.18)' }}
            />
          ))}
        </div>

        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{current + 1} / {SLIDES.length}</div>
      </div>

      {/* Slide area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: transitioning ? 0 : 1, transition: 'opacity 0.28s ease' }}>
          {SLIDES.map((slide, i) => {
            const Component = slide.component;
            return (
              <div key={slide.id} style={{ position: 'absolute', inset: 0, overflowY: 'auto', paddingTop: 28, paddingBottom: 60, opacity: i === current ? 1 : 0, pointerEvents: i === current ? 'auto' : 'none', transition: 'opacity 0.28s' }}>
                <Component active={i === current && !transitioning} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 28px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', flexShrink: 0 }}>
        <button onClick={prev} disabled={current === 0}
          style={{ fontSize: 13, fontWeight: 600, color: current === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: current === 0 ? 'default' : 'pointer', transition: 'color 0.2s' }}>
          ← Previous
        </button>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>{SLIDES[current]?.title}</span>
        <button onClick={next} disabled={current === SLIDES.length - 1}
          style={{ fontSize: 13, fontWeight: 600, color: current === SLIDES.length - 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: current === SLIDES.length - 1 ? 'default' : 'pointer', transition: 'color 0.2s' }}>
          Next →
        </button>
      </div>

      <div style={{ position: 'absolute', bottom: 48, left: '50%', transform: 'translateX(-50%)', fontSize: 11, color: 'rgba(255,255,255,0.15)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        Use ← → arrow keys or Space to navigate
      </div>
    </div>
  );
}
