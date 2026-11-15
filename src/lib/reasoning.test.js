import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { createWorld } from '../hooks/useTelemetry.js';
import { offlineReply } from './offlineBot.js';
import { reasonReply } from './reasoning.js';
import ev from '../data/evidence.json';

const world = createWorld('spacecraft', 'okafor');
const ctx = {
  snap: world.snap, youId: 'okafor', alerts: world.alerts.alerts(),
  profile: world.profile, long: world.long.metrics('okafor'), view: world.tasks.view('okafor', world.snap),
};
const ask = (q) => offlineReply(q, ctx);

describe('evidence.json is built from the real data', () => {
  it('has the Inspiration4 panels', () => {
    expect(Object.values(ev.biomarkers).filter((x) => x.group === 'immune')).toHaveLength(71);
    expect(Object.values(ev.biomarkers).filter((x) => x.group === 'inflammation')).toHaveLength(9);
    expect(Object.keys(ev.metabolic)).toHaveLength(19);
    expect(ev.inspiration4.n).toBe(4);
  });

  it('matches a value recomputed from the raw CSV (IL-6, day after landing)', () => {
    const rows = fs.readFileSync('dataset/real/LSDS-8_Multiplex_serum.immune.EvePanel_SUBMITTED.csv', 'utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/).slice(1).map((l) => l.split(','));
    const il6 = rows.filter((r) => r[0] === 'IL-6');
    const changes = ['C001', 'C002', 'C003', 'C004'].map((id) => {
      const mine = il6.filter((r) => r[3] === id);
      const pre = ['L-92', 'L-44', 'L-3'].map((t) => Number(mine.find((r) => r[2] === t)[1]));
      const post = Number(mine.find((r) => r[2] === 'R+1')[1]);
      return ((post / (pre.reduce((a, b) => a + b, 0) / 3)) - 1) * 100;
    }).sort((a, b) => a - b);
    const median = (changes[1] + changes[2]) / 2;
    expect(ev.biomarkers['IL-6'].change['R+1']).toBeCloseTo(Math.round(median * 10) / 10, 1);
  });

  it('keeps the Apollo numbers that the answers quote', () => {
    expect(ev.apollo.heartRate.restingBpm.pre).toBe(61.6);
    expect(ev.apollo.heartRate.restingBpm.post1).toBe(69.7);
    expect(ev.apollo.figures.oralTempVsRestingHr.significant).toBe(false);
  });
});

describe('metric + direction, no number', () => {
  it('answers the headline question: body temperature is high, what should I do', () => {
    const r = ask('if my body temperature is high what should i do');
    expect(r.source).toBe('reasoning');
    expect(r.text).toMatch(/Core temperature high/);
    expect(r.text).toMatch(/Why it can happen/);
    expect(r.text).toMatch(/What the NASA data sets show/);
    expect(r.text).toMatch(/IL-6 \+\d+ %/);
    expect(r.text).toMatch(/r = 0\.27, not significant/);
    expect(r.text).toMatch(/Cool with damp cloths/);
    expect(r.text).toMatch(/Escalate immediately/);
    expect(r.text).toMatch(/Your live core temperature/);
    expect(r.text).toMatch(/Decision support, not a diagnosis/);
  });

  it.each([
    ['my temperature is high', /Core temperature high/],
    ['I have a fever, what should I do?', /Core temperature high/],
    ['why is my heart rate high', /Heart rate high/],
    ['my blood pressure is low, why?', /Blood pressure low/],
    ['my heart rate is too low', /Heart rate low/],
    ['my SpO2 is low what do i do', /Blood oxygen \(SpO₂\) low/],
    ['cabin CO2 is high what should I do', /Cabin CO₂ high/],
    ['I feel cold', /Core temperature low/],
  ])('routes "%s"', (q, re) => {
    const r = ask(q);
    expect(r.source).toBe('reasoning');
    expect(r.text).toMatch(re);
  });

  it('uses data-backed reasons where the data has them', () => {
    expect(ask('why is my blood pressure low').text).toMatch(/Apollo crews on standing/);
    expect(ask('my heart rate is high').text).toMatch(/61\.6 to 69\.7 bpm/);
    expect(ask('my blood pressure is high').text).toMatch(/did not rise after flight/);
  });

  it('says plainly when the data sets do not cover the metric', () => {
    const r = ask('my SpO2 is low what do i do');
    expect(r.text).toMatch(/no direct measurement of blood oxygen/);
    expect(r.text).not.toMatch(/Sources:/);
  });

  it('still gives the first-aid line that the dataset advice used to give', () => {
    expect(ask('What should I do about a high heart rate?').text).toMatch(/Sit quietly/);
  });

  it('keeps plain reading questions on the dataset path', () => {
    expect(ask('What is my temperature?').source).toBe('dataset');
    expect(ask('How is my blood pressure?').source).toBe('dataset');
    expect(ask('How is my immune system?').source).toBe('dataset');
    expect(ask('Why does CO2 matter?').source).toBe('dataset');
  });

  it('lets numbers and emergencies keep their own paths', () => {
    expect(ask('if my body temperature is 40 Celsius').source).toBe('scenario');
    expect(ask('my heart is racing and I have chest pain').source).not.toBe('reasoning');
  });
});

describe('live telemetry decides what applies now', () => {
  it('says it applies now when the live reading is on that side', () => {
    const c = ctx.snap.crew.find((x) => x.id === ctx.youId);
    const keep = c.v.temp;
    c.v.temp = 38.6;
    try {
      const r = ask('my temperature is high, what should I do?');
      expect(r.text).toMatch(/This applies to you right now/);
      expect(r.text).toMatch(/What to do now/);
      expect(r.level).toBeGreaterThan(0);
    } finally { c.v.temp = keep; }
  });

  it('flags a lost sensor instead of quoting a reading', () => {
    const c = ctx.snap.crew.find((x) => x.id === ctx.youId);
    const keep = c.lost;
    c.lost = true;
    try { expect(ask('my temperature is high').text).toMatch(/sensor signal is lost/); } finally { c.lost = keep; }
  });
});

describe('questions about the data sets', () => {
  it.each([
    ['why does spaceflight cause inflammation', /Inflammation and immune changes/],
    ['what is CRP', /Inflammation and immune changes/],
    ['what happened in the Inspiration4 blood tests', /Inspiration4 data/],
    ['why is my glucose high after landing', /Blood chemistry after landing/],
    ['why do I feel dizzy when I stand up', /Dizziness on standing/],
    ['tell me about the Apollo heart data', /Dizziness on standing/],
    ['why does my face look puffy in space', /Fluid shifts/],
    ['what is melatonin and how does sleep shifting work', /Body clock/],
  ])('routes "%s"', (q, re) => {
    const r = ask(q);
    expect(r.source).toBe('evidence');
    expect(r.text).toMatch(re);
    expect(r.text).toMatch(/Sources:/);
  });

  it('quotes numbers from evidence.json', () => {
    const il6 = Math.round(ev.biomarkers['IL-6'].change['R+1']);
    expect(ask('why does spaceflight cause inflammation').text).toMatch(new RegExp(`IL-6 \\+${il6} %`));
  });

  it('states the small-sample limit for the Inspiration4 answers', () => {
    expect(ask('what is IL-6').text).toMatch(/Only 4 people/);
  });

  it('does not answer unrelated questions', () => {
    expect(reasonReply('tell me a joke', ctx)).toBeNull();
    expect(reasonReply('what tasks are due', ctx)).toBeNull();
    expect(reasonReply('', ctx)).toBeNull();
  });
});
