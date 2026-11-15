// Builds src/data/chatbot_kb.json from dataset/chatbot_qa.jsonl.
// Usage: node scripts/build-chatbot-kb.mjs [path/to/chatbot_qa.jsonl]
//
// The dataset's answers are snapshots of one moment's telemetry (and some were produced by an
// earlier keyword router), so we do NOT ship them as answers. We keep the distinct user questions
// as a retrieval index and route each to a handler that answers from LIVE telemetry.
// Handler kinds (see src/lib/offlineBot.js):
//   reply    - run the onboard keyword engine (optionally with `arg` as the query)
//   reading  - current value + status of an indicator          (arg = indicator id)
//   explain  - what the indicator is, why it matters, normal   (arg = indicator id)
//   advice   - reading + what to do if flagged                 (arg = indicator id)
//   glossary - glossary definition + live radiation reading    (arg = glossary term)
//   breathing- breathing rate + blood oxygen together
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2] || 'dataset/chatbot_qa.jsonl';
const out = 'src/data/chatbot_kb.json';

const R = (arg) => ({ kind: 'reply', ...(arg ? { arg } : {}) });
const INTENTS = {
  'How am I doing?': R(),
  'Any active alerts?': R(),
  'How is the cabin air?': R(),
  'What tasks are due?': R(),
  'Hello': R(),
  'What can you do?': R(),
  'Tell me a joke': R(),
  'What should I eat?': R(),
  'Why do astronauts exercise?': R(),
  'How much exercise should I do?': R(),
  'Am I getting enough sleep?': R(),
  'I cannot sleep': R(),
  'How should I sleep in space?': R(),
  'I feel stressed': R(),
  'How is my bone health?': R(),
  'How is my immune system?': R(),
  'How is my vision?': R(),
  'I have a headache': R(),
  'I feel nauseous': R(),
  'I feel dizzy': R(),
  'My chest hurts': R(),
  'How do I stay hydrated?': R('how do I keep up my hydration'),
  'What is my heart rate?': { kind: 'reading', arg: 'hr' },
  'How is my blood pressure?': { kind: 'reading', arg: 'bp' },
  'What is my blood oxygen?': { kind: 'reading', arg: 'spo2' },
  'What is my HRV?': { kind: 'reading', arg: 'hrv' },
  'What is my temperature?': { kind: 'reading', arg: 'temp' },
  'What is the CO2 level?': { kind: 'reading', arg: 'co2' },
  'What is cabin pressure?': { kind: 'reading', arg: 'pressure' },
  'What is the radiation level?': { kind: 'reading', arg: 'dose' },
  'Is my radiation dose safe?': { kind: 'reading', arg: 'dose' },
  'What is HRV?': { kind: 'explain', arg: 'hrv' },
  'Explain SpO2 in simple words': { kind: 'explain', arg: 'spo2' },
  'Why does CO2 matter?': { kind: 'explain', arg: 'co2' },
  'What should I do about a high heart rate?': { kind: 'advice', arg: 'hr' },
  'What is a solar particle event?': { kind: 'glossary', arg: 'Solar particle event' },
  'How is my breathing?': { kind: 'breathing' },
};

const stats = new Map();
for (const line of fs.readFileSync(src, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const rec = JSON.parse(line);
  const q = rec.messages.find((m) => m.role === 'user')?.content?.trim();
  if (!q) continue;
  const s = stats.get(q) || { q, count: 0, urgency: 0 };
  s.count += 1;
  s.urgency = Math.max(s.urgency, rec.meta?.urgency ?? 0);
  stats.set(q, s);
}

const unmapped = [];
const questions = [...stats.values()]
  .sort((a, b) => b.count - a.count)
  .map((s) => {
    const intent = INTENTS[s.q] || (unmapped.push(s.q), R(s.q));
    return { q: s.q, intent, count: s.count, urgency: s.urgency };
  });

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify({ source: path.basename(src), records: [...stats.values()].reduce((n, s) => n + s.count, 0), questions }, null, 1)}\n`);
console.log(`Wrote ${out}: ${questions.length} distinct questions from ${path.basename(src)}`);
if (unmapped.length) console.warn(`No handler mapped for ${unmapped.length} question(s); they fall back to the keyword engine:\n  ${unmapped.join('\n  ')}`);
