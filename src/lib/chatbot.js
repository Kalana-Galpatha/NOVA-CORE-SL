import { ADVICE, LEVELS, ACTIVITY_LABEL } from './constants.js';
import { INDICATORS, GLOSSARY, STATUS_TEXT } from './education.js';
import { SYMPTOMS, triage } from './triage.js';
import { LT_META } from './longterm.js';
import { formatMET } from './format.js';
import {
  hrLevel, spo2Level, tempLevel, respLevel, sysLevel, hrvLevel,
  co2Level, pressureLevel, ppo2Level, doseLevel,
} from './status.js';
import { offlineReply } from './offlineBot.js';

/**
 * Aerospace Health Assistant.
 *
 * Supports two operational tiers:
 * 1. Online AI Mode: Connects to Google Gemini API with comprehensive live telemetry,
 *    mission context, cabin atmosphere, and clinical guidelines.
 * 2. Onboard Telemetry Engine: 100% offline, deterministic medical & aerospace knowledge base
 *    handling normal cases (greetings, diet, coffee, sleep, exercise, space adaptation, SANS,
 *    radiation, hygiene, spacewalks, jokes, daily duties) plus real-time vitals, alert triage,
 *    and emergency guidance.
 *
 * Always acts as an operational decision support system; never provides formal clinical diagnosis.
 */

export const STARTERS = [
  'How am I doing?',
  'Any active alerts?',
  'How should I sleep in space?',
  'What should I eat?',
  'Why do astronauts exercise?',
  'How is the cabin air?',
  'What if my temperature is 40 °C?',
  'My temperature is high, what should I do?',
  'Why does spaceflight cause inflammation?',
];

const has = (q, ...words) => words.some((w) => (w instanceof RegExp ? w.test(q) : q.includes(w)));
const n0 = (v) => Math.round(v);
const n1 = (v) => v.toFixed(1);

export const EMERGENCY = /chest pain|can'?t breathe|cannot breathe|trouble breathing|short of breath|faint|passed out|unconscious|seizure|bleeding (a lot|heavily)|hurt(ing)? myself|suicid|kill myself|want to die/;

export function vitalLine(id, c, e) {
  const v = c.v;
  switch (id) {
    case 'hr': return { key: 'hr', value: `${n0(v.hr)} bpm`, level: hrLevel(v.hr, c.act, c.max).level, extra: `You are ${ACTIVITY_LABEL[c.act].toLowerCase()}.` };
    case 'spo2': return { key: 'spo2', value: `${n1(v.spo2)} %`, level: spo2Level(v.spo2) };
    case 'temp': return { key: 'temp', value: `${n1(v.temp)} °C`, level: tempLevel(v.temp) };
    case 'resp': return { key: 'resp', value: `${n0(v.resp)} breaths/min`, level: respLevel(v.resp) };
    case 'bp': return { key: 'bp', value: `${n0(v.sys)} mmHg systolic`, level: sysLevel(v.sys) };
    case 'hrv': return { key: 'hrv', value: `${n0(v.hrv)} ms`, level: v.hrv != null ? hrvLevel(v.hrv) : 0 };
    case 'co2': return { key: 'co2', value: `${n1(e.co2)} mmHg`, level: co2Level(e.co2) };
    case 'pressure': return { key: 'pressure', value: `${n1(e.pressure)} kPa`, level: pressureLevel(e.pressure) };
    case 'ppo2': return { key: 'ppo2', value: `${n1(e.ppo2)} kPa`, level: ppo2Level(e.ppo2) };
    case 'dose': return { key: 'dose', value: `${n0(e.dose)} µSv/h`, level: doseLevel(e.dose) };
    default: return null;
  }
}

export function explainIndicator(id, c, e) {
  const info = INDICATORS[id];
  const line = vitalLine(id, c, e);
  if (!info || !line) return null;
  if (c.lost && ['hr', 'spo2', 'temp', 'resp', 'bp', 'hrv'].includes(id)) {
    return { text: `Your sensor signal is lost, so I cannot read your ${info.name.toLowerCase()}. Reseat the patch, check its battery and take a manual reading.\n\nNormal: ${info.normal}`, level: 2 };
  }
  const parts = [`${info.name}: ${line.value}. ${LEVELS[line.level]}.`];
  if (line.extra) parts.push(line.extra);
  parts.push(STATUS_TEXT[line.level]);
  parts.push(`Normal: ${info.normal}`);
  parts.push(line.level > 0 ? `What to do: ${info.ifFlagged}` : `What it is: ${info.what}`);
  return { text: parts.join('\n'), level: line.level };
}

const VITAL_WORDS = [
  ['hr', ['heart rate', 'pulse', 'bpm', /\bhr\b/]],
  ['spo2', ['spo2', 'spo₂', 'blood oxygen', 'oxygen saturation', 'o2 sat']],
  ['temp', ['temperature', 'fever', 'body temp', 'core temp']],
  ['resp', ['breathing rate', 'respiration', 'respiratory', 'breaths']],
  ['bp', ['blood pressure', 'systolic', /\bbp\b/]],
  ['hrv', ['hrv', 'variability', 'rmssd']],
];
const CABIN_WORDS = [
  ['co2', ['co2', 'co₂', 'carbon dioxide', 'scrubber']],
  ['pressure', ['cabin pressure', 'pressure leak', 'leak', /\bkpa\b/]],
  ['ppo2', ['ppo2', 'ppo₂', 'cabin oxygen', 'oxygen in the cabin']],
  ['dose', ['radiation', 'µsv', 'usv', 'solar', 'storm shelter', 'shelter']],
];
const LONG_WORDS = [
  ['bone', ['bone']],
  ['muscle', ['muscle', 'strength']],
  ['vision', ['vision', 'eyesight', 'sans', 'blurry', 'blurred']],
  ['hydration', ['hydration', 'water intake', 'drinking', 'dehydrat']],
  ['sleep', ['sleep debt', 'sleep', 'tired', 'fatigue']],
  ['stress', ['stress', 'mood', 'anxious']],
  ['cumdose', ['total dose', 'mission dose', 'cumulative dose', 'career dose']],
  ['immune', ['immune', 'virus', 'herpes', 'shingles']],
];
const SYMPTOM_WORDS = {
  chest: ['chest', 'racing heart', 'palpitation'],
  clot: ['swelling', 'swollen', 'clot', 'redness in'],
  vision: ['blur', 'vision', 'cannot read', 'eyes hurt'],
  flank: ['flank', 'kidney', 'blood in urine', 'side pain', 'back pain and'],
  headache: ['headache', 'head hurts', 'head ache', 'migraine'],
  dizzy: ['dizzy', 'dizziness', 'nausea', 'nauseous', 'motion sick', 'vomit', 'feel sick', 'unwell', 'not feeling well', 'feeling ill', 'sick today'],
  back: ['back pain', 'back hurts', 'sore back'],
  cough: ['cough', 'sore eyes', 'red eyes', 'itchy eyes'],
  wound: ['cut', 'wound', 'scrape', 'slow to heal'],
  tooth: ['tooth', 'teeth', 'sinus', 'stuffy nose', 'congest'],
  mood: ['low mood', 'cannot sleep', "can't sleep", 'insomnia', 'lonely', 'depressed', 'down lately'],
};

function pick(q, table) {
  const hit = table.find(([, words]) => has(q, ...words));
  return hit ? hit[0] : null;
}

function statusSummary(ctx) {
  const { snap, youId, alerts } = ctx;
  const c = snap.crew.find((x) => x.id === youId);
  const mine = alerts.filter((a) => a.crew === youId || a.crew === null);
  const worst = mine.reduce((m, a) => Math.max(m, a.level), 0);
  const head = c.lost ? 'Your sensor signal is lost, so I cannot judge your vitals right now.' : `Overall: ${LEVELS[worst]}. ${STATUS_TEXT[worst]}`;
  const lines = [head];
  if (!c.lost) {
    lines.push(`Heart rate ${n0(c.v.hr)} bpm, SpO₂ ${n1(c.v.spo2)} %, temperature ${n1(c.v.temp)} °C, ${ACTIVITY_LABEL[c.act].toLowerCase()}.`);
  }
  if (mine.length) {
    lines.push(`${mine.length} active alert${mine.length > 1 ? 's' : ''}: ${mine.slice(0, 3).map((a) => a.title).join(', ')}${mine.length > 3 ? ', and more' : ''}.`);
  } else {
    lines.push('No active alerts.');
  }
  return { text: lines.join('\n'), level: c.lost ? 2 : worst, chips: mine.length ? ['Any active alerts?', 'What should I do first?'] : ['What tasks are due?', 'How is the cabin air?'] };
}

function alertsReply(ctx) {
  const { youId, alerts } = ctx;
  const mine = alerts.filter((a) => a.crew === youId || a.crew === null);
  if (!mine.length) return { text: 'No active alerts for you or the cabin right now.', level: 0 };
  const lines = mine.slice(0, 5).map((a) => `• ${LEVELS[a.level]}: ${a.title} (${a.detail})`);
  const top = mine[0];
  const adv = ADVICE[top.adv];
  return { text: `${lines.join('\n')}${adv ? `\n\nFor the highest one: ${adv}` : ''}`, level: top.level, chips: ['What should I do first?'] };
}

function firstStep(ctx) {
  const { youId, alerts } = ctx;
  const mine = alerts.filter((a) => a.crew === youId || a.crew === null);
  if (!mine.length) return { text: 'Nothing urgent. Your best next step is to finish any routine tasks that are due.', level: 0, chips: ['What tasks are due?'] };
  const top = mine[0];
  return { text: `Start with: ${top.title} (${top.detail}).\n${ADVICE[top.adv] ?? 'Recheck the reading and tell the medical officer.'}\n\nIf it does not improve, tell the flight surgeon.`, level: top.level };
}

function symptomReply(id, ctx) {
  const { snap, youId, long } = ctx;
  const sym = SYMPTOMS.find((s) => s.id === id);
  const c = snap.crew.find((x) => x.id === youId);
  const e = snap.env;
  const tctx = {
    co2: co2Level(e.co2), co2v: e.co2, fever: tempLevel(c.v.temp),
    vision: long.vision.level, muscle: long.muscle.level, hydration: long.hydration.level, sleep: long.sleep.level,
    immune: long.immune?.level ?? 0,
  };
  const r = triage(sym, tctx);
  const call = ['Self-care is fine.', 'Monitor and log it.', 'Tell the medical officer today.', 'Contact the flight surgeon now.'][r.level];
  const lines = [`${sym.label}. ${call}`];
  if (r.note) lines.push(r.note);
  lines.push(`Why it happens: ${sym.causes}`);
  lines.push(`Try:\n${sym.steps.map((s) => `• ${s}`).join('\n')}`);
  lines.push(`Call for help: ${sym.call}`);
  lines.push('This is guidance, not a diagnosis.');
  return { text: lines.join('\n\n'), level: r.level };
}

function longReply(id, ctx) {
  const m = ctx.long[id];
  const info = INDICATORS[id];
  const meta = LT_META[id];
  const lines = [`${meta.title}: ${m.text}. ${LEVELS[m.level]}.`, `Normal: ${info.normal}`];
  if (m.eta != null) lines.push(`At the current pace it reaches the next limit in about ${m.eta} day${m.eta === 1 ? '' : 's'}.`);
  lines.push(m.level > 0 ? `What to do: ${info.ifFlagged}` : `What it is: ${info.what}`);
  return { text: lines.join('\n'), level: m.level };
}

function glossaryReply(q) {
  const t = GLOSSARY.find((g) => q.includes(g.term.toLowerCase().replace(/[()]/g, '').split(' ')[0]));
  return t ? { text: `${t.term}: ${t.def}`, level: 0 } : null;
}

// Normal Cases & Aerospace Life Support Guidelines
function sleepGuidance(ctx) {
  const sleepMetric = ctx.long?.sleep?.text ?? 'Nominal';
  return {
    text: `Zero-G Sleep & Circadian Hygiene:\n\n• Current Sleep Status: ${sleepMetric}.\n• Sleep Quarters: Fasten your sleeping bag tether securely to avoid drifting into air vents or bulkheads.\n• Head Congestion: Without gravity, fluid shift can cause nasal stuffiness. Sleep with slight cabin airflow towards your face to disperse exhaled CO₂ pockets.\n• Circadian Synchronization: The station uses blue-enriched lighting during work shifts and red-shifted dim lighting 2 hours before scheduled rest.\n• Target: 8.0 hours of uninterrupted sleep. If fatigue persists, check your Psychomotor Vigilance Task (PVT) in the Assessments tab.`,
    level: ctx.long?.sleep?.level ?? 0,
    chips: ['Take PVT test', 'How am I doing?', 'What is sleep debt?'],
  };
}

function nutritionGuidance() {
  return {
    text: `Astronaut Nutrition & Dietary Guidelines:\n\n• Caloric Target: ~2,800 to 3,200 kcal/day (adjusted for body mass and 2.5 hours of daily resistive exercise).\n• Sodium Restriction: Keep sodium under 2,000 mg/day. High sodium exacerbates fluid retention and elevates intracranial/ocular pressure (SANS).\n• Bone Support: Vitamin D3 (800-1000 IU/day) and Calcium (1,000-1,200 mg/day) are supplemented daily due to lack of solar ultraviolet exposure.\n• Packaging: All meals are thermostabilized, irradiated, or freeze-dried. Ensure full rehydration with warm potable water before eating to avoid gastrointestinal discomfort.`,
    level: 0,
    chips: ['Am I drinking enough water?', 'Why do astronauts exercise?', 'What is SANS?'],
  };
}

function coffeeGuidance() {
  return {
    text: `Caffeine & Space Beverages:\n\n• Coffee & Tea: Yes, astronauts can drink coffee! Hot beverages are prepared using specialized foil drink pouches with one-way valves, or the patented Space Cup that uses capillary action to mimic sipping on Earth.\n• Timing: Limit caffeine within 6 hours of scheduled sleep to prevent circadian disruption.\n• Hydration Impact: Moderate caffeine does not induce dehydration, but always prioritize potable electrolyte water for primary fluid replenishment.`,
    level: 0,
    chips: ['What should I eat?', 'How should I sleep in space?', 'Am I drinking enough water?'],
  };
}

function hydrationGuidance(ctx) {
  const hydMetric = ctx.long?.hydration?.text ?? 'Nominal';
  return {
    text: `Hydration Protocol & Fluid Shift:\n\n• Current Hydration: ${hydMetric}.\n• Daily Intake Target: 2.0 to 2.5 Liters of potable water.\n• Fluid Shift Phenomenon: In zero gravity, blood and interstitial fluids shift cephalad (upwards), tricking central baroreceptors into thinking you have excess fluid. This blunts natural thirst!\n• Monitoring: Check urine color (aim for pale straw). Dehydration dramatically increases your risk of renal stones (calcium oxalate and uric acid) due to elevated bone demineralization in space.`,
    level: ctx.long?.hydration?.level ?? 0,
    chips: ['What should I eat?', 'How am I doing?', 'What is bone loss?'],
  };
}

function hygieneGuidance() {
  return {
    text: `Personal Hygiene in Microgravity:\n\n• Bathing: There are no showers in space! Water droplets would float away and pose electrical hazards. Crew use no-rinse body wash and damp washcloths with warm potable water.\n• Hair Washing: A no-rinse shampoo is massaged into the scalp and dried with a towel.\n• Oral Care: Astronauts use edible or low-foam toothpaste and wipe away excess or swallow safe formulations.\n• Water Reclamation: Over 98% of humidity, wash water, and urine is purified back into drinking water by the Environmental Control and Life Support System (ECLSS).`,
    level: 0,
    chips: ['Am I drinking enough water?', 'How is the cabin air?', 'What should I eat?'],
  };
}

function exerciseGuidance() {
  return {
    text: `Countermeasure Exercise Protocol:\n\n• Mandatory Regimen: 2.5 hours per day, 6 days per week.\n• ARED (Advanced Resistive Exercise Device): High-load squats, deadlifts, and heel raises counteract microgravity bone demineralization (osteopenia) and postural muscle atrophy (sarcopenia).\n• T2 Treadmill & CEVIS Cycle: Aerobic conditioning using bungee harnesses to provide simulated body weight load, preserving cardiovascular stroke volume and VO₂ max.\n• Recovery: Hydrate with electrolyte replenishment solution and log workout completion in your Routine Tasks.`,
    level: 0,
    chips: ['What tasks are due?', 'How is my muscle status?', 'What is bone loss?'],
  };
}

function spaceAdaptationGuidance() {
  return {
    text: `Space Adaptation Syndrome (SAS) & Neurovestibular Transition:\n\n• Cause: Sensory conflict between the vestibular otolith organs (which no longer sense gravitational down) and your visual cues.\n• Frequency: Affects 60-70% of crew during the first 48 to 72 hours of microgravity.\n• Typical Symptoms: Mild stomach awareness, nausea, dizziness during head motion, and headache.\n• Practical Measures:\n  1. Move your head slowly and deliberately along single axes.\n  2. Anchor your gaze on distinct visual horizon lines in the module.\n  3. Stay hydrated and avoid strenuous acrobatic translation.\n  4. Antiemetics (oral or IM promethazine) are stocked in the Crew Medical Pack if needed. Symptoms typically resolve within 3-4 days as central neuroplasticity adapts.`,
    level: 1,
    chips: ['I feel dizzy', 'I have a headache', 'How am I doing?'],
  };
}

function sansGuidance(ctx) {
  const vision = ctx.long?.vision?.text ?? 'Nominal';
  return {
    text: `Spaceflight-Associated Neuro-ocular Syndrome (SANS):\n\n• Current Status: ${vision}.\n• Mechanism: Headward fluid shift causes continuous venous engorgement and elevated intracranial pressure, flattening the posterior globe and swelling the optic nerve sheath.\n• Manifestation: Hyperopic refractive shifts (distant vision sharpens while near reading blurs), cotton wool spots, and choroidal folds.\n• Protocols: Routine ultrasound ocular exams, fundus photography, and Lower Body Negative Pressure (LBNP) sessions to redistribute fluids toward the lower extremities.`,
    level: ctx.long?.vision?.level ?? 0,
    chips: ['Explain vision indicator', 'How am I doing?', 'What tasks are due?'],
  };
}

function radiationGuidance(ctx) {
  const e = ctx.snap?.env;
  const dose = e?.dose ? `${n0(e.dose)} µSv/h` : 'Nominal';
  const cum = ctx.long?.cumdose?.text ?? 'Nominal';
  return {
    text: `Radiation Protection & Cabin Shielding:\n\n• Live Cabin Dose Rate: ${dose}.\n• Cumulative Mission Exposure: ${cum}.\n• Environmental Sources: Galactic Cosmic Rays (GCRs) provide steady background radiation, while Solar Particle Events (SPEs) pose sudden acute risks.\n${ctx.spaceWeather ? `• Live Space Weather (NASA DONKI): ${ctx.spaceWeather.text}\n` : ''}• Storm Shelter Protocol: If dosimeter alarms trigger (>50 µSv/h sustained or SPE alert from Flight Dynamics), immediately retreat to the central Storm Shelter (surrounded by water walls and dense polyethylene storage) until solar proton flux normalizes.`,
    level: Math.max(e?.dose > 25 ? 2 : 0, ctx.spaceWeather?.level >= 2 ? 1 : 0),
    chips: ['How is the cabin air?', 'Any active alerts?', 'How am I doing?'],
  };
}

function evaGuidance() {
  return {
    text: `Extravehicular Activity (EVA / Spacewalk) Medical Protocol:\n\n• Pre-Breathe Protocol: Crew breathe 100% pure oxygen for several hours prior to suit depressurization to wash nitrogen out of blood tissue, preventing Decompression Sickness (the bends).\n• Suit Pressure: Spacesuits operate at lower pressure (approx. 29.6 kPa / 4.3 psi) for glove dexterity.\n• Physical Demands: EVAs last 6.5 to 8 hours and can expend 2,000+ kcal. Liquid Cooling and Ventilation Garments (LCVG) maintain thermal equilibrium.\n• Post-EVA: Crew are monitored for joint pain, fatigue, and fingertip subungual hematomas.`,
    level: 0,
    chips: ['How am I doing?', 'What tasks are due?', 'How is the cabin air?'],
  };
}

function timeAndLocationGuidance(ctx) {
  const { snap, profile } = ctx;
  const met = formatMET(snap.t);
  const g = (profile.gravity * 100).toFixed(0);
  return {
    text: `Mission Telemetry & Status:\n\n• Mission Elapsed Time (MET): ${met} (Days / Hours:Minutes)\n• Craft / Station: ${profile.name} (${profile.sub})\n• Simulated Gravity: ${profile.gravity}g (${g}% Earth gravity)\n• Comms Status: ${profile.commsLabel} latency\n• Operational Mode: ${profile.autonomous ? 'Autonomous Protocol Execution' : 'Earth Ground Link Nominal'}`,
    level: 0,
    chips: ['How am I doing?', 'Any active alerts?', 'What tasks are due?'],
  };
}

function mentalHealthGuidance() {
  return {
    text: `Behavioral Health & Mission Wellness:\n\n• Long-duration spaceflight imposes severe sensory deprivation, confinement, and crew isolation.\n• Daily Strategies:\n  1. Maintain structured personal time and daily journaling.\n  2. Stay connected with family and ground support via private communication links.\n  3. Exercise regularly—endorphins combat confinement stress.\n  4. Practice mindfulness or breathing cycles if feeling anxious or claustrophobic.\n• Private Medical Conferences (PMCs) with the Mission Flight Psychologist are available confidentially. You are never alone on this mission.`,
    level: 0,
    chips: ['Take PVT test', 'Tell me a space joke', 'How am I doing?'],
  };
}

function medicationGuidance() {
  return {
    text: `Onboard Crew Medical Kit (CMK):\n\n• Analgesics: Acetaminophen (500mg) and Ibuprofen (400mg) for mild headaches or musculoskeletal aches.\n• Antiemetics: Promethazine / Ondansetron for acute space motion sickness.\n• Sleep Aids & Decongestants: Available under flight surgeon authorization.\n• Protocol: Always record any medication taken in your daily log so the Medical Officer and telemetry engine can correlate vital trends. For acute or severe symptoms, inform the Flight Surgeon immediately.`,
    level: 0,
    chips: ['I have a headache', 'What tasks are due?', 'How am I doing?'],
  };
}

function crewRosterSummary(ctx) {
  const crew = ctx.snap?.crew || [];
  const lines = crew.map((c) => {
    const alerts = (ctx.alerts || []).filter((a) => a.crew === c.id);
    const worst = alerts.reduce((m, a) => Math.max(m, a.level), 0);
    const hr = Math.round(c.v.hr);
    const spo2 = c.v.spo2.toFixed(1);
    return `• ${c.name} (${c.role}): ${c.lost ? 'Sensor signal lost' : `HR ${hr} bpm, SpO₂ ${spo2}%, ${LEVELS[worst]}`}`;
  });
  return {
    text: `Crew Health Roster (${crew.length} members):\n\n${lines.join('\n')}`,
    level: 0,
    chips: ['How am I doing?', 'Any active alerts?', 'How is the cabin air?'],
  };
}

function spaceJoke() {
  const jokes = [
    'Why did the astronaut break up with the capsule? Because he needed space!\n\n(On a medical note: astronauts also expand in space—spinal decompaction can add up to 5 cm in height! Remember to stretch to relieve lumbar strain.)',
    'How do astronauts organize a party? They planet!\n\n(Stay hydrated and keep up your daily caloric intake for maximum endurance.)',
    'What is an astronaut’s favorite key on the keyboard? The space bar!\n\n(Make sure to take your scheduled breaks and stay on top of your daily routine tasks.)',
    'Why did the sun go to school? To get a little brighter!\n\n(Keep an eye on cabin dosimeters during active solar periods.)',
    'How do you know when the moon has enough to eat? When it’s full!\n\n(Aim for ~3,000 kcal/day to support high-intensity resistive exercise.)',
  ];
  const joke = jokes[Math.floor(Math.random() * jokes.length)];
  return { text: joke, level: 0, chips: ['How am I doing?', 'Tell me another joke', 'What should I eat?'] };
}

export function reply(question, ctx) {
  const q = question.toLowerCase().trim();
  const { snap, youId, profile, view } = ctx;
  const c = snap.crew.find((x) => x.id === youId);
  const e = snap.env;

  if (!q) return { text: 'Ask me about your vitals, the cabin, a symptom, diet, sleep, or what a term means.', level: 0, chips: STARTERS };

  // 1. High-urgency emergencies
  if (EMERGENCY.test(q)) {
    const mental = /hurt(ing)? myself|suicid|kill myself|want to die/.test(q);
    return {
      text: mental
        ? 'I am glad you said it. Please tell a crewmate or the medical officer right now, and contact the flight surgeon. You do not have to handle this alone. Stay with someone until help is with you.'
        : 'This could be serious. Stop what you are doing, tell a crewmate and the medical officer now, and contact the flight surgeon.\n\nI cannot diagnose. Do not wait for a reading to change.',
      level: 3,
    };
  }

  // 2. Greetings and Persona
  if (has(q, /^(hi|hello|hey|greetings|howdy|good\s*(morning|afternoon|evening|day))\b/)) {
    const firstName = c.name.split(' ')[0];
    return {
      text: `Hello ${firstName}. I am your Aerospace Health Assistant aboard ${profile.name}. I monitor your live vitals, environmental sensors, long-term physiological trends, and provide operational flight medical guidance. How can I help you right now?`,
      level: 0,
      chips: STARTERS,
    };
  }

  if (has(q, 'who are you', 'what are you', 'what can you do', 'help me', 'commands', 'what do you do', 'help')) {
    return {
      text: `I am the Autonomous Medical Decision Support Assistant.\n\nI can:\n• Read your live vitals (Heart rate, Blood pressure, SpO₂, Temp, Respiration, HRV)\n• Monitor cabin atmosphere (CO₂, Pressure, ppO₂, Radiation)\n• Track long-term risks (Bone density, Muscle mass, SANS vision, Sleep debt, Hydration)\n• Triage symptoms and explain flight medical protocols\n• Provide guidance on sleep, nutrition, exercise, hygiene, and space adaptation\n\nI operate 100% offline aboard your craft, and can also connect online via Google Gemini AI when comms are open.`,
      level: 0,
      chips: STARTERS,
    };
  }

  // 3. Conversational "How are you" / Morale / Jokes
  if (has(q, 'how are you', 'how are things', 'how do you do', 'how is your day')) {
    return {
      text: `I am operating nominally across all telemetry channels, environmental sensors, and alert matrices. More importantly, how are you feeling today, ${c.name.split(' ')[0]}?`,
      level: 0,
      chips: ['How am I doing?', 'Any active alerts?', 'How is the cabin air?'],
    };
  }

  if (has(q, 'joke', 'funny', 'trivia', 'bored', 'fun fact', 'laugh')) {
    return spaceJoke();
  }

  if (has(q, 'thank you', 'thanks', 'thx', 'good job', 'appreciate it')) {
    return {
      text: `You're welcome, ${c.name.split(' ')[0]}! Stay safe and keep up the great work on mission tasks. I'm keeping an eye on your telemetry in the background.`,
      level: 0,
      chips: ['How am I doing?', 'What tasks are due?'],
    };
  }

  if (has(q, 'bye', 'goodbye', 'good night', 'sleep well', 'see ya', 'signing off')) {
    return {
      text: `Rest well, ${c.name.split(' ')[0]}. Ensure your sleep tether is secured and cabin airflow is active. I will alert you if any critical threshold is breached.`,
      level: 0,
      chips: ['How should I sleep in space?'],
    };
  }

  // 4. Operational & Telemetry queries
  if (has(q, 'what should i do first', 'what do i do', 'next step', 'what now')) return firstStep(ctx);
  if (has(q, 'alert', 'warning', 'problem', 'wrong')) return alertsReply(ctx);
  if (has(q, 'how am i', 'my status', 'overall', 'am i ok', 'am i okay', 'am i fine', 'health summary', 'how is my health', 'am i healthy', 'check me')) return statusSummary(ctx);

  if (has(q, 'task', 'routine', 'due', 'to do today', 'todo', 'schedule')) {
    const due = view.due;
    if (!due.length) return { text: `Nothing is due right now. You have done ${view.doneCount} of ${view.total} tasks today.`, level: 0 };
    return { text: `${due.length} task${due.length > 1 ? 's' : ''} due now:\n${due.slice(0, 6).map((t) => `• ${t.title ?? t.label ?? t.id}`).join('\n')}\n\nYou have done ${view.doneCount} of ${view.total} today.`, level: 1 };
  }

  if (has(q, 'delay', 'comms', 'earth', 'houston', 'ground', 'autonomous', 'flight surgeon', 'latency')) {
    return { text: `${profile.name}: link delay is ${profile.commsLabel}.${profile.autonomous ? ' You are in autonomous mode, so crew can act on the onboard protocols without waiting for Earth.' : ' The Earth link is near real time.'}`, level: 0 };
  }

  if (has(q, 'mission time', 'what time', /\bmet\b/, 'clock', 'elapsed time', 'where are we', 'location', 'what environment')) {
    return timeAndLocationGuidance(ctx);
  }

  // 5. Space Lifestyle & Medicine ("Normal Cases")
  // Check specific beverages (coffee/tea) before general hydration words
  if (has(q, 'coffee', 'caffeine', 'tea', 'espresso')) {
    return coffeeGuidance();
  }
  if (has(q, 'sleep', 'sleeping', 'insomnia', 'circadian', 'tired', 'fatigue', 'rest', 'bedtime', 'wake up')) {
    return sleepGuidance(ctx);
  }
  if (has(q, 'food', /\beat(ing)?\b/, 'diet', 'nutrition', 'calories', 'hungry', 'meal', 'sodium', 'salt', 'vitamin', 'supper', 'lunch', 'breakfast')) {
    return nutritionGuidance();
  }
  if (has(q, 'shower', 'hygiene', 'teeth', 'shampoo', 'wash', 'clean myself', 'brushing', 'bath')) {
    return hygieneGuidance();
  }
  if (has(q, 'water', 'drink', 'drinking', 'hydrat', 'dehydrat', 'thirsty', 'thirst', 'urine')) {
    return hydrationGuidance(ctx);
  }
  if (has(q, 'exercise', 'workout', 'gym', 'ared', 'treadmill', 'cycle', 'cevis', 'weights', 'lifting', 'cardio', 'running')) {
    return exerciseGuidance();
  }
  if (has(q, 'spacewalk', 'spacewalks', /\beva\b/, 'spacesuit', 'airlock', 'prebreathe', 'pre-breathe', 'emu')) {
    return evaGuidance();
  }
  if (has(q, 'space motion sickness', 'space adaptation', 'sas', 'motion sick', 'adaptation syndrome')) {
    return spaceAdaptationGuidance();
  }
  if (has(q, 'sans', 'spaceflight-associated neuro-ocular syndrome', 'optic disc', 'globe flattening')) {
    return sansGuidance(ctx);
  }
  if (has(q, 'radiation', 'solar flare', 'solar storm', 'cosmic ray', 'spe', 'gcr', 'storm shelter', 'shielding', 'dosimeter')) {
    return radiationGuidance(ctx);
  }
  if (has(q, 'lonely', 'anxious', 'stress', 'depressed', 'confinement', 'isolation', 'homesick', 'mental', 'psychological', 'morale')) {
    return mentalHealthGuidance();
  }
  if (has(q, 'medication', 'medicine', 'pill', 'painkiller', 'aspirin', 'tylenol', 'ibuprofen', 'first aid', 'bandage', 'medical kit', 'cmk')) {
    return medicationGuidance();
  }
  if (has(q, 'crew roster', 'other crew', 'crewmates', 'team members', 'who is on the crew', 'crew status')) {
    return crewRosterSummary(ctx);
  }

  // 6. Indicators and Vitals
  const cabinId = pick(q, CABIN_WORDS);
  const vitalId = pick(q, VITAL_WORDS);
  if (has(q, 'cabin', 'habitat', /\bair\b/) && !cabinId && !vitalId) {
    const lines = ['co2', 'pressure', 'ppo2', 'dose'].map((id) => { const l = vitalLine(id, c, e); return `${INDICATORS[id].name}: ${l.value}, ${LEVELS[l.level]}`; });
    const worst = Math.max(...['co2', 'pressure', 'ppo2', 'dose'].map((id) => vitalLine(id, c, e).level));
    return { text: `Cabin check:\n${lines.map((l) => `• ${l}`).join('\n')}`, level: worst };
  }

  // Symptoms
  const symId = Object.keys(SYMPTOM_WORDS).find((id) => has(q, ...SYMPTOM_WORDS[id]));
  if (symId && !has(q, 'what is', 'what does', 'explain', 'tell me about')) return symptomReply(symId, ctx);
  if (cabinId) return explainIndicator(cabinId, c, e);
  if (vitalId) return explainIndicator(vitalId, c, e);
  if (has(q, 'oxygen') || /\bo2\b/.test(q)) return explainIndicator('spo2', c, e);

  const longId = pick(q, LONG_WORDS);
  if (longId) return longReply(longId, ctx);
  if (symId) return symptomReply(symId, ctx);

  // Other crew members by name
  const other = snap.crew.find((x) => x.id !== youId && (q.includes(x.name.toLowerCase()) || q.includes(x.name.split(' ')[1].toLowerCase()) || q.includes(x.name.split(' ')[0].toLowerCase())));
  if (other) {
    const lv = ctx.alerts.filter((a) => a.crew === other.id).reduce((m, a) => Math.max(m, a.level), 0);
    return { text: other.lost ? `${other.name} (${other.role}): sensor signal lost.` : `${other.name} (${other.role}): ${LEVELS[lv]}. Heart rate ${n0(other.v.hr)} bpm, SpO₂ ${n1(other.v.spo2)} %, ${ACTIVITY_LABEL[other.act].toLowerCase()}.`, level: lv };
  }

  // Glossary
  const g = glossaryReply(q);
  if (g) return g;

  // Conversational Fallback with guided options
  return {
    text: `I did not quite understand that specific phrasing.\n\nHere are some things you can ask me:\n• "How am I doing?" or "What is my heart rate?"\n• "How is the cabin air?" or "How much CO₂ is in the habitat?"\n• "What tasks are due today?"\n• "How should I sleep in space?" or "What should I eat?"\n• "Why do astronauts exercise?" or "Can astronauts drink coffee?"\n• "How do astronauts shower?" or "What is SANS?"\n• "I have a headache" or "I feel dizzy"\n\n(Tip: In Chat Settings ⚙️ you can also connect online via Google Gemini AI for unrestricted natural conversations.)`,
    level: 0,
    chips: STARTERS,
  };
}

export function buildSystemPrompt(ctx) {
  const { snap, youId, alerts = [], profile = {}, long = {}, view = {} } = ctx;
  const c = snap?.crew?.find((x) => x.id === youId) || {};
  const e = snap?.env || {};
  const dueCount = view?.due?.length ?? 0;

  const systemPrompt = `You are the Autonomous Medical Officer AI and Health Assistant aboard a crewed spacecraft (${profile.name || 'Spacecraft'} - ${profile.sub || 'Deep Space'}).
  Your role is to support the crew's operational health, safety, and medical decision-making.
  Current Astronaut: ${c.name || 'Astronaut'} (${c.role || 'Crew Member'}), Activity: ${ACTIVITY_LABEL[c.act] || 'Resting'}. Telemetry: ${c.lost ? 'SIGNAL LOST' : 'ONLINE'}.
  Mission Profile: ${profile.name || 'Mission'}, Comms Delay to Earth: ${profile.commsLabel || 'Real-time'}. Protocol Mode: ${profile.autonomous ? 'AUTONOMOUS (Crew acts on onboard protocols)' : 'Standard Ground Telemetry'}.

  Live Astronaut Telemetry:
  - Heart Rate: ${c.v ? Math.round(c.v.hr) : '--'} bpm
  - Blood Pressure: ${c.v ? `${Math.round(c.v.sys)}/${Math.round(c.v.dia ?? 80)}` : '--'} mmHg
  - SpO2: ${c.v ? c.v.spo2.toFixed(1) : '--'}%
  - Core Body Temp: ${c.v ? c.v.temp.toFixed(1) : '--'}°C
  - Respiration Rate: ${c.v ? Math.round(c.v.resp) : '--'} breaths/min
  - HRV (RMSSD): ${c.v?.hrv != null ? `${Math.round(c.v.hrv)} ms` : 'N/A'}

  Cabin Atmosphere${e.live ? ' (REAL telemetry from the International Space Station, via NASA ISS Live)' : ' (simulated)'}:
  - CO2: ${e.co2 ? e.co2.toFixed(1) : '--'} mmHg
  - Total Pressure: ${e.pressure ? e.pressure.toFixed(1) : '--'} kPa
  - ppO2: ${e.ppo2 ? e.ppo2.toFixed(1) : '--'} kPa
  - Radiation Dose Rate: ${e.dose ? Math.round(e.dose) : '--'} µSv/h

  Long-term & Biomarkers:
  - Bone Loss Risk: ${long.bone?.text ?? 'Nominal'}
  - Muscle Degradation: ${long.muscle?.text ?? 'Nominal'}
  - Ocular/SANS Status: ${long.vision?.text ?? 'Nominal'}
  - Hydration Balance: ${long.hydration?.text ?? 'Nominal'}
  - Sleep Debt: ${long.sleep?.text ?? 'Nominal'}
  - Cumulative Radiation Dose: ${long.cumdose?.text ?? 'Nominal'}
  - Immune Status: ${long.immune?.text ?? 'Nominal'}
  - Routine Tasks Due: ${dueCount} tasks

  Space Weather (real, NASA DONKI): ${ctx.spaceWeather?.text ?? 'Not available.'}

  Active Alerts: ${alerts.length > 0 ? alerts.map((a) => `${a.title} (Level ${a.level}: ${a.detail})`).join('; ') : 'No active alerts.'}

  Guidance Rules:
  1. Provide accurate, clear, empathetic, and scientifically grounded aerospace medical answers.
  2. If asked normal conversational questions (greetings, jokes, how are you, food, sleep tips, exercise, hygiene, space adaptation, daily duties), answer naturally and engagingly with aerospace facts.
  3. If red flag symptoms (severe chest pain, unconsciousness, severe hypoxia, uncontrolled bleeding) are reported, urge immediate notification of the crew medical officer, flight surgeon, and urgent safe action.
  4. Keep answers concise and readable (2-4 paragraphs). Use bullet points where appropriate.
  5. Always preserve operational tone: provide decision support and actionable steps, maintaining the principle that this system is decision support, not an automated clinical diagnosis.`;
  return systemPrompt.replace(/^ {2}/gm, '');
}

export const GEMINI_DEFAULT_MODEL = 'gemini-3.8-flash';
// Retired Gemini IDs saved by older versions are upgraded to the default automatically.
const RETIRED_GEMINI = /^gemini-(1\.5|2\.0)/;
export function resolveGeminiModel(m) {
  return !m || RETIRED_GEMINI.test(m) ? GEMINI_DEFAULT_MODEL : m;
}

export const OLLAMA_DEFAULT_URL = 'http://localhost:11434';
export const OLLAMA_DEFAULT_MODEL = 'llama3.2';

// Local LLM via Ollama (https://ollama.com). Runs fully offline once the model is pulled.
async function askOllama(question, ctx, options) {
  const base = (options.ollamaUrl || OLLAMA_DEFAULT_URL).replace(/\/+$/, '');
  const messages = [{ role: 'system', content: buildSystemPrompt(ctx) }];
  for (const msg of options.history || []) {
    if (!msg.text) continue;
    messages.push({ role: msg.from === 'user' ? 'user' : 'assistant', content: msg.text });
  }
  messages.push({ role: 'user', content: question });

  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: options.ollamaModel || OLLAMA_DEFAULT_MODEL,
      messages,
      stream: false,
      options: { temperature: 0.6, num_predict: 700 },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Ollama HTTP ${res.status}`);
  }
  const data = await res.json();
  const text = data.message?.content?.trim();
  if (!text) throw new Error('Empty response from local model');
  return text;
}

/**
 * Online + Offline Dual-Mode Assistant.
 *
 * Connects to Google Gemini API when available, providing deep natural dialogue grounded in
 * live aerospace telemetry and environmental sensor data. Automatically falls back to the local
 * offline engine if offline, rate limited, unconfigured, or disconnected.
 */
export async function askAssistant(question, ctx, options = {}) {
  const apiKey = options.apiKey
    || (typeof localStorage !== 'undefined' ? localStorage.getItem('crew_vitals_gemini_api_key') : '')
    || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY)
    || '';

  const mode = options.mode
    || (typeof localStorage !== 'undefined' ? (localStorage.getItem('crew_vitals_chat_mode') || 'auto') : 'auto');

  const lsGet = (k, d) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null) || d;

  const ollamaOpts = () => ({
    ...options,
    ollamaUrl: options.ollamaUrl || lsGet('crew_vitals_ollama_url', OLLAMA_DEFAULT_URL),
    ollamaModel: options.ollamaModel || lsGet('crew_vitals_ollama_model', OLLAMA_DEFAULT_MODEL),
  });
  const ollamaResult = (text) => ({
    text,
    level: 0,
    chips: ['How am I doing?', 'Any active alerts?', 'How is the cabin air?', 'What tasks are due?'],
    isOnline: false,
    isLocalAI: true,
  });
  const onboard = (notice) => {
    const local = offlineReply(question, ctx);
    return { ...local, text: notice ? `*(${notice} Responding via Onboard Telemetry Engine)*\n\n${local.text}` : local.text, isOnline: false };
  };

  if (mode === 'ollama') {
    try {
      return ollamaResult(await askOllama(question, ctx, ollamaOpts()));
    } catch (err) {
      return onboard(`Local AI unavailable: ${err.message || 'cannot reach Ollama'}.`);
    }
  }

  // Auto mode without a Gemini key: try the local AI model first, then the onboard engine.
  if (mode === 'auto' && !apiKey) {
    try {
      return ollamaResult(await askOllama(question, ctx, ollamaOpts()));
    } catch {
      return onboard('');
    }
  }

  const model = resolveGeminiModel(options.model
    || (typeof localStorage !== 'undefined' ? localStorage.getItem('crew_vitals_gemini_model') : ''));

  // If local/offline mode is explicitly chosen, or auto mode with no key configured:
  if (mode === 'offline') {
    const res = offlineReply(question, ctx);
    return { ...res, isOnline: false };
  }

  // If online mode was explicitly chosen but no key is present:
  if (!apiKey && mode === 'online') {
    return {
      text: 'Online AI mode is selected, but no Google Gemini API key was found.\n\nPlease click Settings (⚙️ in the chat header) and paste your Gemini API key, or switch the mode to Local Telemetry.',
      level: 1,
      chips: ['Switch to Local Mode', 'How am I doing?', 'Any active alerts?'],
      isOnline: false,
    };
  }

  // Online request via Google Gemini REST API
  try {
    const systemPrompt = buildSystemPrompt(ctx);

    const contents = [];
    if (options.history && Array.isArray(options.history)) {
      for (const msg of options.history) {
        if (!msg.text) continue;
        const role = msg.from === 'user' ? 'user' : 'model';
        if (contents.length === 0 && role === 'model') {
          // Gemini API requires first message to have role 'user'
          continue;
        }
        if (contents.length > 0 && contents[contents.length - 1].role === role) {
          contents[contents.length - 1].parts[0].text += `\n\n${msg.text}`;
        } else {
          contents.push({
            role,
            parts: [{ text: msg.text }],
          });
        }
      }
    }

    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts[0].text += `\n\n${question}`;
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: question }],
      });
    }

    // Call Gemini API
    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 900,
      },
    };

    let res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    // Fallback if model endpoint rejects systemInstruction
    if (!res.ok && res.status === 400) {
      const fallbackContents = [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nAstronaut Question: ${question}` }],
        },
      ];
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: fallbackContents,
          generationConfig: { temperature: 0.6, maxOutputTokens: 900 },
        }),
      });
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.error?.message || `HTTP ${res.status}`;
      throw new Error(errMsg);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
      throw new Error('Empty response from model');
    }

    const chips = ['How am I doing?', 'Any active alerts?', 'How is the cabin air?', 'What tasks are due?'];

    return {
      text: candidate.trim(),
      level: 0,
      chips,
      isOnline: true,
    };
  } catch (err) {
    // Graceful fallback chain: local AI model (auto mode only), then the onboard engine
    const why = `Online AI unavailable: ${err.message || 'Network disconnected'}.`;
    if (mode === 'auto') {
      try {
        const text = await askOllama(question, ctx, ollamaOpts());
        return { ...ollamaResult(text), text: `*(${why} Responding via Local AI)*\n\n${text}` };
      } catch { /* fall through to onboard engine */ }
    }
    return onboard(why);
  }
}
