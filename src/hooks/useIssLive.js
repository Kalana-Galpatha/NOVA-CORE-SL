import { useEffect, useMemo, useState } from 'react';
import { connectIssLive, liveCabin, simpleStatus, ISS_STALE_MS } from '../lib/issLive.js';

// status: off | connecting | live | reconnecting | error. `live` is the cabin data to feed the simulator, or null.
export function useIssLive(enabled) {
  const [status, setStatus] = useState('off');
  const [readings, setReadings] = useState({});
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) {
      setStatus('off');
      return undefined;
    }
    setStatus('connecting');
    const stop = connectIssLive({
      onReading: (key, value, at) => setReadings((r) => ({ ...r, [key]: { value, at } })),
      onStatus: (s) => setStatus(simpleStatus(s)),
    });
    return stop;
  }, [enabled]);

  // re-evaluate freshness every 30 seconds
  useEffect(() => {
    if (!enabled) return undefined;
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, [enabled]);

  const live = useMemo(() => (enabled ? liveCabin(readings, now) : null), [enabled, readings, now]);
  const lastAt = Object.values(readings).reduce((m, r) => Math.max(m, r.at), 0) || null;
  const stale = enabled && lastAt != null && now - lastAt > ISS_STALE_MS;
  return { status, readings, live, lastAt, stale };
}
