import ev from '../data/evidence.json';
import { INDICATORS } from './education.js';
import { LEVELS } from './constants.js';
import { vitalLine } from './chatbot.js';
import { PROTOCOLS, METRICS, NAMES, UNITS, ALERT_LIMITS, grade } from './scenarios.js';

/**
 * "Why and what to do" layer for questions that name a problem but give no number, for example
 * "if my body temperature is high what should I do", "why is my blood pressure low", or
 * "why do astronauts get inflammation". Fully offline.
 *
 *  - A metric plus a direction (high/low) gives: live status, likely causes, what the real NASA data sets
 *    show about it, how serious it is, numbered steps, monitoring and escalation.
 *  - A question about the data themselves (Inspiration4 blood tests, Apollo heart data, STS-46 body clock)
 *    gives the explanation, the numbers from src/data/evidence.json and practical actions.
 *
 * Every number quoted from the data sets is read from evidence.json (built by scripts/build-evidence.mjs from
 * dataset/real/), never typed here. Decision support only, not a diagnosis.
 */

const B = ev.biomarkers;
const M = ev.metabolic;
const A = ev.apollo;

const SOURCES = {
  i4: 'Inspiration4 serum panels (NASA OSDR OSD-575 / LSDS-8, 4 crew, 3-day flight)',
  ap: 'Apollo flight crew cardiovascular evaluations (NASA LSDA AP005, NASA SP-368)',
  ds: 'STS-46 melatonin and cortisol, DSO 484 (Whitson et al., J Pineal Res 1995)',
};

const rec = (name) => B[name] || M[name];
const chg = (name, tp = 'R+1') => rec(name)?.change?.[tp];
const pct = (x) => (x == null ? 'n/a' : `${x > 0 ? '+' : x < 0 ? '-' : ''}${Math.round(Math.abs(x))} %`);
const crewUp = (name, tp = 'R+1') => { const r = rec(name); return `${r.crewUp[tp]} of ${r.crewN[tp]}`; };
const num = (x, d = 1) => (Number.isInteger(x) ? String(x) : x.toFixed(d));

// ---- Facts drawn from the real data (each returns { t: text, s: source key }) ----
const F = {
  inflammation: () => ({
    s: 'i4',
    t: `Inspiration4 crew, day after landing, compared with each person's own preflight average: MCP-1 ${pct(chg('MCP-1'))}, IL-6 ${pct(chg('IL-6'))}, IP-10 ${pct(chg('IP-10'))}, CRP ${pct(chg('CRP'))}. Each of these rose in ${crewUp('IL-6')} crew. By day 45 IL-6 was ${pct(chg('IL-6', 'R+45'))} and CRP ${pct(chg('CRP', 'R+45'))} from baseline, so the surge was short-lived.`,
  }),
  inflammationLate: () => ({
    s: 'i4',
    t: `Some markers drifted up again months later (CRP ${pct(chg('CRP', 'R+194'))} at day 194, ${crewUp('CRP', 'R+194')} crew). With only 4 people that is a reason to keep tracking, not a conclusion.`,
  }),
  tempHr: () => ({
    s: 'ap',
    t: `Apollo crews (n = ${A.figures.oralTempVsRestingHr.n}): the change in oral temperature and the change in resting heart rate were only weakly linked (r = ${A.figures.oralTempVsRestingHr.r}, not significant). Check pulse and temperature separately and do not assume one explains the other.`,
  }),
  hydration: () => ({
    s: 'i4',
    t: `Kidney markers the day after landing: urea nitrogen (BUN) ${pct(chg('UREA NITROGEN (BUN)'))} while creatinine moved ${pct(chg('CREATININE'))} and sodium ${pct(chg('SODIUM'))}. BUN rising without creatinine rising is consistent with low body fluid rather than kidney damage, so dehydration is a common contributor.`,
  }),
  glucose: () => ({
    s: 'i4',
    t: `Blood glucose the day after landing was ${pct(chg('GLUCOSE'))} versus preflight (higher in ${crewUp('GLUCOSE')} crew; reference ${M.GLUCOSE.refMin} to ${M.GLUCOSE.refMax} mg/dL). Stress hormones from launch and landing are a likely reason, but the files do not say whether each sample was taken fasting, so treat this as a pointer rather than a result.`,
  }),
  hr: () => ({
    s: 'ap',
    t: `Apollo crews' resting heart rate rose from ${A.heartRate.restingBpm.pre} to ${A.heartRate.restingBpm.post1} bpm after flight (p = ${A.heartRate.restingBpm.p}), while the non-flying control group did not change (${A.heartRate.restingBpm.controlsPre} to ${A.heartRate.restingBpm.controlsPost}). It was back to ${A.recoveryByThirdEval.match(/[\d.]+ bpm/)[0]} by the third postflight check, so the effect was real but temporary.`,
  }),
  hrStress: () => ({
    s: 'ap',
    t: `Under the lower-body suction test (-50 mm Hg) Apollo heart rate went from ${A.heartRate.lbnp50Bpm.pre} to ${A.heartRate.lbnp50Bpm.post1} bpm after flight (p = ${A.heartRate.lbnp50Bpm.p}); controls stayed near ${A.heartRate.lbnp50Bpm.controlsPost}. The flown heart works much harder to hold blood pressure when blood pools in the legs.`,
  }),
  hrNote: () => ({
    s: 'ap',
    t: `The data show no slow-pulse effect of flight: Apollo resting heart rate went up, not down (${A.heartRate.restingBpm.pre} to ${A.heartRate.restingBpm.post1} bpm). A low pulse is more often fitness, deep sleep, a medicine, or a loose sensor, but treat it as real if you feel faint or weak.`,
  }),
  orthostatic: () => ({
    s: 'ap',
    t: `Apollo crews on standing after flight: heart rate ${A.heartRate.standBpm.pre} to ${A.heartRate.standBpm.post1} bpm (p = ${A.heartRate.standBpm.p}) and systolic pressure ${A.systolicBp.stand.pre} to ${A.systolicBp.stand.post1} mmHg (p = ${A.systolicBp.stand.p}). Pulse pressure fell from ${A.pulsePressureStand.pre} to ${A.pulsePressureStand.post1} mmHg and resting stroke volume from ${A.strokeVolumeMl.resting.pre} to ${A.strokeVolumeMl.resting.post1} ml, so each beat moved less blood. Non-flying controls did not change.`,
  }),
  bpNote: () => ({
    s: 'ap',
    t: `Apollo crews' resting blood pressure did not rise after flight (systolic ${A.systolicBp.resting.pre} to ${A.systolicBp.resting.post1} mmHg, not significant; diastolic unchanged). A high reading is therefore not a normal spaceflight effect: look for stress, caffeine, pain, high salt, a wrong-size cuff or raised cabin CO₂.`,
  }),
  circadian: () => ({
    s: 'ds',
    t: `Body clock data: a 7-day bright-light and sleep-shifting protocol delayed the salivary melatonin peak by ${num(Math.min(...ev.sts46.melatoninSalivaPhaseDelayHours))} to ${num(Math.max(...ev.sts46.melatoninSalivaPhaseDelayHours))} hours (${ev.sts46.melatoninSalivaPhaseDelayHours.length} subjects with results), so light and sleep timing can move the clock a long way.`,
  }),
  fluidShift: () => ({
    s: 'ap',
    t: `Apollo calf circumference fell from ${A.calfCircumferenceCm.pre} to ${A.calfCircumferenceCm.post1} cm after flight (p = ${A.calfCircumferenceCm.p}), and the loss grew with time in weightlessness (r = ${A.figures.calfVsWeightlessness.r}, n = ${A.figures.calfVsWeightlessness.n}). Fluid moves from the legs toward the head. ${A.figures.cardiothoracicRatio}`,
  }),
};

// What each metric+direction can be backed with from the data sets. Metrics not listed here (SpO2, breathing,
// HRV, low temperature, cabin air, radiation) have no direct measurement in the supplied data, and the reply says so.
const FACTS_FOR = {
  'temp.high': ['inflammation', 'hydration', 'tempHr'],
  'hr.high': ['hr', 'hrStress', 'hydration'],
  'hr.low': ['hrNote'],
  'bp.low': ['orthostatic', 'hydration'],
  'bp.high': ['bpNote'],
};

// ---- Questions about the data themselves ----
const TOPICS = [
  {
    id: 'inspiration4',
    strong: /inspiration ?4|\bi4\b|osd-?5(69|75)|lsds-?8|civilian crew|private astronauts?/,
    title: 'Inspiration4 data: what was measured and what changed',
    whyLabel: 'About the study',
    why: 'Four private astronauts flew a 3-day mission in September 2021. Blood was drawn about 3 months and 6 weeks before launch, 3 days before, then the day after landing and again after 45, 82 and 194 days, so each person can be compared with their own baseline.',
    facts: ['inflammation', 'glucose', 'hydration'],
    extra: [`The files hold ${Object.values(B).filter((x) => x.group === 'immune').length} immune markers, ${Object.values(B).filter((x) => x.group === 'inflammation').length} cardiovascular/inflammation proteins (including CRP and fibrinogen) and ${Object.keys(M).length} metabolic tests. The blood-count and RNA files (OSD-569) are metadata only, so there are no values to quote.`],
    actions: ['Treat the first days after a mission as a recovery window: hydrate, sleep and eat well.', 'Log fever, rash, cold sores or unusual tiredness and tell the medical officer.'],
  },
  {
    id: 'inflammation',
    strong: /cytokine|interleukin|\bil-?6\b|\bcrp\b|c-reactive|\btnf\b|mcp-?1|haptoglobin|fibrinogen/,
    weak: /inflammat|immun/,
    title: 'Inflammation and immune changes after spaceflight',
    why: 'Spaceflight stresses the immune system: microgravity, radiation, disrupted sleep, isolation and the physical stress of launch and landing. The body answers with inflammatory signals called cytokines, which is also how a fever starts. Many of them peak right after landing and settle within weeks.',
    facts: ['inflammation', 'inflammationLate'],
    actions: ['Log fever, sore throat, cough, rash or cold sores and tell the medical officer.', 'Protect 7 to 8 hours of sleep, drink enough and eat properly; save hard exercise for when a fever has gone.', 'If infection is possible, wear a mask, sleep apart and wipe shared surfaces.'],
  },
  {
    id: 'metabolic',
    strong: /metabolic panel|\bcmp\b|creatinine|\bbun\b|blood urea/,
    weak: /glucose|blood sugar|kidney|electrolyte|sodium|potassium|liver/,
    title: 'Blood chemistry after landing (glucose, kidney, electrolytes)',
    why: 'Launch and landing are physical stress events. Stress hormones raise blood sugar, and lower fluid intake plus fluid shifts change kidney and electrolyte markers. Most settle within weeks.',
    facts: ['glucose', 'hydration'],
    extra: [`Other changes at the same time point: potassium ${pct(chg('POTASSIUM'))}, calcium ${pct(chg('CALCIUM'))}, carbon dioxide (bicarbonate) ${pct(chg('CARBON DIOXIDE'))}.`],
    actions: ['Drink to a schedule rather than to thirst, and eat regular balanced meals.', 'Report thirst, a lot of urination, blurred vision, muscle cramps or palpitations to the medical officer.'],
  },
  {
    id: 'orthostatic',
    strong: /orthostatic|\blbnp\b|lower body negative|apollo|\bap005\b/,
    weak: /(dizz|faint|light ?headed|black(ing)? out|woozy).*(stand|got up|get up|standing)|(stand|standing|get up|got up).*(dizz|faint|light ?headed|black(ing)? out|woozy)|blood pool/,
    title: 'Dizziness on standing after microgravity (orthostatic intolerance)',
    why: 'In microgravity body fluid shifts toward the head, blood volume drops and the heart gets no practice working against gravity. When gravity returns, less blood comes back to the heart, each beat pumps less, and the heart speeds up to compensate. If it cannot, you feel dizzy or faint.',
    facts: ['orthostatic', 'hr'],
    actions: ['Sit or lie down at once if you feel faint, and raise your legs.', 'Stand up slowly in stages and hold a rail; avoid hot showers and long standing.', 'Drink fluids and take salt only as the flight surgeon directs; wear the compression garment if the kit has one.', 'Tell the medical officer about any fainting or a pulse that stays fast.'],
  },
  {
    id: 'fluid',
    strong: /fluid shift|cardiothoracic|heart (size|shrink|smaller)|calf/,
    weak: /puffy|puffiness|swollen face|leg (size|volume)|weight loss|deconditioning|bird legs|chicken legs/,
    title: 'Fluid shifts, a smaller heart and weight loss in flight',
    why: 'Without gravity pulling fluid down, the face puffs and the legs slim. Less workload also lets the heart and muscles deteriorate, and crews lose weight early in flight.',
    facts: ['fluidShift'],
    extra: [A.figures.weightLoss],
    actions: ['Keep up resistive and aerobic exercise as scheduled.', 'Eat enough: weight loss in flight is usually fluid and muscle, so protein and calories matter.'],
  },
  {
    id: 'circadian',
    strong: /circadian|melatonin|cortisol|body clock|sleep shift|bright light|\bdso ?484\b|sts-?46/,
    weak: /jet ?lag/,
    title: 'Body clock, melatonin and sleep shifting',
    why: 'Melatonin and cortisol rise and fall on a roughly 24-hour clock that is set by light and sleep timing. Orbital sunrises every 90 minutes and shifted work schedules push the clock off, which hurts sleep, mood and alertness.',
    facts: ['circadian'],
    extra: [ev.sts46.note],
    actions: ['Keep a fixed sleep window and use bright light in the morning and dim, warm light in the evening.', 'Avoid caffeine in the 6 hours before sleep and log how you slept.', 'Plan shift changes in steps rather than all at once.'],
  },
];

const DATA_CUE = /\b(why|reason|cause|explain|evidence|data|study|studies|research|nasa|real|what (happens|happened|happen|does|do)|mean|biomarker|blood tests?|compare|after (the )?(landing|flight|spaceflight|mission|return))\b/;

// ---- Metric + direction parsing ----
const HIGH = /\b(high|higher|highest|elevated|raised|rising|rises|rise|spik\w*|too (high|hot|much|fast)|above normal|over normal|fever\w*|febrile|hot|overheat\w*|hyper\w*|tachy\w*|racing|pounding)\b/;
const LOW = /\b(low|lower|lowest|drop|dropp\w*|drops|falling|falls|too (low|cold|little|slow)|below normal|under normal|cold|freezing|hypo\w*|brady\w*|weak)\b/;
// Wording that names the metric and implies the direction by itself.
const IMPLIED = [
  ['temp', /\bfever\w*|febrile|overheat\w*|heat ?stroke|feel(ing)? (very |really |so )?(hot|feverish)/, 'high'],
  ['temp', /hypotherm\w*|feel(ing)? (very |really |so )?(cold|freezing)|\bshivering/, 'low'],
  ['hr', /tachycardia|palpitations?|heart (is )?(racing|pounding)/, 'high'],
  ['hr', /bradycardia/, 'low'],
  ['bp', /hypertension/, 'high'],
  ['bp', /hypotension/, 'low'],
  ['spo2', /hypox\w*|low oxygen/, 'low'],
];

function detectMetric(q) {
  // Same ordering rule as scenarios.js: "blood pressure" before "pressure".
  const hit = METRICS.find(([, re]) => re.test(q));
  return hit ? hit[0] : null;
}

function detectDirection(q, id) {
  const imp = IMPLIED.find(([m, re]) => m === id && re.test(q));
  if (imp) return imp[2];
  const hi = HIGH.test(q); const lo = LOW.test(q);
  if (hi && !lo) return 'high';
  if (lo && !hi) return 'low';
  return null;
}

const crewOf = (ctx) => ctx.snap.crew.find((x) => x.id === ctx.youId);
function liveRaw(id, c, e) {
  const v = c.v;
  return { hr: v.hr, spo2: v.spo2, temp: v.temp, resp: v.resp, bp: v.sys, hrv: v.hrv, co2: e.co2, pressure: e.pressure, ppo2: e.ppo2, dose: e.dose }[id];
}

function sourcesLine(keys) {
  const u = [...new Set(keys)];
  return u.length ? `Sources: ${u.map((k) => SOURCES[k]).join('; ')}.` : '';
}
const bullets = (arr) => arr.map((x) => `• ${x}`).join('\n');
const steps = (arr) => arr.map((s, i) => `${i + 1}. ${s}`).join('\n');
const CHIPS = ['How am I doing?', 'Any active alerts?', 'Why does spaceflight cause inflammation?', 'Why do I feel dizzy when I stand up?'];

/** Reply for "<metric> is high/low, what should I do / why?" with no number. */
function directionalReply(id, dir, ctx) {
  const pro = PROTOCOLS[`${id}.${dir}`];
  if (!pro) return null;
  const c = crewOf(ctx);
  const info = INDICATORS[id];
  const label = NAMES[id];
  const unit = UNITS[id] === 'mmHg systolic' ? 'mmHg' : UNITS[id];
  const line = vitalLine(id, c, ctx.snap.env);
  const raw = liveRaw(id, c, ctx.snap.env);
  const sensorLost = c.lost && ['hr', 'spo2', 'temp', 'resp', 'bp', 'hrv'].includes(id);
  const live = !sensorLost && raw != null ? grade(id, raw, c, c.act) : { level: 0, dir };
  const applies = !sensorLost && live.level > 0 && live.dir === dir;

  let liveTxt;
  if (sensorLost) liveTxt = `Your sensor signal is lost, so I cannot read your ${label.toLowerCase()}. Reseat the patch, check its battery and take a manual reading. The guidance below is general.`;
  else if (applies) liveTxt = `Your live ${label.toLowerCase()} is ${line.value}, ${LEVELS[live.level].toLowerCase()} on the ${dir} side. This applies to you right now.`;
  else if (live.level > 0) liveTxt = `Your live ${label.toLowerCase()} is ${line.value}, which is flagged on the ${live.dir} side, the opposite of what you asked about. The guidance below is for the ${dir} side.`;
  else liveTxt = `Your live ${label.toLowerCase()} right now is ${line.value} (${LEVELS[0].toLowerCase()}), so nothing is flagged. This is general guidance for if it happens.`;

  const level = applies ? live.level : 2;
  const list = pro.steps[level] || pro.steps[2] || Object.values(pro.steps)[0];
  const lim = ALERT_LIMITS(id, dir);
  const limTxt = lim ? ` Alert limits (${dir === 'low' ? 'below' : 'above'}): watch / caution / warning = ${lim} ${unit}.` : '';
  const ladder = [1, 2, 3].filter((l) => pro.meaning[l]).map((l) => `${LEVELS[l]}: ${pro.meaning[l]}${pro.steps[l]?.[0] ? ` First step: ${pro.steps[l][0]}` : ''}`);

  const keys = FACTS_FOR[`${id}.${dir}`] || [];
  const facts = keys.map((k) => F[k]());
  const dataBlock = facts.length
    ? `What the NASA data sets show\n${bullets(facts.map((f) => f.t))}`
    : `What the NASA data sets show\nThe supplied data sets (Inspiration4 blood panels, Apollo heart and blood-pressure tables, STS-46 body-clock data) have no direct measurement of ${label.toLowerCase()}, so the reasoning here comes from the onboard protocol, not from the data.`;

  const comms = applies && live.level >= 2
    ? (ctx.profile?.autonomous
      ? `You are in autonomous mode, so follow these onboard steps now without waiting for Earth, and brief the flight surgeon as the link allows. Earth link delay: ${ctx.profile.commsLabel}.`
      : `Contact the flight surgeon now. Earth link: ${ctx.profile?.commsLabel || 'available'}.`)
    : '';

  const text = [
    `${label} ${dir}: why it happens and what to do`,
    liveTxt,
    comms,
    `Why it can happen\n${pro.causes}`,
    dataBlock,
    `How serious is it?${limTxt}\n${bullets(ladder)}`,
    `${applies ? 'What to do now' : 'What to do if it reaches the caution range'}\nFirst move: ${info.ifFlagged}\n${steps(list)}`,
    `Keep monitoring: ${pro.monitor}`,
    `Escalate immediately if you get: ${pro.escalate}`,
    sourcesLine(facts.map((f) => f.s)),
    'Decision support, not a diagnosis.',
  ].filter(Boolean).join('\n\n');
  return { text, level: applies ? live.level : 0, source: 'reasoning', chips: CHIPS };
}

/** Reply for a question about the data sets themselves. */
function topicReply(t) {
  const facts = (t.facts || []).map((k) => F[k]());
  const text = [
    t.title,
    `${t.whyLabel || 'Why it happens'}\n${t.why}`,
    `What the NASA data sets show\n${bullets([...facts.map((f) => f.t), ...(t.extra || [])])}`,
    `What to do\n${bullets(t.actions)}`,
    `${sourcesLine(['i4', 'ap', 'ds'].filter((k) => facts.some((f) => f.s === k) || (k === 'i4' && t.id === 'inspiration4')))} ${t.id === 'inspiration4' || t.id === 'inflammation' || t.id === 'metabolic' ? ev.inspiration4.limits : ''}`.trim(),
    'Decision support, not a diagnosis.',
  ].filter(Boolean).join('\n\n');
  return { text, level: 0, source: 'evidence', matched: t.id, chips: CHIPS };
}

/**
 * Offline entry point. Returns a reply object or null when the message is neither a data-set question nor a
 * "<metric> is high/low" problem, so the caller can fall through to the dataset matcher and keyword engine.
 */
export function reasonReply(question, ctx) {
  const q = String(question || '').toLowerCase().replace(/['’]/g, '');
  if (!q.trim()) return null;

  const t = TOPICS.find((x) => x.strong.test(q) || (x.weak && x.weak.test(q) && DATA_CUE.test(q)));
  if (t) return topicReply(t);

  const id = detectMetric(q) || IMPLIED.find(([, re]) => re.test(q))?.[0];
  if (!id) return null;
  const dir = detectDirection(q, id);
  if (!dir) return null;
  return directionalReply(id, dir, ctx);
}
