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

      {/* Event legend */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {[
          { icon: '🏠', label: 'Rent',        color: '#ff1500' },
          { icon: '💰', label: 'Salary',      color: '#00ff95' },
          { icon: '🔄', label: 'Subscription',color: '#00bfff' },
          { icon: '⚡', label: 'Impulse risk', color: '#ff6a00' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'rgba(255,255,255,0.32)' }}>
            <span>{item.icon}</span>
            <span style={{ color: item.color }}>{item.label}</span>
          </div>
        ))}
      </div>
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
