import { describe, it, expect, beforeEach } from 'vitest';
import { saveItem, loadItem, getMissionHistory } from './storage.js';

describe('Mission Storage & Longitudinal History', () => {
  it('saves and retrieves items cleanly', () => {
    saveItem('test_key', { mission: 'Artemis', day: 47 });
    const loaded = loadItem('test_key');
    expect(loaded).toEqual({ mission: 'Artemis', day: 47 });
  });

  it('returns default value when key does not exist', () => {
    expect(loadItem('non_existent', 'default')).toBe('default');
  });

  it('generates coherent multi-day mission trajectories', () => {
    const history30 = getMissionHistory('okafor', 30);
    expect(history30).toHaveLength(30);

    const first = history30[0];
    const last = history30[29];

    expect(first.day).toBe(18);
    expect(last.day).toBe(47);

    // Cumulative bone loss and radiation should progress over time
    expect(last.bone).toBeGreaterThan(first.bone);
    expect(last.dose).toBeGreaterThan(first.dose);

    // Metrics remain within physiological spaceflight bounds
    expect(last.bone).toBeLessThan(4.0); // %
    expect(last.hrv).toBeGreaterThan(20); // ms
    expect(last.pvtRT).toBeGreaterThan(180); // ms
  });

  it('supports 7-day and 14-day history slices', () => {
    const history7 = getMissionHistory('okafor', 7);
    expect(history7).toHaveLength(7);
    expect(history7[6].day).toBe(47);
  });
});
