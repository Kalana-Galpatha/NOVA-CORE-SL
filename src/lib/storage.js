// LocalStorage persistence & long-duration mission longitudinal telemetry history.
// Provides persistent storage for offline exploration missions and multi-day trend analysis.

const memoryStore = new Map();

export function saveItem(key, value) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(value));
      return;
    }
  } catch {
    // Fall back to memoryStore if localStorage is unavailable or blocked
  }
  memoryStore.set(key, value);
}

export function loadItem(key, defaultValue = null) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const item = window.localStorage.getItem(key);
      if (item !== null) return JSON.parse(item);
    }
  } catch {
    // Fall back to memoryStore
  }
  return memoryStore.has(key) ? memoryStore.get(key) : defaultValue;
}

/**
 * Generates or retrieves calibrated multi-day longitudinal trends (from Day 17 to Day 47).
 * Realistic progression of bone demineralization, muscle mass loss, HRV shifts, and radiation.
 */
export function getMissionHistory(crewId = 'okafor', daysCount = 30) {
  const cacheKey = `history:${crewId}:${daysCount}`;
  const cached = loadItem(cacheKey);
  if (cached && Array.isArray(cached) && cached.length === daysCount) {
    return cached;
  }

  const history = [];
  const currentDay = 47;
  const startDay = currentDay - daysCount + 1;

  // Individual modifier seeds based on crew role
  const seed =
    crewId === 'okafor' ? 1.0 :
    crewId === 'reyes' ? 1.08 :
    crewId === 'varga' ? 0.95 : 1.04;

  for (let d = startDay; d <= currentDay; d++) {
    const progressFrac = d / 47;
    // Bone mineral density loss progresses slowly (~0.02% per day in microgravity)
    const bone = Number((progressFrac * 0.98 * seed + (Math.sin(d * 0.7) * 0.03)).toFixed(2));
    // Muscle loss slows down with regular exercise (~6% at day 47)
    const muscle = Number((progressFrac * 6.2 * seed + (Math.cos(d * 0.5) * 0.15)).toFixed(1));
    // Exercise adherence (target 120 min)
    const exercise = Math.round(95 + Math.sin(d * 1.3) * 20 + (d % 6 === 0 ? -25 : 5));
    // Sleep duration (hours)
    const sleep = Number((6.8 + Math.sin(d * 0.8) * 0.6 + (d % 7 === 0 ? -0.8 : 0.2)).toFixed(1));
    // Resting HRV (ms RMSSD)
    const hrv = Math.round(62 - progressFrac * 8 + Math.cos(d * 0.9) * 5 - (sleep < 6.5 ? 8 : 0));
    // Stress index (1 to 5)
    const stress = Number((2.1 + progressFrac * 0.6 + (sleep < 6.5 ? 0.5 : 0) + Math.sin(d) * 0.2).toFixed(1));
    // Cumulative radiation dose (mSv)
    const dose = Number((progressFrac * 86.2 * seed).toFixed(1));
    // Immune dysregulation risk (%)
    const immune = Math.round(15 + progressFrac * 18 + (stress > 2.8 ? 8 : 0) + (sleep < 6.5 ? 6 : 0));
    // Psychomotor vigilance reaction time (ms)
    const pvtRT = Math.round(218 + progressFrac * 12 + (sleep < 6.5 ? 24 : 0) + Math.sin(d * 0.6) * 6);

    history.push({
      day: d,
      dateLabel: `Day ${d}`,
      bone,
      muscle,
      exercise,
      sleep,
      hrv,
      stress,
      dose,
      immune,
      pvtRT,
    });
  }

  saveItem(cacheKey, history);
  return history;
}
