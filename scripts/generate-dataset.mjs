// Generates a synthetic astronaut health-monitoring dataset from the app's own simulator.
//   node scripts/generate-dataset.mjs [outDir] [days] [seed]
// Outputs: telemetry.csv, chatbot_qa.jsonl, DATASET_CARD.md
// The data is SIMULATED. It is not real astronaut data and must not be used for clinical decisions.
import fs from 'node:fs';
import path from 'node:path';

// Seeded PRNG so the dataset is reproducible (the simulator uses Math.random).
const seed = Number(process.argv[4] ?? 42);
let a = seed >>> 0;
const rand = () => {
  a = (a + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
Math.random = rand;

const outDir = process.argv[2] ?? 'dataset';
const DAYS = Number(process.argv[3] ?? 4);
const SAMPLE_EVERY = 5; // minutes between rows

const { ENV_LIST } = await import('../src/lib/environments.js');
const { Simulator } = await import('../src/lib/simulator.js');
const { AlertEngine } = await import('../src/lib/alertEngine.js');
const { TaskEngine } = await import('../src/lib/tasks.js');
const { LongTerm } = await import('../src/lib/longterm.js');
const { reply, buildSystemPrompt } = await import('../src/lib/chatbot.js');
const S = await import('../src/lib/status.js');
const { ACTIVITY_LABEL } = await import('../src/lib/constants.js');

fs.mkdirSync(outDir, { recursive: true });

function createWorld(profile) {
  const sim = new Simulator(profile, 47 * 86400);
  sim.warmUp();
  const snap = sim.snapshot();
  const alerts = new AlertEngine();
  const ids = snap.crew.map((c) => c.id);
  const tasks = new TaskEngine({ crewIds: ids, profile, you: ids[0] });
  tasks.update(snap);
  const long = new LongTerm({ crewIds: ids, profile, tasks });
  long.update(snap);
  snap.long = long.snapshot();
  return { profile, sim, alerts, tasks, long, snap };
}
function step(w) {
  w.sim.tick();
  w.snap = w.sim.snapshot();
  w.tasks.update(w.snap);
  w.long.update(w.snap);
  w.snap.long = w.long.snapshot();
  w.alerts.update(w.snap);
}

const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const EVENTS = ['tachy', 'fever', 'arrhythmia', 'drop', 'scrub', 'leak', 'spe'];
const LEVEL_NAMES = ['nominal', 'watch', 'caution', 'warning'];
const r1 = (v) => (v == null ? '' : Math.round(v * 10) / 10);

const COLS = [
  'env', 'day', 'minute_of_day', 'crew_id', 'role', 'age', 'activity',
  'hr_bpm', 'sys_mmHg', 'spo2_pct', 'temp_c', 'resp_bpm', 'hrv_ms',
  'cabin_co2_mmHg', 'cabin_pressure_kPa', 'cabin_ppo2_kPa', 'radiation_uSv_h',
  'sleep_h_last_night', 'exercise_min_today', 'cumulative_dose_mSv',
  'fx_tachycardia', 'fx_fever', 'fx_arrhythmia', 'fx_sensor_lost',
  'env_scrubber_fault', 'env_leak', 'env_solar_event', 'env_shelter',
  'hr_level', 'spo2_level', 'temp_level', 'resp_level', 'sys_level', 'hrv_level',
  'co2_level', 'pressure_level', 'ppo2_level', 'dose_level',
  'risk_level', 'risk_label', 'active_alerts',
];
const rows = [COLS.join(',')];
const qaSamples = []; // {world snapshot ctx} for chatbot data

for (const profile of ENV_LIST) {
  const w = createWorld(profile);
  const active = []; // {event, crew, endsAt}
  const total = DAYS * 1440;
  for (let m = 0; m < total; m += 1) {
    // random scenario events, roughly one start per ~3 hours, lasting 20-90 minutes
    if (rand() < 1 / 180) {
      const ev = pick(EVENTS);
      const crew = pick(w.sim.crew).id;
      if (!active.some((x) => x.event === ev && (x.crew === crew || ['scrub', 'leak', 'spe'].includes(ev)))) {
        w.sim.toggle(ev, crew);
        if (ev === 'spe') w.sim.setShelter(true);
        active.push({ event: ev, crew, endsAt: m + 20 + Math.floor(rand() * 70) });
      }
    }
    for (let i = active.length - 1; i >= 0; i -= 1) {
      if (m >= active[i].endsAt) {
        const x = active.splice(i, 1)[0];
        if (x.event === 'spe') { w.sim.setShelter(false); if (w.snap.env.spe) w.sim.toggle('spe', x.crew); }
        else w.sim.toggle(x.event, x.crew);
      }
    }
    step(w);
    if (m < 120 || m % SAMPLE_EVERY !== 0) continue;

    const s = w.snap;
    const e = s.env;
    const envLv = {
      co2: S.co2Level(e.co2), pressure: S.pressureLevel(e.pressure),
      ppo2: S.ppo2Level(e.ppo2), dose: S.doseLevel(e.dose),
    };
    const act = w.alerts.alerts();
    for (const c of s.crew) {
      const v = c.v;
      const lv = c.lost ? null : {
        hr: S.hrLevel(v.hr, c.act, c.max).level, spo2: S.spo2Level(v.spo2), temp: S.tempLevel(v.temp),
        resp: c.act === 'exercise' ? 0 : S.respLevel(v.resp), sys: c.act === 'exercise' ? 0 : S.sysLevel(v.sys),
        hrv: c.act === 'exercise' || v.hrv == null ? 0 : S.hrvLevel(v.hrv),
      };
      const risk = Math.max(...Object.values(envLv), ...(lv ? Object.values(lv) : [0]), c.lost ? 2 : 0, c.fx.arrhythmia ? 2 : 0);
      const mine = act.filter((x) => x.crew === c.id || x.crew == null).map((x) => x.title);
      const row = [
        profile.id, Math.floor(s.t / 86400), Math.round((s.t % 86400) / 60), c.id, c.role, c.age, c.act,
        c.lost ? '' : r1(v.hr), c.lost ? '' : r1(v.sys), c.lost ? '' : r1(v.spo2), c.lost ? '' : Math.round(v.temp * 100) / 100,
        c.lost ? '' : r1(v.resp), c.lost ? '' : r1(v.hrv),
        r1(e.co2), r1(e.pressure), r1(e.ppo2), r1(e.dose),
        r1(c.sleep), c.ex, Math.round(c.dose * 100) / 100,
        +c.fx.tachy, +c.fx.fever, +c.fx.arrhythmia, +c.lost,
        +e.scrub, +e.leak, +e.spe, +e.shelter,
        lv?.hr ?? '', lv?.spo2 ?? '', lv?.temp ?? '', lv?.resp ?? '', lv?.sys ?? '', lv?.hrv ?? '',
        envLv.co2, envLv.pressure, envLv.ppo2, envLv.dose,
        risk, LEVEL_NAMES[risk], `"${mine.join('|')}"`,
      ];
      rows.push(row.join(','));
    }
    // keep a spread of interesting snapshots (nominal and abnormal) for the Q&A set
    const abnormal = act.length > 0 || e.spe || e.leak || e.scrub;
    if (m % 25 === 0 || (abnormal && m % 10 === 0)) {
      qaSamples.push({
        envId: profile.id,
        ctxFor: (youId) => ({
          snap: structuredClone(s), youId, alerts: act.map((x) => ({ ...x })), profile,
          long: w.long.metrics(youId), view: w.tasks.view(youId, s),
        }),
      });
    }
  }
}
fs.writeFileSync(path.join(outDir, 'telemetry.csv'), rows.join('\n') + '\n');

// ---- Chatbot Q&A (chat format for LoRA fine-tuning: TRL / Unsloth / Axolotl) ----
const QUESTIONS = [
  'How am I doing?', 'Any active alerts?', 'How should I sleep in space?', 'What should I eat?',
  'Why do astronauts exercise?', 'How is the cabin air?', 'What is my heart rate?', 'What is my blood oxygen?',
  'What is my temperature?', 'How is my blood pressure?', 'How is my breathing?', 'What is my HRV?',
  'What is the CO2 level?', 'What is the radiation level?', 'What tasks are due?', 'Explain SpO2 in simple words',
  'What is HRV?', 'Why does CO2 matter?', 'What is a solar particle event?', 'How do I stay hydrated?',
  'How is my bone health?', 'Am I getting enough sleep?', 'How is my vision?', 'How is my immune system?',
  'I feel dizzy', 'I have a headache', 'I feel nauseous', 'I cannot sleep', 'I feel stressed',
  'My chest hurts', 'What should I do about a high heart rate?', 'Tell me a joke', 'Hello',
  'What can you do?', 'Is my radiation dose safe?', 'How much exercise should I do?', 'What is cabin pressure?',
];
const qa = fs.createWriteStream(path.join(outDir, 'chatbot_qa.jsonl'));
const seen = new Set();
let count = 0;
const crewIds = ['okafor', 'reyes', 'varga', 'tanaka'];
for (const smp of qaSamples) {
  for (const q of QUESTIONS) {
    if (rand() > 0.12) continue; // ~12% of (snapshot, question) pairs, to keep the set diverse and manageable
    const youId = pick(crewIds);
    let ctx; let out;
    try { ctx = smp.ctxFor(youId); out = reply(q, ctx); } catch { continue; }
    if (!out?.text) continue;
    const system = buildSystemPrompt(ctx);
    const key = `${q}|${out.text}`;
    if (seen.has(key)) continue; // drop exact duplicates
    seen.add(key);
    qa.write(JSON.stringify({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: q },
        { role: 'assistant', content: out.text },
      ],
      meta: { env: smp.envId, crew: youId, urgency: out.level ?? 0 },
    }) + '\n');
    count += 1;
  }
}
qa.end();

const card = `# Astronaut Health Monitoring: synthetic dataset

Generated by \`scripts/generate-dataset.mjs\` from the Crew Vitals Console simulator (seed ${seed}, ${DAYS} simulated days per environment).

**All data is simulated. It is not real astronaut data. Limits are illustrative, not medical requirements.**

## telemetry.csv
One row per crew member every ${SAMPLE_EVERY} minutes across 4 environments (spacecraft, station, rover, base) and 4 crew. Random scenarios (tachycardia, fever, arrhythmia, sensor dropout, CO2 scrubber fault, cabin leak, solar particle event) start and end during the run.
- Vitals: heart rate, systolic BP, SpO2, core temperature, respiration, HRV (blank when the sensor is lost).
- Cabin: CO2, pressure, ppO2, radiation dose rate. Crew: sleep, exercise minutes, cumulative dose.
- Scenario flags (\`fx_*\`, \`env_*\`) are the ground truth for what was injected.
- \`*_level\` columns: 0 nominal, 1 watch, 2 caution, 3 warning. \`risk_level\` / \`risk_label\` is the worst of them.
- \`active_alerts\`: titles of alerts the app's alert engine had raised for that crew member or the cabin.
Good for: risk classification, anomaly detection, scenario detection.

## chatbot_qa.jsonl
${count} chat-format examples (system with live telemetry, user question, assistant answer) for fine-tuning a small LLM with LoRA. Answers come from the app's onboard engine, so a model trained on this learns the app's telemetry-grounded, decision-support style. Retain the "decision support, not diagnosis" rules.
`;
fs.writeFileSync(path.join(outDir, 'DATASET_CARD.md'), card);
console.log(`telemetry rows: ${rows.length - 1}, qa examples: ${count}`);
