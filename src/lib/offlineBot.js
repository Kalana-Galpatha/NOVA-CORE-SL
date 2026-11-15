import kb from '../data/chatbot_kb.json';
import { INDICATORS, GLOSSARY, STATUS_TEXT } from './education.js';
import { LEVELS } from './constants.js';
import { scenarioReply } from './scenarios.js';
import { reasonReply } from './reasoning.js';
import { reply as keywordReply, EMERGENCY, vitalLine, explainIndicator, STARTERS } from './chatbot.js';

/**
 * Dataset-backed offline assistant (no network, no model download).
 *
 * 1. The user's question is matched against the distinct questions in the training dataset
 *    (dataset/chatbot_qa.jsonl -> src/data/chatbot_kb.json) using TF-IDF cosine similarity with
 *    synonym expansion and typo tolerance.
 * 2. The matched question's intent decides how to answer, always from LIVE telemetry. Dataset
 *    answers are not replayed: they are snapshots of old readings.
 * 3. Messages that state a value ("if my body temperature is 40 Celsius") go to scenarios.js, which
 *    grades the value and returns a management protocol.
 * 4. Questions with no number that name a problem ("my temperature is high, what should I do?") or ask about the
 *    NASA data sets (Inspiration4 blood tests, Apollo heart data, STS-46 body clock) go to reasoning.js, which gives
 *    causes, evidence from the real data, steps and escalation criteria.
 * 5. Emergencies, empty input and weak matches go to the keyword engine in chatbot.js.
 */

export const MATCH_THRESHOLD = 0.55;

const SYNONYMS = {
  hi: 'hello', hey: 'hello', greetings: 'hello', hows: 'how', cant: 'cannot',
  bp: 'blood pressure', pulse: 'heart rate', heartbeat: 'heart rate', hr: 'heart rate', heart: 'heart rate',
  air: 'cabin air', atmosphere: 'cabin air', important: 'matter',
  temp: 'temperature', fever: 'temperature',
  o2: 'blood oxygen', spo2: 'spo2 blood oxygen', saturation: 'oxygen',
  co2: 'co2', 'co₂': 'co2', carbon: 'co2', dioxide: 'co2',
  rads: 'radiation', dosimeter: 'radiation',
  insomnia: 'sleep', slept: 'sleep', tired: 'sleep',
  nauseated: 'nauseous', sick: 'nauseous', queasy: 'nauseous', lightheaded: 'dizzy',
  hydration: 'hydrated', thirsty: 'hydrated', dehydrated: 'hydrated',
  funny: 'joke', hungry: 'eat', food: 'eat', meal: 'eat',
  workout: 'exercise', gym: 'exercise', stress: 'stressed', anxious: 'stressed',
  warnings: 'alerts', alarm: 'alerts', alarms: 'alerts', problems: 'alerts',
  'sans': 'vision', eyes: 'vision', eyesight: 'vision',
  bones: 'bone', immunity: 'immune',
  spe: 'solar particle event', flare: 'solar particle event', storm: 'solar particle event',
};
const STOP = new Set(['a', 'an', 'the', 'is', 'are', 'am', 'do', 'does', 'can', 'could', 'please', 'tell', 'of', 'to', 'it', 'there', 'in', 'about', 'right', 'now', 'currently', 'today', 'me', 'whats', 'im', 'ok', 'okay', 'really', 'very', 'here', 'getting', 'much']);

const stem = (w) => (w.length > 4 ? w.replace(/(ing|ed|es|s)$/, '') : w);

export function tokenize(text) {
  const out = [];
  const words = String(text).toLowerCase().replace(/['’]/g, '').replace(/[^\p{L}\p{N}₂\s]/gu, ' ').split(/\s+/).filter(Boolean);
  for (const w of words) {
    const expanded = (SYNONYMS[w] || w).split(' ');
    for (const e of expanded) if (!STOP.has(e)) out.push(stem(e));
  }
  return out;
}

function levenshtein(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const cur = [i];
    for (let j = 1; j <= b.length; j += 1) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

// Index built once from the dataset questions.
const docs = kb.questions.map((x) => ({ ...x, tokens: tokenize(x.q) }));
const vocab = new Set(docs.flatMap((d) => d.tokens));
const df = new Map();
for (const d of docs) for (const t of new Set(d.tokens)) df.set(t, (df.get(t) || 0) + 1);
const idf = (t) => Math.log(1 + docs.length / (df.get(t) || 0.5));
const vec = (tokens) => {
  const v = new Map();
  for (const t of tokens) v.set(t, (v.get(t) || 0) + idf(t));
  return v;
};
for (const d of docs) { d.vec = vec(d.tokens); d.norm = Math.sqrt([...d.vec.values()].reduce((s, x) => s + x * x, 0)); }

// Replace unknown words by the nearest vocabulary word (typo tolerance).
function fixTypos(tokens) {
  return tokens.map((t) => {
    if (vocab.has(t) || t.length < 4) return t;
    const max = t.length >= 8 ? 2 : 1;
    let best = t; let bestD = max + 1;
    for (const v of vocab) {
      const d = levenshtein(t, v, max);
      if (d < bestD) { best = v; bestD = d; }
    }
    return bestD <= max ? best : t;
  });
}

/** Best dataset question for a user message: { doc, score } (score 0..1) or null. */
export function matchQuestion(question) {
  const tokens = fixTypos(tokenize(question));
  if (!tokens.length) return null;
  const qv = vec(tokens);
  const qn = Math.sqrt([...qv.values()].reduce((s, x) => s + x * x, 0));
  let best = null;
  for (const d of docs) {
    let dot = 0;
    for (const [t, w] of qv) if (d.vec.has(t)) dot += w * d.vec.get(t);
    const score = dot / (qn * d.norm || 1);
    // Frequent dataset questions break ties.
    if (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) <= 1e-9 && d.count > best.doc.count)) best = { doc: d, score };
  }
  return best;
}

// ---- Handlers (all answer from live telemetry) ----
const crewOf = (ctx) => ctx.snap.crew.find((x) => x.id === ctx.youId);

function readingReply(id, ctx) {
  return explainIndicator(id, crewOf(ctx), ctx.snap.env);
}

function explainReply(id, ctx) {
  const info = INDICATORS[id];
  const line = vitalLine(id, crewOf(ctx), ctx.snap.env);
  const now = line ? `\n\nRight now: ${line.value}, ${LEVELS[line.level].toLowerCase()}.` : '';
  return { text: `${info.name}: ${info.what}\n\nNormal: ${info.normal}\n\nWhy it matters: ${info.why}${now}`, level: line?.level ?? 0 };
}

function adviceReply(id, ctx) {
  const info = INDICATORS[id];
  const c = crewOf(ctx);
  const line = vitalLine(id, c, ctx.snap.env);
  if (c.lost && line) return readingReply(id, ctx);
  const head = line.level > 0
    ? `Your ${info.name.toLowerCase()} is ${line.value} (${LEVELS[line.level].toLowerCase()}).`
    : `Your ${info.name.toLowerCase()} is ${line.value} and inside the usual range, so nothing is needed right now.`;
  return { text: `${head}\n\nIf it is high or low: ${info.ifFlagged}\n\nThis is guidance, not a diagnosis.`, level: line.level };
}

function glossaryAnswer(term, ctx) {
  const g = GLOSSARY.find((x) => x.term === term);
  const line = vitalLine('dose', crewOf(ctx), ctx.snap.env);
  return {
    text: `${g.term}: ${g.def}\n\nCabin radiation right now: ${line.value}, ${LEVELS[line.level].toLowerCase()}. ${STATUS_TEXT[line.level]}`,
    level: line.level,
  };
}

function breathingReply(ctx) {
  const c = crewOf(ctx);
  const a = explainIndicator('resp', c, ctx.snap.env);
  const b = explainIndicator('spo2', c, ctx.snap.env);
  return { text: `${a.text}\n\n${b.text}`, level: Math.max(a.level, b.level) };
}

function run(intent, doc, ctx) {
  switch (intent.kind) {
    case 'reading': return readingReply(intent.arg, ctx);
    case 'explain': return explainReply(intent.arg, ctx);
    case 'advice': return adviceReply(intent.arg, ctx);
    case 'glossary': return glossaryAnswer(intent.arg, ctx);
    case 'breathing': return breathingReply(ctx);
    default: return keywordReply(intent.arg || doc.q, ctx);
  }
}

/** Offline entry point used by askAssistant(). Same return shape as reply(). */
export function offlineReply(question, ctx) {
  const q = String(question || '').trim();
  if (!q || EMERGENCY.test(q.toLowerCase())) return keywordReply(q, ctx);
  const sc = scenarioReply(q, ctx);
  if (sc) return sc;
  const why = reasonReply(q, ctx);
  if (why) return why;
  const m = matchQuestion(q);
  if (!m || m.score < MATCH_THRESHOLD) return keywordReply(q, ctx);
  const r = run(m.doc.intent, m.doc, ctx);
  return { chips: STARTERS, ...r, source: 'dataset', matched: m.doc.q, score: Number(m.score.toFixed(2)) };
}
