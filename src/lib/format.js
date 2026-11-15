const pad = (n, l = 2) => String(n).padStart(l, '0');

// Mission elapsed time as DDD/HH:MM
export function formatMET(seconds) {
  const day = Math.floor(seconds / 86400);
  const rest = seconds % 86400;
  return `${pad(day, 3)}/${pad(Math.floor(rest / 3600))}:${pad(Math.floor((rest % 3600) / 60))}`;
}

// Hour of day (may be fractional) as HH:MM
export function formatHour(h) {
  return `${pad(Math.floor(h))}:${pad(Math.round((h % 1) * 60) % 60)}`;
}

// Number to fixed decimals, or a dash for missing data
export const num = (v, d = 0) => (v == null ? '—' : v.toFixed(d));

// Highest alert level that applies to one crew member
export function crewLevel(alerts, crewId) {
  return alerts.reduce((m, a) => (a.crew === crewId && a.level > m ? a.level : m), 0);
}

export function levelOf(alerts, key) {
  const a = alerts.find((x) => x.key === key);
  return a ? a.level : 0;
}

export const bpText = (c) =>
  c.lost ? '—' : `${Math.round(c.v.sys)}/${Math.round(c.dia0 + (c.v.sys - c.sys0) * 0.45)}`;
