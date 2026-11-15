import { describe, it, expect, vi } from 'vitest';
import { pressureToKpa, ppo2ToKpa, co2ToMmHg, liveCabin, connectIssLive, simpleStatus, ISS_STALE_MS } from './issLive.js';
import { createWorld, advance } from '../hooks/useTelemetry.js';
import { evaluateRules } from './alertEngine.js';

describe('ISS Live unit handling', () => {
  it('converts pressure from psi, kPa or mmHg and rejects nonsense', () => {
    expect(pressureToKpa(14.7)).toBeCloseTo(101.35, 1);
    expect(pressureToKpa(100.8)).toBeCloseTo(100.8, 1);
    expect(pressureToKpa(760)).toBeCloseTo(101.3, 1);
    expect(pressureToKpa(0)).toBeNull(); // out of the plausible range
    expect(pressureToKpa(NaN)).toBeNull();
  });
  it('converts ppO2 and checks CO2 range', () => {
    expect(ppo2ToKpa(21.2)).toBeCloseTo(21.2, 1);
    expect(ppo2ToKpa(160)).toBeCloseTo(21.3, 1);
    expect(ppo2ToKpa(900)).toBeNull();
    expect(co2ToMmHg(3.2)).toBe(3.2);
    expect(co2ToMmHg(80)).toBeNull();
  });
  it('drops stale readings', () => {
    const now = 1_000_000_000;
    const r = { pressure: { value: 101, at: now - 1000 }, co2: { value: 3, at: now - ISS_STALE_MS - 1 } };
    expect(liveCabin(r, now)).toEqual({ pressure: 101, ppo2: null, co2: null });
    expect(liveCabin({ co2: r.co2 }, now)).toBeNull();
  });
  it('falls back to Node 3 when the Lab reading is missing', () => {
    const now = 1_000_000_000;
    const r = { ppo2: { value: 21, at: now - ISS_STALE_MS - 5 }, n3ppo2: { value: 20.9, at: now - 10 }, n3co2: { value: 2.4, at: now - 10 } };
    expect(liveCabin(r, now)).toEqual({ pressure: null, ppo2: 20.9, co2: 2.4 });
  });

  it('maps connection status', () => {
    expect(simpleStatus('CONNECTED:WS-STREAMING')).toBe('live');
    expect(simpleStatus('CONNECTING')).toBe('connecting');
    expect(simpleStatus('STALLED')).toBe('reconnecting');
    expect(simpleStatus('ERROR:x')).toBe('error');
    expect(simpleStatus('DISCONNECTED')).toBe('off');
  });
});

describe('ISS Live connection', () => {
  it('subscribes to the ISSLIVE items and forwards converted readings', async () => {
    let listener;
    const client = { addListener: vi.fn(), subscribe: vi.fn(), connect: vi.fn(), disconnect: vi.fn() };
    class Sub { constructor(mode, items, fields) { this.args = [mode, items, fields]; } addListener(l) { listener = l; } }
    const created = [];
    class Client { constructor(...a) { created.push(a); return client; } }
    const readings = [];
    const stop = connectIssLive({
      onReading: (k, v) => readings.push([k, v]),
      onStatus: () => {},
      loader: async () => ({ LightstreamerClient: Client, Subscription: Sub }),
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(created[0]).toEqual(['https://push.lightstreamer.com', 'ISSLIVE']);
    expect(client.connect).toHaveBeenCalled();
    const item = (name, v) => ({ getItemName: () => name, getValue: () => String(v) });
    listener.onItemUpdate(item('USLAB000058', 14.7));
    listener.onItemUpdate(item('USLAB000055', 3.1));
    listener.onItemUpdate(item('USLAB000055', 9999)); // implausible, ignored
    listener.onItemUpdate(item('UNKNOWN', 1)); // not subscribed, ignored
    expect(readings.map(([k]) => k)).toEqual(['pressure', 'co2']);
    stop();
    expect(client.disconnect).toHaveBeenCalled();
  });
});

describe('Live cabin in the simulator', () => {
  it('overrides cabin values and alerts, then lets go', () => {
    const w = createWorld('station', 'okafor');
    w.sim.live = { pressure: 99.0, ppo2: 18.5, co2: 6.0 };
    advance(w, 3);
    expect(w.snap.env.pressure).toBeCloseTo(99.0, 5);
    expect(w.snap.env.ppo2).toBeCloseTo(18.5, 5);
    expect(w.snap.env.co2).toBeCloseTo(6.0, 5);
    expect(w.snap.env.live).toBe(true);
    const titles = evaluateRules(w.snap).map((r) => r.key);
    expect(titles).toContain('ppo2'); // 18.5 kPa is below the caution limit
    w.sim.live = null;
    advance(w, 30);
    expect(w.snap.env.live).toBe(false);
    expect(w.snap.env.pressure).toBeGreaterThan(99.5);
  });
});
