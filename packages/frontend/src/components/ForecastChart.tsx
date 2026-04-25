import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';
import type { ForecastPoint } from '@bunqsy/shared';
import { useForecast } from '../hooks/useForecast.js';

const EVENT_ICONS: Record<string, string> = {
  RENT:           '🏠',
  SALARY:         '💰',
  SUBSCRIPTION:   '🔄',
  IMPULSE_RISK:   '⚡',
  GOAL_MILESTONE: '🎯',
};

// ─── Custom tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ payload: ForecastPoint & { dayLabel: string } }>;
  label?: string;
}): React.JSX.Element | null {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div style={{
      background: '#0d0d12',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '12px',
      padding: '14px 16px',
      minWidth: '200px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
    }}>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '8px', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
        €{point.projectedBalance.toLocaleString()}
      </div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginBottom: '10px' }}>
        Range: €{point.lowerBound.toLocaleString()} – €{point.upperBound.toLocaleString()}
      </div>
      {point.events.length > 0 && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          paddingTop: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          {point.events.map((e, i) => (
            <div key={i} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{EVENT_ICONS[e.type] ?? '•'}</span>
              <span>{e.description}</span>
              {e.amount !== undefined && (
                <span style={{ color: e.type === 'SALARY' ? '#00ff95' : '#ff6b7a', fontWeight: 600, marginLeft: 'auto' }}>
                  {e.type === 'SALARY' ? '+' : '-'}€{e.amount}
                </span>
              )}
              {e.probability < 1 && (
                <span style={{ color: 'rgba(255,255,255,0.22)', marginLeft: 'auto' }}>{Math.round(e.probability * 100)}%</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Custom dot — red dot on risk/rent days ────────────────────────────────────

function CustomDot(props: {
  cx?: number; cy?: number;
  payload?: ForecastPoint & { dayLabel: string };
}): React.JSX.Element | null {
  const { cx = 0, cy = 0, payload } = props;
  if (!payload?.events?.length) return null;
  const hasRisk = payload.events.some(e => e.type === 'IMPULSE_RISK' || e.type === 'RENT');
  if (!hasRisk) return null;
  return <circle cx={cx} cy={cy} r={4} fill="#ff1500" stroke="#000" strokeWidth={2} />;
}

// ─── Milestone derivation ──────────────────────────────────────────────────────

interface Milestone {
  icon:    string;
  label:   string;
  sub:     string;
  amount:  number;
  color:   string;
}

function deriveMilestones(data: ForecastPoint[]): Milestone[] {
  if (data.length === 0) return [];

  // Lowest Point
  let lowestIdx = 0;
  for (let i = 1; i < data.length; i++) {
    if ((data[i]?.projectedBalance ?? Infinity) < (data[lowestIdx]?.projectedBalance ?? Infinity)) lowestIdx = i;
  }
  const lowestPoint = data[lowestIdx];

  // Post-Salary Peak: max balance on or after the first SALARY event (or global max if no salary)
  const salaryIdx = data.findIndex(d => d.events.some(e => e.type === 'SALARY'));
  let peakIdx = 0;
  const searchFrom = salaryIdx >= 0 ? salaryIdx : 0;
  for (let i = searchFrom; i < data.length; i++) {
    if ((data[i]?.projectedBalance ?? 0) > (data[peakIdx]?.projectedBalance ?? 0)) peakIdx = i;
  }
  const peakPoint = data[peakIdx];

  // Rent Buffer: balance on the day of the first RENT event
  const rentIdx = data.findIndex(d => d.events.some(e => e.type === 'RENT'));
  const rentPoint = rentIdx >= 0 ? data[rentIdx] : null;

  const milestones: Milestone[] = [
    {
      icon:   '📉',
      label:  'Lowest Point',
      sub:    `Day ${lowestIdx + 1}`,
      amount: lowestPoint?.projectedBalance ?? 0,
      color:  '#f59e0b',
    },
    {
      icon:   '🚀',
      label:  'Post-Salary Peak',
      sub:    salaryIdx >= 0 ? `Day ${peakIdx + 1}` : 'No salary detected',
      amount: peakPoint?.projectedBalance ?? 0,
      color:  '#00ff95',
    },
    {
      icon:   '🏡',
      label:  'Rent Buffer',
      sub:    rentPoint ? 'After rent' : 'No rent detected',
      amount: rentPoint?.projectedBalance ?? 0,
      color:  '#a78bfa',
    },
  ];

  return milestones;
}

// ─── Upcoming events derivation ────────────────────────────────────────────────

interface UpcomingEvent {
  icon:        string;
  label:       string;
  daySub:      string;
  amount?:     number;
  isIncome:    boolean;
  highlight:   boolean;
}

const EVENT_COLORS: Record<string, string> = {
  RENT:         '#f59e0b',
  SALARY:       '#00ff95',
  SUBSCRIPTION: 'rgba(255,255,255,0.45)',
  IMPULSE_RISK: '#ff6a00',
  GOAL_MILESTONE: '#00bfff',
};

const EVENT_LABELS: Record<string, string> = {
  RENT:         'Rent Payment',
  SALARY:       'Salary',
  SUBSCRIPTION: '',
  IMPULSE_RISK: 'Impulse Risk',
  GOAL_MILESTONE: 'Goal Milestone',
};

function deriveUpcomingEvents(data: ForecastPoint[]): UpcomingEvent[] {
  const result: UpcomingEvent[] = [];
  for (let i = 0; i < data.length; i++) {
    const point = data[i];
    if (!point || point.events.length === 0) continue;
    for (const ev of point.events) {
      const dayNum = i + 1;
      const dayOfMonth = new Date(point.date + 'T12:00:00').getDate();
      const daySub = `Day ${dayNum} (${dayOfMonth}${ordinal(dayOfMonth)})`;
      const label = ev.type === 'SUBSCRIPTION'
        ? ev.description
        : (ev.description || EVENT_LABELS[ev.type] || ev.type);
      const fullLabel = ev.type === 'SALARY' && !label.startsWith('Salary')
        ? `Salary — ${label}`
        : label;
      result.push({
        icon:      EVENT_ICONS[ev.type] ?? '📌',
        label:     fullLabel,
        daySub,
        amount:    ev.amount,
        isIncome:  ev.type === 'SALARY' || ev.type === 'GOAL_MILESTONE',
        highlight: ev.type === 'RENT' || ev.type === 'SALARY',
      });
    }
  }
  return result;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0] ?? 'th';
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ForecastChart(): React.JSX.Element {
  const { data, loading, error, refresh } = useForecast();

  if (error) {
    return (
      <div style={card}>
        <HeaderRow label="30-DAY FORECAST" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
          <span style={{ fontSize: '13px', color: '#ff1500', flex: 1 }}>{error}</span>
          <button onClick={refresh} style={retryBtn}>Retry</button>
        </div>
      </div>
    );
  }

  if (!data && loading) {
    return (
      <div style={card}>
        <HeaderRow label="30-DAY FORECAST" loading />
        <SkeletonLoader />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={card}>
        <HeaderRow label="30-DAY FORECAST" />
        <div style={{ textAlign: 'center', padding: '32px', fontSize: '13px', color: 'rgba(255,255,255,0.25)' }}>
          No forecast data yet — waiting for first heartbeat
        </div>
      </div>
    );
  }

  const RENT_THRESHOLD = 950;
  const day30Balance = data[data.length - 1]?.projectedBalance ?? 0;
  const riskDayIdx = data.findIndex(d => d.projectedBalance < RENT_THRESHOLD + 200);

  const chartData = data.map((p, i) => ({
    ...p,
    dayLabel: i === 0 ? 'Today' : i === 14 ? 'Day 14' : i === 29 ? 'Day 30' : `D${i + 1}`,
  }));

  return (
    <div style={card}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.32)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
            30-DAY FORECAST
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.80)', fontWeight: 500 }}>
            In 30 days, projected balance:{' '}
            <span style={{ color: day30Balance > RENT_THRESHOLD ? '#00ff95' : '#ff1500', fontWeight: 700 }}>
              ~€{day30Balance.toLocaleString()}
            </span>
          </div>
          {riskDayIdx > 0 && (
            <div style={{ fontSize: '12px', color: '#ff6a00', marginTop: '4px' }}>
              ⚠️ Balance drops near rent threshold on Day {riskDayIdx + 1}
            </div>
          )}
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'rgba(255,255,255,0.32)', flexShrink: 0 }}>
          <LegendItem color="#00bfff" label="Projected" type="line" />
          <LegendItem color="rgba(0,191,255,0.15)" label="80% Band" type="band" />
          <LegendItem color="#ff1500" label="Rent line" type="dashed" />
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: '200px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="forecastBalanceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#00bfff" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#00bfff" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="forecastBandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#00bfff" stopOpacity={0.10} />
                <stop offset="95%" stopColor="#00bfff" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />

            <XAxis
              dataKey="dayLabel"
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.22)' }}
              axisLine={false}
              tickLine={false}
              interval={4}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.22)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `€${(v / 1000).toFixed(1)}k`}
            />

            <Tooltip content={<CustomTooltip />} />

            <ReferenceLine
              y={RENT_THRESHOLD}
              stroke="#ff1500"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{ value: '🏠 Rent', position: 'insideTopRight', fontSize: 10, fill: '#ff1500' }}
            />

            {/* Band: upper fill, then cut out with background */}
            <Area type="monotone" dataKey="upperBound"  stroke="none" fill="url(#forecastBandGrad)" fillOpacity={1} isAnimationActive={false} />
            <Area type="monotone" dataKey="lowerBound"  stroke="none" fill="#000000"               fillOpacity={1} isAnimationActive={false} />

            {/* Main balance line */}
            <Area
              type="monotone"
              dataKey="projectedBalance"
              stroke="#00bfff"
              strokeWidth={2}
              fill="url(#forecastBalanceGrad)"
              dot={<CustomDot />}
              activeDot={{ r: 5, fill: '#00bfff', stroke: '#000', strokeWidth: 2 }}
              isAnimationActive={true}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Milestone cards ──────────────────────────────────────────────── */}
      {(() => {
        const milestones = deriveMilestones(data);
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {milestones.map(m => (
              <div key={m.label} style={{
                background: 'rgba(255,255,255,0.025)',
                border: `1px solid ${m.color}22`,
                borderRadius: '14px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}>
                <div style={{ fontSize: '18px', lineHeight: 1 }}>{m.icon}</div>
                <div style={{
                  fontSize: '22px', fontWeight: 800,
                  color: m.color,
                  letterSpacing: '-0.03em',
                  fontFamily: "'Montserrat', sans-serif",
                  lineHeight: 1.1,
                  marginTop: '4px',
                }}>
                  €{m.amount.toLocaleString('en-US')}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.70)' }}>
                  {m.label}
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.30)' }}>
                  {m.sub}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Upcoming Events ───────────────────────────────────────────────── */}
      {(() => {
        const events = deriveUpcomingEvents(data);
        if (events.length === 0) return null;
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', flexShrink: 0,
              }}>📅</div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>
                  Upcoming Events
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)' }}>
                  Detected from transaction history
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {events.slice(0, 6).map((ev, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '11px 14px',
                  background: ev.highlight
                    ? (ev.isIncome ? 'rgba(0,255,149,0.04)' : 'rgba(245,158,11,0.04)')
                    : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${ev.highlight
                    ? (ev.isIncome ? 'rgba(0,255,149,0.12)' : 'rgba(245,158,11,0.15)')
                    : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: '12px',
                }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '15px', flexShrink: 0,
                  }}>
                    {ev.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.80)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.label}
                    </div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.30)', marginTop: '2px' }}>
                      {ev.daySub}
                    </div>
                  </div>
                  {ev.amount !== undefined && (
                    <div style={{
                      fontSize: '13px', fontWeight: 700, flexShrink: 0,
                      color: ev.isIncome
                        ? '#00ff95'
                        : EVENT_COLORS[Object.keys(EVENT_ICONS).find(k => EVENT_ICONS[k] === ev.icon) ?? ''] ?? 'rgba(255,255,255,0.55)',
                    }}>
                      {ev.isIncome ? '+' : ''}€{ev.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Helper sub-components ────────────────────────────────────────────────────

function HeaderRow({ label, loading }: { label: string; loading?: boolean }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.32)', fontWeight: 600, textTransform: 'uppercase' }}>
        {label}
      </div>
      {loading && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>Updating…</span>}
    </div>
  );
}

function LegendItem({ color, label, type }: { color: string; label: string; type: 'line' | 'band' | 'dashed' }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <div style={{
        width: '20px',
        height: type === 'band' ? '8px' : '2px',
        background: color,
        borderRadius: type === 'band' ? '2px' : '1px',
        borderTop: type === 'dashed' ? `1px dashed ${color}` : undefined,
      }} />
      <span>{label}</span>
    </div>
  );
}

function SkeletonLoader(): React.JSX.Element {
  return (
    <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: 6, padding: '0 8px' }}>
      {[80, 60, 90, 50, 75, 65, 85, 70].map((h, i) => (
        <div key={i} style={{
          flex: 1, borderRadius: '4px 4px 0 0',
          background: 'rgba(0,191,255,0.10)',
          height: `${h}%`,
          animation: 'pulse 1.5s ease-in-out infinite',
          animationDelay: `${i * 80}ms`,
        }} />
      ))}
    </div>
  );
}

const retryBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '8px',
  color: 'rgba(255,255,255,0.45)',
  fontSize: '12px',
  padding: '4px 10px',
  cursor: 'pointer',
};

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '20px',
  padding: '28px',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
};
