import React, { useState, useEffect, useCallback } from 'react';
import type { ReviewItem, TaxCategory } from '@bunqsy/shared';
import { TaxCategorySchema } from '@bunqsy/shared';

const ALL_CATEGORIES = TaxCategorySchema.options;

function categoryLabel(cat: string): string {
  return cat.replace(/_/g, ' ').replace(/^(BIZ|PERSONAL|INCOME|TRANSFER|TAX) /i, '').toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function amountColor(eur: number): string {
  if (eur > 0) return '#00ff95';
  if (eur < -500) return '#ff6a00';
  return 'rgba(255,255,255,0.7)';
}

export function ReviewQueue(): React.JSX.Element {
  const [items, setItems]     = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [overrides, setOverrides] = useState<Record<string, TaxCategory>>({});
  const [approving, setApproving] = useState<Record<string, boolean>>({});

  const fetchQueue = useCallback(async () => {
    try {
      const res  = await fetch('/api/bookkeeping/review-queue');
      if (!res.ok) return;
      const data = await res.json() as { items: ReviewItem[] };
      setItems(data.items);
    } catch { /* daemon offline */ }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchQueue(); }, [fetchQueue]);

  async function approve(entryId: string): Promise<void> {
    setApproving(p => ({ ...p, [entryId]: true }));
    try {
      const body: Record<string, string> = {};
      if (overrides[entryId]) body['categoryOverride'] = overrides[entryId];
      await fetch(`/api/bookkeeping/review-queue/${entryId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setItems(prev => prev.filter(i => i.entryId !== entryId));
    } catch { /* silent */ }
    setApproving(p => ({ ...p, [entryId]: false }));
  }

  async function bulkApprove(): Promise<void> {
    await fetch('/api/bookkeeping/review-queue/bulk-approve', { method: 'POST' });
    setItems([]);
  }

  if (loading) {
    return (
      <div style={cardStyle}>
        <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
          Loading review queue…
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={sectionLabelStyle}>Review Queue</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
            {items.length} transaction{items.length !== 1 ? 's' : ''} need attention
          </div>
        </div>
        {items.length > 0 && (
          <button onClick={() => { void bulkApprove(); }} style={secondaryBtnStyle}>
            Approve All
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '12px', fontStyle: 'italic' }}>
          No items pending review. Books are up to date.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '480px', overflowY: 'auto' }}>
          {items.map(item => (
            <div key={item.entryId} style={{
              padding: '12px 14px',
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.counterpartyName ?? item.description}
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                    {item.date} · {item.reviewReason}
                  </div>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: amountColor(item.amountEur), flexShrink: 0, marginLeft: '12px' }}>
                  €{Math.abs(item.amountEur).toFixed(2)}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  fontSize: '10px', padding: '3px 8px', borderRadius: '100px',
                  background: 'rgba(0,191,255,0.08)', border: '1px solid rgba(0,191,255,0.2)',
                  color: '#00bfff', flexShrink: 0,
                }}>
                  {categoryLabel(item.suggestedCategory)}
                </div>
                <select
                  value={overrides[item.entryId] ?? item.suggestedCategory}
                  onChange={e => setOverrides(p => ({ ...p, [item.entryId]: e.target.value as TaxCategory }))}
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: '6px', color: 'rgba(255,255,255,0.7)', fontSize: '11px', padding: '4px 8px',
                    fontFamily: 'inherit',
                  }}
                >
                  {ALL_CATEGORIES.map(c => (
                    <option key={c} value={c}>{categoryLabel(c)}</option>
                  ))}
                </select>
                <button
                  onClick={() => { void approve(item.entryId); }}
                  disabled={approving[item.entryId]}
                  style={{
                    background: 'rgba(0,255,149,0.10)', border: '1px solid rgba(0,255,149,0.25)',
                    borderRadius: '8px', padding: '5px 12px', color: '#00ff95',
                    fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                    opacity: approving[item.entryId] ? 0.5 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  {approving[item.entryId] ? '…' : 'Approve'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '20px',
  padding: '24px',
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, letterSpacing: '0.10em',
  textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)',
};

const secondaryBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '100px', padding: '6px 14px',
  color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
};
