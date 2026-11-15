import { describe, it, expect, beforeEach, vi } from 'vitest';
import { normalizeEvents, summarize, flareSeverity, kpSeverity, fetchSpaceWeather } from './spaceweather.js';

const NOW = Date.parse('2026-11-14T12:00Z');
// Shapes follow NASA DONKI's documented FLR / SEP / GST responses.
const FLR = [
  { flrID: '2026-11-13T04:10:00-FLR-001', beginTime: '2026-11-13T04:10Z', peakTime: '2026-11-13T04:25Z', endTime: '2026-11-13T04:40Z', classType: 'X1.2', sourceLocation: 'S12W30', activeRegionNum: 14001, link: 'https://example/flr' },
  { flrID: 'old', beginTime: '2026-11-01T01:00Z', peakTime: '2026-11-01T01:10Z', classType: 'M5.0' },
];
const SEP = [{ sepID: '2026-11-13T05:00:00-SEP-001', eventTime: '2026-11-13T05:00Z' }];
const GST = [{ gstID: 'g1', startTime: '2026-11-12T00:00Z', allKpIndex: [{ kpIndex: 5 }, { kpIndex: 7 }] }];

// DONKI CMEAnalysis fields as documented by NASA (not yet checked against the live service).
const CME = [{
  associatedCMEID: '2026-11-13T02:00:00-CME-001', speed: 1100, link: 'https://example/cme',
  enlilList: [
    { estimatedShockArrivalTime: '2026-11-15T20:00Z', isEarthGB: false, impactList: [{ location: 'Earth', arrivalTime: '2026-11-15T20:00Z', isGlancingBlow: false }] },
    { estimatedShockArrivalTime: '2026-11-16T10:00Z', isEarthGB: false, impactList: [{ location: 'Mars', arrivalTime: '2026-11-16T10:00Z' }] },
  ],
}];

describe('DONKI space weather', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('rates flares and storms', () => {
    expect(flareSeverity('X1.2')).toBe(3);
    expect(flareSeverity('M5.0')).toBe(2);
    expect(flareSeverity('C3.4')).toBe(1);
    expect(flareSeverity('B1.0')).toBe(0);
    expect(flareSeverity()).toBe(0);
    expect(kpSeverity(9)).toBe(3);
    expect(kpSeverity(5)).toBe(1);
    expect(kpSeverity(3)).toBe(0);
  });

  it('normalizes and sorts events, newest first', () => {
    const ev = normalizeEvents({ flr: FLR, sep: SEP, gst: GST });
    expect(ev).toHaveLength(4);
    expect(ev[0].time).toBeGreaterThanOrEqual(ev[1].time);
    expect(ev.find((e) => e.type === 'storm').label).toContain('Kp 7');
    expect(ev.find((e) => e.id.includes('FLR-001')).detail).toContain('S12W30');
  });

  it('ignores malformed input', () => {
    expect(normalizeEvents({ flr: null, sep: 'x', gst: [{}] })).toEqual([]);
    expect(normalizeEvents()).toEqual([]);
  });

  it('summarizes the last 3 days', () => {
    const s = summarize(normalizeEvents({ flr: FLR, sep: SEP, gst: GST }), NOW);
    expect(s.level).toBe(3);
    expect(s.sepRecent).toBe(true);
    expect(s.recentCount).toBe(3); // the Nov 1 flare is too old
    expect(summarize([], NOW).level).toBe(0);
  });

  it('fetches all four feeds and survives some failing', async () => {
    const fetchMock = vi.fn((url) => {
      const u = String(url);
      if (u.includes('/FLR')) return Promise.resolve({ ok: true, status: 200, text: async () => JSON.stringify(FLR) });
      if (u.includes('/SEP')) return Promise.resolve({ ok: true, status: 200, text: async () => '' }); // DONKI: empty body = no events
      return Promise.resolve({ ok: false, status: 500, text: async () => '' });
    });
    vi.stubGlobal('fetch', fetchMock);
    const r = await fetchSpaceWeather({ now: NOW, apiKey: 'k' });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(String(fetchMock.mock.calls[0][0])).toContain('startDate=2026-11-07');
    expect(r.events.some((e) => e.type === 'flare')).toBe(true);
  });

  it('throws when every feed fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')));
    await expect(fetchSpaceWeather({ now: NOW, apiKey: 'k' })).rejects.toThrow('Failed to fetch');
  });

  it('finds CMEs predicted to hit Earth and warns ahead of time', () => {
    const ev = normalizeEvents({ cme: CME });
    expect(ev).toHaveLength(1); // the Mars-only run is ignored
    expect(ev[0]).toMatchObject({ type: 'cme', severity: 2 });
    const s = summarize(ev, NOW);
    expect(s.incomingCount).toBe(1);
    expect(s.level).toBeGreaterThanOrEqual(2);
    expect(s.text).toMatch(/expected to reach Earth in about 32 hours/);
  });

  it('survives odd CME data', () => {
    expect(normalizeEvents({ cme: [{ enlilList: null }, { speed: 'x', enlilList: [{}] }, null] })).toEqual([]);
  });
});
