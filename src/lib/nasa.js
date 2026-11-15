// NASA Open APIs (api.nasa.gov) key handling and a small fetch helper.
// Key lookup order: explicit option, localStorage override, VITE_NASA_API_KEY, then NASA's rate-limited DEMO_KEY.
// Note: a key used in a browser app is visible to anyone who opens the app. NASA keys are free
// and low-risk, but do not reuse one that is tied to anything sensitive.

export const NASA_KEY_STORAGE = 'crew_vitals_nasa_api_key';
export const NASA_BASE_URL = 'https://api.nasa.gov';

export function getNasaApiKey(override) {
  if (override) return override.trim();
  let stored = '';
  try {
    stored = typeof localStorage !== 'undefined' ? localStorage.getItem(NASA_KEY_STORAGE) : '';
  } catch { /* storage blocked */ }
  const fromEnv = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_NASA_API_KEY : '';
  return (stored || fromEnv || 'DEMO_KEY').trim();
}

export function setNasaApiKey(key) {
  try {
    const clean = (key || '').trim();
    if (clean) localStorage.setItem(NASA_KEY_STORAGE, clean);
    else localStorage.removeItem(NASA_KEY_STORAGE);
  } catch { /* storage blocked */ }
}

export function hasCustomNasaKey() {
  return getNasaApiKey() !== 'DEMO_KEY';
}

// nasaFetch('/DONKI/FLR', { startDate: '2026-11-01' }) -> parsed JSON
export async function nasaFetch(path, params = {}, options = {}) {
  const url = new URL(NASA_BASE_URL + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });
  url.searchParams.set('api_key', getNasaApiKey(options.apiKey));
  const res = await fetch(url, { signal: options.signal });
  if (res.status === 429) throw new Error('NASA API rate limit reached. Add your own key to raise the limit.');
  if (res.status === 403) throw new Error('NASA API key was rejected. Check VITE_NASA_API_KEY.');
  if (!res.ok) throw new Error(`NASA API error ${res.status}`);
  // DONKI returns an empty body when there are no events
  const text = await res.text();
  return text.trim() ? JSON.parse(text) : [];
}
