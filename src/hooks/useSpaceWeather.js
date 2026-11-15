import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchSpaceWeather, summarize } from '../lib/spaceweather.js';

const CACHE_KEY = 'crew_vitals_spaceweather_cache';
const MAX_AGE = 30 * 60 * 1000; // reuse a fetch for 30 minutes (DEMO_KEY allows only ~30 requests per hour)
const REFRESH_EVERY = 60 * 60 * 1000;

const readCache = () => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
};
const writeCache = (v) => {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(v)); } catch { /* storage blocked */ }
};

// status: 'loading' | 'ok' | 'stale' (cached data, refresh failed) | 'error' (nothing to show)
export function useSpaceWeather() {
  const [state, setState] = useState(() => {
    const c = readCache();
    return c ? { status: 'stale', events: c.events, summary: summarize(c.events), fetchedAt: c.fetchedAt, error: null } : { status: 'loading', events: [], summary: null, fetchedAt: null, error: null };
  });
  const busy = useRef(false);

  const refresh = useCallback(async (force = false) => {
    const c = readCache();
    if (!force && c && Date.now() - c.fetchedAt < MAX_AGE) {
      setState({ status: 'ok', events: c.events, summary: summarize(c.events), fetchedAt: c.fetchedAt, error: null });
      return;
    }
    if (busy.current) return;
    busy.current = true;
    setState((s) => ({ ...s, status: s.events.length || s.fetchedAt ? s.status : 'loading', error: null }));
    try {
      const r = await fetchSpaceWeather();
      writeCache({ events: r.events, fetchedAt: r.fetchedAt });
      setState({ status: 'ok', events: r.events, summary: r.summary, fetchedAt: r.fetchedAt, error: null });
    } catch (err) {
      setState((s) => ({ ...s, status: s.fetchedAt ? 'stale' : 'error', error: err.message || 'Could not reach NASA' }));
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(() => refresh(true), REFRESH_EVERY);
    return () => clearInterval(timer);
  }, [refresh]);

  return { ...state, refresh: () => refresh(true) };
}
