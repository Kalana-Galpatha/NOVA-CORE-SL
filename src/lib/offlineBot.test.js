import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { createWorld } from '../hooks/useTelemetry.js';
import { askAssistant } from './chatbot.js';
import { offlineReply, matchQuestion, MATCH_THRESHOLD } from './offlineBot.js';
import kb from '../data/chatbot_kb.json';

const world = createWorld('spacecraft', 'okafor');
const ctx = {
  snap: world.snap, youId: 'okafor', alerts: world.alerts.alerts(),
  profile: world.profile, long: world.long.metrics('okafor'), view: world.tasks.view('okafor', world.snap),
};
const top = (q) => matchQuestion(q)?.doc.q;

describe('dataset knowledge base', () => {
  it('is in sync with dataset/chatbot_qa.jsonl', () => {
    const qs = new Set(fs.readFileSync('dataset/chatbot_qa.jsonl', 'utf8').trim().split('\n').map((l) => JSON.parse(l).messages[1].content.trim()));
    expect(new Set(kb.questions.map((x) => x.q))).toEqual(qs);
  });

  it('matches every dataset question to itself', () => {
    for (const { q } of kb.questions) {
      const m = matchQuestion(q);
      expect(m.doc.q, q).toBe(q);
      expect(m.score).toBeGreaterThan(0.99);
    }
  });
});

describe('paraphrases and typos', () => {
  it.each([
    ['whats my pulse', 'What is my heart rate?'],
    ['tell me my bp', 'How is my blood pressure?'],
    ['what is my hart rate', 'What is my heart rate?'],
    ['how is my blod pressure', 'How is my blood pressure?'],
    ['how are my oxygen levels', 'What is my blood oxygen?'],
    ['any alarms?', 'Any active alerts?'],
    ['hi', 'Hello'],
    ['how is my breathing doing', 'How is my breathing?'],
    ['i cant sleep', 'I cannot sleep'],
    ['explain HRV', 'What is HRV?'],
    ['I feel queasy', 'I feel nauseous'],
    ["how's my heart doing", 'What is my heart rate?'],
    ['is my o2 ok', 'What is my blood oxygen?'],
    ["what's the co2 in here", 'What is the CO2 level?'],
    ['is the air safe', 'How is the cabin air?'],
    ['how much radiation am i getting', 'What is the radiation level?'],
    ['why is co2 important', 'Why does CO2 matter?'],
    ['what is a solar storm', 'What is a solar particle event?'],
  ])('%s', (q, expected) => expect(top(q)).toBe(expected));

  it('separates "my X" readings from "what is X" explanations', () => {
    expect(top('What is my HRV?')).toBe('What is my HRV?');
    expect(top('What is HRV?')).toBe('What is HRV?');
  });
});

describe('answers use LIVE telemetry', () => {
  it('reports the current heart rate', () => {
    const hr = Math.round(world.snap.crew.find((c) => c.id === 'okafor').v.hr);
    expect(offlineReply('what is my heart rate?', ctx).text).toContain(`${hr} bpm`);
  });

  it('explains HRV instead of only quoting a reading', () => {
    const r = offlineReply('What is HRV?', ctx);
    expect(r.text).toMatch(/Why it matters/);
    expect(r.text).toMatch(/Right now:/);
  });

  it('explains SpO2 and CO2 in plain words', () => {
    expect(offlineReply('Explain SpO2 in simple words', ctx).text).toMatch(/carrying oxygen/);
    expect(offlineReply('Why does CO2 matter?', ctx).text).toMatch(/Why it matters/);
  });

  it('defines a solar particle event and adds the live radiation rate', () => {
    const r = offlineReply('What is a solar particle event?', ctx);
    expect(r.text).toMatch(/fast particles from the Sun/);
    expect(r.text).toMatch(/µSv\/h/);
  });

  it('gives actions for a high heart rate', () => {
    expect(offlineReply('What should I do about a high heart rate?', ctx).text).toMatch(/Sit quietly/);
  });

  it('answers breathing questions with breathing and SpO2, not nutrition', () => {
    const r = offlineReply('How is my breathing?', ctx);
    expect(r.text).toMatch(/Breathing rate/);
    expect(r.text).not.toMatch(/Nutrition/);
  });

  it('answers hydration questions', () => {
    expect(offlineReply('How do I stay hydrated?', ctx).text).not.toMatch(/did not quite understand/);
  });
});

describe('safety and fallbacks', () => {
  it('keeps emergencies on the urgent path', () => {
    expect(offlineReply('I have chest pain and can\'t breathe', ctx).level).toBe(3);
    expect(offlineReply('I want to die', ctx).level).toBe(3);
    expect(offlineReply('i cant breathe', ctx).level).toBe(3);
  });

  it('falls back to the keyword engine for topics outside the dataset', () => {
    const r = offlineReply('Can astronauts drink coffee?', ctx);
    expect(r.source).toBeUndefined();
    expect(r.text.length).toBeGreaterThan(20);
  });

  it('never crashes on nonsense or empty input', () => {
    expect(offlineReply('zzzz qqqq', ctx).text.length).toBeGreaterThan(10);
    expect(offlineReply('', ctx).text.length).toBeGreaterThan(10);
    expect(offlineReply('???', ctx).text.length).toBeGreaterThan(10);
  });

  it('does not match unrelated text above the threshold', () => {
    const m = matchQuestion('what is the capital of France');
    expect(!m || m.score < MATCH_THRESHOLD).toBe(true);
  });
});

describe('wiring', () => {
  it('askAssistant offline mode uses the dataset engine', async () => {
    const r = await askAssistant('what is my pulse', ctx, { mode: 'offline' });
    expect(r.source).toBe('dataset');
    expect(r.isOnline).toBe(false);
  });
});
