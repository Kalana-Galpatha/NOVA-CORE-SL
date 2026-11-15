import { describe, it, expect } from 'vitest';
import { createWorld } from '../hooks/useTelemetry.js';
import { reply, askAssistant } from './chatbot.js';

function ctxFor(world, youId = 'okafor') {
  return {
    snap: world.snap,
    youId,
    alerts: world.alerts.alerts(),
    profile: world.profile,
    long: world.long.metrics(youId),
    view: world.tasks.view(youId, world.snap),
  };
}

describe('chatbot', () => {
  const world = createWorld('spacecraft', 'okafor');
  const ctx = ctxFor(world);

  it('reports heart rate from live data', () => {
    const r = reply('what is my heart rate?', ctx);
    expect(r.text).toMatch(/Heart rate: \d+ bpm/);
  });

  it('treats chest pain as urgent', () => {
    expect(reply('I have chest pain', ctx).level).toBe(3);
  });

  it('answers a symptom with steps', () => {
    const r = reply('I have a headache', ctx);
    expect(r.text).toMatch(/Headache/);
    expect(r.text).toMatch(/not a diagnosis/);
  });

  it('explains cabin CO2', () => {
    expect(reply('how is the co2', ctx).text).toMatch(/CO₂/i);
  });

  it('defines glossary terms', () => {
    expect(reply('what does mmhg mean', ctx).text).toMatch(/pressure unit/i);
  });

  it('never crashes on nonsense', () => {
    expect(reply('zzzz qqq', ctx).text.length).toBeGreaterThan(10);
  });

  // Normal cases & aerospace guidance tests
  it('handles conversational greetings politely', () => {
    const r = reply('hello there', ctx);
    expect(r.text).toMatch(/Hello/i);
    expect(r.level).toBe(0);
  });

  it('gives practical guidance on sleeping in zero-g', () => {
    const r = reply('how should I sleep in space?', ctx);
    expect(r.text).toMatch(/sleeping bag/i);
    expect(r.text).toMatch(/circadian/i);
  });

  it('provides astronaut nutrition and caloric guidelines', () => {
    const r = reply('what should I eat?', ctx);
    expect(r.text).toMatch(/sodium/i);
    expect(r.text).toMatch(/kcal/i);
  });

  it('explains hydration and microgravity fluid shift', () => {
    const r = reply('am I drinking enough water?', ctx);
    expect(r.text).toMatch(/hydration/i);
    expect(r.text).toMatch(/fluid shift/i);
  });

  it('explains exercise countermeasures (ARED / treadmill)', () => {
    const r = reply('why do astronauts exercise?', ctx);
    expect(r.text).toMatch(/ARED/i);
    expect(r.text).toMatch(/bone/i);
  });

  it('explains space motion sickness / adaptation syndrome', () => {
    const r = reply('why do I feel dizzy when moving my head?', ctx);
    expect(r.text).toMatch(/Space Adaptation/i);
  });

  it('answers space jokes for crew morale', () => {
    const r = reply('tell me a joke', ctx);
    expect(r.text.length).toBeGreaterThan(15);
  });

  it('explains coffee and zero-g cups', () => {
    const r = reply('can I drink coffee in space?', ctx);
    expect(r.text).toMatch(/coffee/i);
    expect(r.text).toMatch(/capillary/i);
  });

  it('explains space hygiene and showering', () => {
    const r = reply('how do astronauts shower?', ctx);
    expect(r.text).toMatch(/no-rinse/i);
    expect(r.text).toMatch(/washcloth/i);
  });

  it('explains spacewalk (EVA) procedures', () => {
    const r = reply('tell me about spacewalks', ctx);
    expect(r.text).toMatch(/Extravehicular/i);
    expect(r.text).toMatch(/Pre-Breathe/i);
  });

  it('reports mission time and telemetry status', () => {
    const r = reply('what is the mission time?', ctx);
    expect(r.text).toMatch(/Mission Elapsed Time/i);
  });

  it('handles general feeling sick / unwell gracefully', () => {
    const r = reply('I feel sick today', ctx);
    expect(r.text).toMatch(/motion sickness|Self-care|guidance/i);
  });

  // askAssistant dual-mode tests
  it('askAssistant operates in offline mode when configured', async () => {
    const res = await askAssistant('what is my heart rate?', ctx, { mode: 'offline' });
    expect(res.text).toMatch(/Heart rate: \d+ bpm/);
    expect(res.isOnline).toBe(false);
  });

  it('askAssistant gracefully falls back to local engine when no API key is set', async () => {
    const res = await askAssistant('How should I sleep in space?', ctx, { mode: 'auto', apiKey: '' });
    expect(res.text).toMatch(/sleeping bag/i);
    expect(res.isOnline).toBe(false);
  });
});

describe('Ollama local AI mode', () => {
  it('uses the local model when reachable and falls back when not', async () => {
    const { vi } = await import('vitest');
    const ctx = ctxFor(createWorld('spacecraft', 'okafor'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: { content: 'Hello from local model' } }) }));
    const ok = await askAssistant('hi', ctx, { mode: 'ollama' });
    expect(ok.text).toBe('Hello from local model');
    expect(ok.isLocalAI).toBe(true);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection refused')));
    const bad = await askAssistant('hi', ctx, { mode: 'ollama' });
    expect(bad.text).toContain('Local AI unavailable');
    expect(bad.isLocalAI).toBeUndefined();
    vi.unstubAllGlobals();
  });
});

describe('Auto mode fallback chain', () => {
  it('goes Gemini -> Ollama when Gemini fails, and uses Ollama when no key', async () => {
    const { vi } = await import('vitest');
    const ctx = ctxFor(createWorld('spacecraft', 'okafor'));
    const fetchMock = vi.fn((url) => String(url).includes('11434')
      ? Promise.resolve({ ok: true, json: async () => ({ message: { content: 'local reply' } }) })
      : Promise.reject(new Error('offline')));
    vi.stubGlobal('fetch', fetchMock);

    const failed = await askAssistant('hi', ctx, { mode: 'auto', apiKey: 'k' });
    expect(failed.isLocalAI).toBe(true);
    expect(failed.text).toContain('local reply');

    const noKey = await askAssistant('hi', ctx, { mode: 'auto', apiKey: '' });
    expect(noKey.isLocalAI).toBe(true);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const all = await askAssistant('How should I sleep in space?', ctx, { mode: 'auto', apiKey: '' });
    expect(all.text).toMatch(/sleeping bag/i);
    expect(all.isLocalAI).toBeUndefined();
    vi.unstubAllGlobals();
  });
});

describe('Gemini model selection', () => {
  it('upgrades retired model ids and keeps current ones', async () => {
    const { resolveGeminiModel, GEMINI_DEFAULT_MODEL } = await import('./chatbot.js');
    expect(resolveGeminiModel('gemini-1.5-flash')).toBe(GEMINI_DEFAULT_MODEL);
    expect(resolveGeminiModel('gemini-2.0-flash')).toBe(GEMINI_DEFAULT_MODEL);
    expect(resolveGeminiModel('')).toBe(GEMINI_DEFAULT_MODEL);
    expect(resolveGeminiModel('gemini-3.5-flash-lite')).toBe('gemini-3.5-flash-lite');
  });
});
