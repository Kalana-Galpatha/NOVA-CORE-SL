import { describe, it, expect } from 'vitest';
import { createWorld } from '../hooks/useTelemetry.js';
import { offlineReply } from './offlineBot.js';
import { scenarioReply } from './scenarios.js';
import { askAssistant } from './chatbot.js';

const world = createWorld('spacecraft', 'okafor');
const ctx = {
  snap: world.snap, youId: 'okafor', alerts: world.alerts.alerts(),
  profile: world.profile, long: world.long.metrics('okafor'), view: world.tasks.view('okafor', world.snap),
};
const ask = (q) => offlineReply(q, ctx);

describe('what-if: body temperature', () => {
  it('handles the headline example: 40 Celsius', () => {
    const r = ask('if my body temperature is 40 Celsius');
    expect(r.source).toBe('scenario');
    expect(r.level).toBe(3);
    expect(r.text).toMatch(/What-if: Core temperature 40\.0 °C/);
    expect(r.text).toMatch(/WARNING/);
    expect(r.text).toMatch(/cool/i);
    expect(r.text).toMatch(/flight surgeon/i);
    expect(r.text).toMatch(/Escalate immediately/);
    expect(r.text).toMatch(/Your live core temperature/);
    expect(r.text).toMatch(/does not change your real status/);
  });

  it('flags the heat stroke range at 41', () => {
    expect(ask('what if my temp is 41').text).toMatch(/heat stroke/);
  });

  it('grades 38.5 as caution and 37.2 as nominal', () => {
    expect(ask('my temperature is 38.5').level).toBe(2);
    const n = ask('my temperature is 37.2');
    expect(n.level).toBe(0);
    expect(n.text).toMatch(/NOMINAL/);
  });

  it('converts Fahrenheit', () => {
    const r = ask('what if I have a fever of 104 F');
    expect(r.text).toMatch(/40\.0 °C/);
    expect(r.level).toBe(3);
    expect(ask('my temperature is 104').text).toMatch(/40\.0 °C/); // unit-less and above 45 is read as °F
  });

  it('handles a low temperature', () => {
    const r = ask('if my body temperature is 34.5');
    expect(r.level).toBe(3);
    expect(r.text).toMatch(/Wrap in dry insulation/);
  });
});

describe('what-if: other indicators', () => {
  it.each([
    ['my heart rate is 150', 3, /ECG/],
    ['what if my pulse is 30', 3, /Check SpO₂/],
    ['my spo2 is 88', 3, /oxygen mask/],
    ['if my blood pressure is 160/100', 2, /average/],
    ['bp 175/110', 3, /Contact the flight surgeon/],
    ['what if my blood pressure is 85', 2, /lying down/],
    ['my breathing rate is 32', 3, /oxygen mask/],
    ['if cabin co2 is 6 mmhg', 2, /backup CO₂ removal/],
    ['the radiation is 450 usv/h', 2, /storm shelter/],
    ['cabin pressure is 95 kpa', 2, /leak/],
    ['my hrv is 20', 2, /rhythmically/],
  ])('%s -> level %i', (q, level, re) => {
    const r = ask(q);
    expect(r.source).toBe('scenario');
    expect(r.level).toBe(level);
    expect(r.text).toMatch(re);
  });

  it('does not read the digit in CO2 or SpO2 as the value', () => {
    expect(scenarioReply('what is the co2 level', ctx)).toBeNull();
    expect(scenarioReply('explain spo2', ctx)).toBeNull();
    expect(ask('my spo2 is 97').level).toBe(0);
  });

  it('uses activity for heart rate', () => {
    expect(ask('my heart rate is 150').level).toBe(3);
    expect(ask('my heart rate is 150 while exercising').level).toBeLessThan(3);
  });

  it('rejects impossible values', () => {
    expect(ask('my spo2 is 140').text).toMatch(/cannot exceed 100/);
    expect(ask('my body temperature is 60 celsius').text).toMatch(/plausible/);
  });

  it('uses the autonomous/comms line for the current environment', () => {
    expect(ask('my temperature is 40').text).toMatch(/autonomous mode|flight surgeon now/i);
  });
});

describe('does not hijack normal questions', () => {
  it.each(['what is my heart rate?', 'How am I doing?', 'What is the CO2 level?', 'how should I sleep in space?', 'What tasks are due?'])('%s', (q) => {
    expect(ask(q).source).not.toBe('scenario');
  });

  it('keeps emergencies on the urgent path', () => {
    expect(ask('chest pain and my pulse is 150').level).toBe(3);
    expect(ask('chest pain and my pulse is 150').source).not.toBe('scenario');
  });

  it('is reachable through askAssistant offline mode', async () => {
    const r = await askAssistant('if my body temperature is 40 Celsius', ctx, { mode: 'offline' });
    expect(r.source).toBe('scenario');
  });
});
