// ISS position and orbit track from wheretheiss.at (free, no key). This is a public third-party service
// that propagates NASA/NORAD orbital elements. It is not operated by NASA. Docs: https://wheretheiss.at/w/developer
// Rate limit is about 1 request per second, so the app polls gently.

export const ISS_API = 'https://api.wheretheiss.at/v1/satellites/25544';
export const POLL_MS = 10_000; // current position
export const TRACK_EVERY_MS = 10 * 60_000; // orbit track refresh
const MAX_TIMESTAMPS = 10; // per request, set by the service

async function getJson(url, signal) {
  const res = await fetch(url, { signal });
  if (res.status === 429) throw new Error('Position service is rate limited, trying again shortly');
  if (!res.ok) throw new Error(`Position service error ${res.status}`);
  return res.json();
}

const clean = (p) => ({
  lat: Number(p.latitude), lon: Number(p.longitude), altKm: Number(p.altitude),
  speedKmh: Number(p.velocity), visibility: p.visibility, footprintKm: Number(p.footprint), t: Number(p.timestamp),
});
const valid = (p) => Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;

export async function fetchIssNow(signal) {
  const p = clean(await getJson(`${ISS_API}?units=kilometers`, signal));
  if (!valid(p)) throw new Error('Unexpected response from the position service');
  return p;
}

// Positions from 30 minutes ago to about 84 minutes ahead (just under one orbit, 20 points).
export async function fetchIssTrack(nowSec = Math.floor(Date.now() / 1000), signal) {
  const stamps = Array.from({ length: 20 }, (_, i) => nowSec - 30 * 60 + i * 6 * 60);
  const chunks = [];
  for (let i = 0; i < stamps.length; i += MAX_TIMESTAMPS) chunks.push(stamps.slice(i, i + MAX_TIMESTAMPS));
  const out = [];
  for (const c of chunks) {
    const rows = await getJson(`${ISS_API}/positions?timestamps=${c.join(',')}&units=kilometers`, signal);
    out.push(...(Array.isArray(rows) ? rows : []).map(clean).filter(valid));
  }
  return out.sort((a, b) => a.t - b.t);
}

// Equirectangular projection onto a 360 x 180 canvas.
export const project = (lon, lat) => [lon + 180, 90 - lat];

// Split the track into line segments that never cross the map edge, marking the part already flown.
export function trackSegments(points, nowSec) {
  const segs = [];
  let cur = null;
  points.forEach((p, i) => {
    const prev = points[i - 1];
    const past = p.t <= nowSec;
    if (!cur || !prev || Math.abs(p.lon - prev.lon) > 180 || cur.past !== past) {
      // start a new segment (continuing the old line by one point so past and future join up)
      const start = cur && prev && Math.abs(p.lon - prev.lon) <= 180 ? [prev] : [];
      cur = { past, pts: start };
      segs.push(cur);
    }
    cur.pts.push(p);
  });
  return segs.map((s) => ({ past: s.past, d: s.pts.map((p, i) => `${i ? 'L' : 'M'}${project(p.lon, p.lat).map((n) => n.toFixed(1)).join(' ')}`).join('') }));
}

// The visible circle on the ground, as an ellipse on the equirectangular map.
export function footprintEllipse(p) {
  const rKm = (p.footprintKm || 0) / 2;
  const ry = rKm / 111.2;
  const rx = ry / Math.max(0.2, Math.cos((p.lat * Math.PI) / 180));
  return { rx: Math.min(rx, 90), ry: Math.min(ry, 90) };
}

export const VISIBILITY_TEXT = { daylight: 'In sunlight', eclipsed: 'In Earth’s shadow', visible: 'Visible from the ground' };
