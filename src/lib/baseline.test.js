import { describe, it, expect } from 'vitest';
import { getBaseline, calculateZScore, getVitalBaselineInfo } from './baseline.js';

describe('Precision Health Baselines', () => {
  it('retrieves personalized baselines for specific crew members', () => {
    const okaforHr = getBaseline('okafor', 'hr');
    const tanakaHr = getBaseline('tanaka', 'hr');
    expect(okaforHr.mean).toBe(58);
    expect(tanakaHr.mean).toBe(66);
    expect(okaforHr.mean).not.toBe(tanakaHr.mean);
  });

  it('calculates accurate Z-scores and identifies personal statistical shifts', () => {
    // Okafor resting HR baseline is 58 (sd 4.2)
    // If her HR is 70 bpm, z = (70 - 58) / 4.2 = +2.85 sigma
    const z = calculateZScore(70, 'okafor', 'hr');
    expect(z).toBeCloseTo(2.85, 1);

    const info = getVitalBaselineInfo('okafor', 'hr', 70);
    expect(info.isAnomaly).toBe(true);
    expect(info.z).toBeGreaterThanOrEqual(2.8);
  });

  it('treats readings within normal personal variation as non-anomalies', () => {
    // Okafor HR at 60 bpm -> z = (60 - 58) / 4.2 = +0.47 sigma
    const info = getVitalBaselineInfo('okafor', 'hr', 60);
    expect(info.isAnomaly).toBe(false);
    expect(Math.abs(info.z)).toBeLessThan(1.0);
  });
});
