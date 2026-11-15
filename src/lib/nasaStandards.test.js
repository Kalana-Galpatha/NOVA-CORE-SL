import { describe, it, expect } from 'vitest';
import { cabinPpo2ForPio2, PPO2_LIMITS_KPA, NASA_STD_3001 } from './nasaStandards.js';
import { LIMITS } from './constants.js';
import { evaluateRules } from './alertEngine.js';
import { createWorld, advance } from '../hooks/useTelemetry.js';
import { ENV_LIST } from './environments.js';

describe('NASA-STD-3001 limits', () => {
  it('derives cabin ppO2 tiers from the inspired-O2 table', () => {
    // 21% O2 at 101.325 kPa is a PIO2 of about 149 mmHg, the middle of the 145-155 normoxia band
    expect(cabinPpo2ForPio2(149)).toBeCloseTo(21.2, 1);
    expect(PPO2_LIMITS_KPA).toEqual([20.6, 18.0, 17.3]);
    expect(LIMITS.ppo2).toBe(PPO2_LIMITS_KPA);
    expect(NASA_STD_3001.co2OneHourAvgMmHg).toBe(3);
  });

  it('resting CO2 in every environment stays under the one-hour limit and raises no alert', () => {
    for (const env of ENV_LIST) {
      expect(env.co2).toBeLessThan(3);
      const w = createWorld(env.id, 'okafor');
      advance(w, 120);
      expect(evaluateRules(w.snap).some((r) => r.key === 'co2')).toBe(false);
    }
  });

  it('raises a watch when the one-hour CO2 average is above 3 mmHg, even if no spike', () => {
    const w = createWorld('station', 'okafor');
    advance(w, 5);
    const snap = structuredClone(w.snap);
    snap.env.co2 = 3.3; // below the 4.0 instant watch
    snap.env.hist.co2 = Array(60).fill(3.3);
    const r = evaluateRules(snap).find((x) => x.key === 'co2');
    expect(r).toMatchObject({ level: 1 });
    expect(r.detail).toContain('limit 3');
  });
});
