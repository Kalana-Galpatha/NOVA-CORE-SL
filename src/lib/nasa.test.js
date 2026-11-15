import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getNasaApiKey, setNasaApiKey, hasCustomNasaKey, nasaFetch } from './nasa.js';

describe('NASA API key handling', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    const store = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    });
  });

  it('falls back to DEMO_KEY when nothing is set', () => {
    expect(getNasaApiKey()).toBe('DEMO_KEY');
    expect(hasCustomNasaKey()).toBe(false);
  });

  it('prefers an explicit key, then the stored key', () => {
    setNasaApiKey('  stored123 ');
    expect(getNasaApiKey()).toBe('stored123');
    expect(getNasaApiKey('explicit')).toBe('explicit');
    setNasaApiKey('');
    expect(getNasaApiKey()).toBe('DEMO_KEY');
  });

  it('appends api_key and params to the request', async () => {
    setNasaApiKey('abc');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '{"ok":1}' });
    vi.stubGlobal('fetch', fetchMock);
    await nasaFetch('/DONKI/FLR', { startDate: '2026-11-01' });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('https://api.nasa.gov/DONKI/FLR');
    expect(url).toContain('startDate=2026-11-01');
    expect(url).toContain('api_key=abc');
  });
});
