import { useEffect, useState } from 'react';
import { fetchIssNow, fetchIssTrack, POLL_MS, TRACK_EVERY_MS } from '../lib/issTrack.js';

// status: loading | live | error (error keeps the last known position on screen)
export function useIssPosition(active) {
  const [pos, setPos] = useState(null);
  const [track, setTrack] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!active) return undefined;
    const ctrl = new AbortController();
    let alive = true;
    const pollNow = async () => {
      try {
        const p = await fetchIssNow(ctrl.signal);
        if (alive) { setPos(p); setError(null); }
      } catch (e) {
        if (alive && e.name !== 'AbortError') setError(e.message || 'Could not reach the position service');
      }
    };
    const pollTrack = async () => {
      try {
        const t = await fetchIssTrack(Math.floor(Date.now() / 1000), ctrl.signal);
        if (alive && t.length) setTrack(t);
      } catch { /* the position still works without the orbit line */ }
    };
    pollNow();
    pollTrack();
    const a = setInterval(pollNow, POLL_MS);
    const b = setInterval(pollTrack, TRACK_EVERY_MS);
    return () => { alive = false; ctrl.abort(); clearInterval(a); clearInterval(b); };
  }, [active]);

  const status = error ? 'error' : pos ? 'live' : 'loading';
  return { pos, track, error, status };
}
