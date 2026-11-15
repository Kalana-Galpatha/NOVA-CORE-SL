import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchIssNow, fetchIssTrack, trackSegments, footprintEllipse, project } from './issTrack.js';

const row = (t, lat, lon) => ({ name: 'iss', id: 25544, latitude: lat, longitude: lon, altitude: 420.5, velocity: 27600, visibility: 'daylight', footprint: 4500, timestamp: t, units: 'kilometers' });

describe('ISS position', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('reads the current position', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => row(1000, 12.5, -45.25) }));
    const p = await fetchIssNow();
    expect(p).toMatchObject({ lat: 12.5, lon: -45.25, altKm: 420.5, visibility: 'daylight' });
  });

  it('rejects bad data and rate limits', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => row(1, 999, 0) }));
    await expect(fetchIssNow()).rejects.toThrow('Unexpected');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }));
    await expect(fetchIssNow()).rejects.toThrow('rate limited');
  });

  it('requests the orbit track in batches of at most 10 timestamps', async () => {
    const fetchMock = vi.fn((url) => {
      const ts = new URL(url).searchParams.get('timestamps').split(',').map(Number);
      return Promise.resolve({ ok: true, status: 200, json: async () => ts.map((t, i) => row(t, i, i)) });
    });
    vi.stubGlobal('fetch', fetchMock);
    const track = await fetchIssTrack(100000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(track).toHaveLength(20);
    expect(track[0].t).toBe(100000 - 1800);
  });
});

describe('map helpers', () => {
  it('projects lat/lon to the 360x180 canvas', () => {
    expect(project(0, 0)).toEqual([180, 90]);
    expect(project(-180, 90)).toEqual([0, 0]);
  });

  it('splits the track at the date line and between past and future', () => {
    const pts = [
      { t: 1, lat: 10, lon: 170 }, { t: 2, lat: 12, lon: 178 }, { t: 3, lat: 14, lon: -175 }, { t: 4, lat: 16, lon: -167 },
    ];
    const segs = trackSegments(pts, 3);
    // crossing 178 -> -175 must not draw a line across the whole map
    expect(segs.length).toBeGreaterThanOrEqual(2);
    segs.forEach((s) => {
      const xs = [...s.d.matchAll(/[ML]([\d.]+) /g)].map((m) => Number(m[1]));
      xs.slice(1).forEach((v, i) => expect(Math.abs(v - xs[i])).toBeLessThan(180));
    });
    expect(segs.some((s) => s.past)).toBe(true);
    expect(segs.some((s) => !s.past)).toBe(true);
  });

  it('keeps the footprint on the map', () => {
    const e = footprintEllipse({ lat: 80, footprintKm: 4500 });
    expect(e.rx).toBeLessThanOrEqual(90);
    expect(e.ry).toBeCloseTo(4500 / 2 / 111.2, 1);
  });
});
