// Real space weather from NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information).
// Docs: https://api.nasa.gov (DONKI). Uses solar flares (FLR), solar energetic particle events (SEP)
// and geomagnetic storms (GST). All parsing is defensive: DONKI fields are optional.
import { nasaFetch } from './nasa.js';

const HOUR = 3600 * 1000;
const day = (ms) => new Date(ms).toISOString().slice(0, 10);

const ts = (v) => {
  if (!v) return null;
  // DONKI times look like "2026-11-12T08:36Z"
  const ms = Date.parse(v);
  return Number.isNaN(ms) ? null : ms;
};

export function flareSeverity(classType = '') {
  const letter = String(classType).trim().charAt(0).toUpperCase();
  if (letter === 'X') return 3;
  if (letter === 'M') return 2;
  if (letter === 'C') return 1;
  return 0;
}

export function kpSeverity(kp) {
  if (kp >= 8) return 3;
  if (kp >= 7) return 2;
  if (kp >= 5) return 1;
  return 0;
}

export function cmeSeverity(speedKmS) {
  if (speedKmS >= 1500) return 3;
  if (speedKmS >= 1000) return 2;
  if (speedKmS >= 500) return 1;
  return 0;
}

export function normalizeEvents({ flr = [], sep = [], gst = [], cme = [] } = {}) {
  const out = [];
  for (const f of Array.isArray(flr) ? flr : []) {
    const time = ts(f.peakTime) ?? ts(f.beginTime);
    if (time == null) continue;
    const where = [f.sourceLocation, f.activeRegionNum ? `active region ${f.activeRegionNum}` : null].filter(Boolean).join(', ');
    out.push({
      id: f.flrID || `flr-${time}`, type: 'flare', time, severity: flareSeverity(f.classType),
      label: `${f.classType || 'Unclassified'} solar flare`, detail: where || 'Source location not reported', link: f.link,
    });
  }
  for (const s of Array.isArray(sep) ? sep : []) {
    const time = ts(s.eventTime);
    if (time == null) continue;
    out.push({
      id: s.sepID || `sep-${time}`, type: 'sep', time, severity: 2,
      label: 'Solar energetic particle event', detail: 'Energetic protons can raise the radiation dose beyond Earth’s magnetic shield', link: s.link,
    });
  }
  for (const g of Array.isArray(gst) ? gst : []) {
    const time = ts(g.startTime);
    if (time == null) continue;
    const kp = Math.max(0, ...(g.allKpIndex || []).map((k) => Number(k.kpIndex) || 0));
    out.push({
      id: g.gstID || `gst-${time}`, type: 'storm', time, severity: kpSeverity(kp),
      label: `Geomagnetic storm${kp ? ` (Kp ${kp})` : ''}`, detail: 'Disturbance of Earth’s magnetic field from a solar wind surge', link: g.link,
    });
  }
  // CME analyses with a model run (WSA-Enlil) that predicts a shock arriving at Earth
  const seenCme = new Set();
  for (const c of Array.isArray(cme) ? cme : []) {
    if (!c) continue;
    const speed = Number(c.speed) || 0;
    for (const m of Array.isArray(c.enlilList) ? c.enlilList : []) {
      if (!m) continue;
      const hitsEarth = m.isEarthGB === true || (Array.isArray(m.impactList) ? m.impactList : []).some((i) => /earth/i.test(i?.location ?? ''));
      const time = ts(m.estimatedShockArrivalTime) ?? ts((m.impactList || []).find((i) => /earth/i.test(i?.location ?? ''))?.arrivalTime);
      if (!hitsEarth || time == null) continue;
      const id = `cme-${c.associatedCMEID || c.activityID || time}-${time}`;
      if (seenCme.has(id)) continue;
      seenCme.add(id);
      const glancing = m.isEarthGB === true;
      out.push({
        id, type: 'cme', time, severity: cmeSeverity(speed),
        label: `Solar storm cloud (CME) ${glancing ? 'glancing blow' : 'arrival'} at Earth`,
        detail: `Modelled shock arrival${speed ? `, launch speed about ${Math.round(speed)} km/s` : ''}`, link: m.link || c.link,
      });
    }
  }
  return out.sort((a, b) => b.time - a.time);
}

// Overall picture for the crew: what happened recently and does it call for caution?
export function summarize(events, now = Date.now()) {
  const incoming = events.filter((e) => e.type === 'cme' && e.time > now && e.time - now <= 72 * HOUR).sort((a, b) => a.time - b.time);
  const recent = events.filter((e) => e.type !== 'cme' && now - e.time <= 72 * HOUR && e.time <= now + HOUR);
  let level = recent.reduce((m, e) => Math.max(m, e.severity), 0);
  const sepRecent = recent.some((e) => e.type === 'sep' && now - e.time <= 48 * HOUR);
  if (sepRecent) level = Math.max(level, 2);
  if (incoming.length) level = Math.max(level, 1, incoming[0].severity >= 2 ? 2 : 0);
  let text = recent.length === 0
    ? 'No notable solar activity reported by NASA DONKI in the last 3 days.'
    : `${recent.length} solar event${recent.length === 1 ? '' : 's'} in the last 3 days. Latest: ${recent[0].label}.${sepRecent ? ' A particle event was reported, so watch the dosimeter.' : ''}`;
  if (incoming.length) {
    const hrs = Math.max(1, Math.round((incoming[0].time - now) / HOUR));
    text += ` A solar storm cloud (CME) is expected to reach Earth in about ${hrs} hour${hrs === 1 ? '' : 's'}.`;
  }
  return { level, text, recentCount: recent.length, sepRecent, incomingCount: incoming.length };
}

export async function fetchSpaceWeather({ days = 7, now = Date.now(), apiKey, signal } = {}) {
  const params = { startDate: day(now - days * 24 * HOUR), endDate: day(now) };
  const opts = { apiKey, signal };
  const [flr, sep, gst, cme] = await Promise.allSettled([
    nasaFetch('/DONKI/FLR', params, opts),
    nasaFetch('/DONKI/SEP', params, opts),
    nasaFetch('/DONKI/GST', params, opts),
    nasaFetch('/DONKI/CMEAnalysis', { ...params, mostAccurateOnly: true }, opts),
  ]);
  if ([flr, sep, gst, cme].every((r) => r.status === 'rejected')) throw flr.reason;
  const val = (r) => (r.status === 'fulfilled' ? r.value : []);
  const events = normalizeEvents({ flr: val(flr), sep: val(sep), gst: val(gst), cme: val(cme) });
  return { events, summary: summarize(events, now), fetchedAt: now };
}
