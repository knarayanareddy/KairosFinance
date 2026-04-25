import { useState, useEffect, useCallback } from 'react';
import type { ForecastPoint } from '@bunqsy/shared';

export interface ForecastState {
  data:    ForecastPoint[] | null;
  loading: boolean;
  error:   string | null;
}

export function useForecast(): ForecastState & { refresh: () => void } {
  const [state, setState] = useState<ForecastState>({
    data:    null,
    loading: true,
    error:   null,
  });

  const fetchForecast = useCallback((force = false) => {
    setState(s => ({ ...s, loading: true, error: null }));

    const url = force ? '/api/forecast?refresh=true' : '/api/forecast';

    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<ForecastPoint[]>;
      })
      .then(data => setState({ data, loading: false, error: null }))
      .catch((err: unknown) => setState(s => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Forecast unavailable',
      })));
  }, []);

  useEffect(() => { fetchForecast(false); }, [fetchForecast]);

  return { ...state, refresh: () => fetchForecast(true) };
}
