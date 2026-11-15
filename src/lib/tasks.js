import { EXERCISE_OK } from './constants.js';
import { QUIZ } from './education.js';
import { hrLevel, spo2Level, tempLevel, sysLevel } from './status.js';
import { formatHour } from './format.js';

/**
 * Daily routine. kind:
 *   measure  the sensor takes a reading when the astronaut presses the button
 *   action   the astronaut confirms they did something
 *   rate     the astronaut picks a number from 1 to 5
 *   auto     the wearable confirms it (exercise)
 * window() returns [startHour, endHour]. Finishing after the end still counts, for half the XP.
 */
export const TASK_DEFS = [
  {
    id: 'checkin', title: 'Morning vitals check', kind: 'measure', measures: ['hr', 'temp'],
    window: () => [7, 10], points: 20,
    how: 'Sit still for five minutes. Fit the chest strap and the forehead sensor, then press Take measurement.',
    why: 'A calm reading at the same time each day is your baseline. Everything else is compared with it.',
  },
  {
    id: 'bp', title: 'Blood pressure', kind: 'measure', measures: ['sys'],
    window: () => [8, 11], points: 15,
    how: 'Sit with your back supported and the cuff at heart height. Stay quiet during the reading.',
    why: 'Fluid shifts and stress can change blood pressure. Regular readings show a slow drift early.',
  },
  {
    id: 'spo2', title: 'Blood oxygen check', kind: 'measure', measures: ['spo2'],
    window: () => [7, 12], points: 15,
    how: 'Clip the finger sensor on a warm, still hand. Wait for the number to settle.',
    why: 'A low value can be the first sign of a cabin air problem.',
  },
  {
    id: 'sleep', title: 'Sleep log', kind: 'rate', prompt: 'How rested do you feel?',
    scale: ['Exhausted', 'Tired', 'Okay', 'Rested', 'Great'],
    window: () => [6, 10], points: 10,
    how: 'Pick the number that fits how you feel right now.',
    why: 'Poor sleep affects mood, judgement and heart rate. Your rating adds context to your readings.',
  },
  {
    id: 'hydration', title: 'Drink 500 mL of water', kind: 'action',
    window: () => [12, 15], points: 10,
    how: 'Drink a full 500 mL pouch, not sips spread over the day.',
    why: 'In microgravity thirst is weaker, so people drink less than they need.',
  },
  {
    id: 'exercise', title: 'Exercise session', kind: 'auto',
    window: ({ index }) => { const s = index % 2 === 0 ? 10 : 14; return [s, s + 3]; }, points: 30,
    how: 'Do your scheduled session. Your wearable confirms it when you reach the target.',
    why: 'Exercise slows bone and muscle loss, supports your heart and helps sleep.',
  },
  {
    id: 'vision', title: 'Vision check', kind: 'action', envs: ['spacecraft', 'station'],
    window: () => [15, 19], points: 10,
    how: 'Cover one eye and read the small-print card at arm’s length. Repeat for the other eye. Report any blur.',
    why: 'Fluid shifts can change near vision on long stays. Early reports are easy to treat.',
  },
  {
    id: 'dust', title: 'Suit and dust check', kind: 'action', envs: ['rover', 'base'],
    window: () => [16, 20], points: 10,
    how: 'Brush and wipe your suit in the airlock. Check seals and glove joints for dust.',
    why: 'Fine dust irritates eyes and lungs and wears seals.',
  },
  {
    id: 'back', title: 'Back and body check', kind: 'rate', prompt: 'How does your back feel?',
    scale: ['No pain', 'Mild', 'Noticeable', 'Painful', 'Severe'],
    window: () => [6, 10], points: 10,
    how: 'Stretch gently, then pick the number that fits. Note anything sharp or spreading down a leg.',
    why: 'The spine lengthens in microgravity and back pain is common. Early reports let the surgeon adjust your exercise.',
  },
  {
    id: 'skin', title: 'Skin, wound and mouth check', kind: 'action',
    window: () => [17, 21], points: 10,
    how: 'Look over hands, face and any cut. Check teeth and gums. Photograph anything new or red.',
    why: 'Wounds heal slowly in space and skin or mouth problems start small. A daily look catches them early.',
  },
  {
    id: 'immune_check', title: 'Immune & allergy symptom log', kind: 'rate', prompt: 'Any immune symptoms (cold sores, rash, congestion, malaise)?',
    scale: ['None', 'Very mild', 'Noticeable', 'Moderate', 'Severe'],
    window: () => [7, 12], points: 15,
    how: 'Check for mouth sores, unusual rashes, persistent sneezing, or uncharacteristic exhaustion. Rate severity.',
    why: 'Spaceflight reactivates latent viruses and suppresses cell-mediated immunity. Early logging guides proactive countermeasures.',
  },
  {
    id: 'pvt', title: 'Cognitive alertness test (PVT)', kind: 'action',
    window: () => [8, 14], points: 20,
    how: 'Complete the 5-round reaction speed test in the Behavioral Alertness panel.',
    why: 'Catches operational fatigue and attentional lapses before hazardous procedures.',
  },
  {
    id: 'isolation', title: 'Crew cohesion & private time log', kind: 'rate', prompt: 'How supported and connected do you feel with crew and ground?',
    scale: ['Isolated', 'Strained', 'Neutral', 'Supported', 'Close-knit'],
    window: () => [17, 22], points: 10,
    how: 'Rate interpersonal morale and confirm if you logged private comms with Earth today.',
    why: 'Confinement and deep space isolation erode team cohesion over time. Tracking morale prevents interpersonal friction.',
  },
  {
    id: 'stand_test', title: 'Orthostatic tolerance check', kind: 'action',
    window: () => [9, 13], points: 15,
    how: 'Rest still for 2 minutes, then stand upright for 3 minutes. Note any dizziness, racing pulse or vision graying.',
    why: 'In altered gravity, cardiovascular deconditioning and fluid redistribution cause orthostatic intolerance when standing.',
  },
  {
    id: 'mood', title: 'Mood and stress check-in', kind: 'rate', prompt: 'How stressed do you feel?',
    scale: ['Calm', 'Fine', 'A bit tense', 'Stressed', 'Overwhelmed'],
    window: () => [18, 22], points: 10,
    how: 'Pick the number that fits right now. There is no wrong answer.',
    why: 'Stress builds quietly on long missions. A daily note lets the team step in early.',
  },
];

export const BADGES = [
  { id: 'first', name: 'First check-in', text: 'Take your first measurement.', test: (p) => p.stats.measure >= 1 },
  { id: 'iron', name: 'Iron routine', text: 'Finish 3 exercise sessions.', test: (p) => p.stats.exercise >= 3 },
  { id: 'hydro', name: 'Hydration hero', text: 'Drink your water 3 times.', test: (p) => p.stats.hydration >= 3 },
  { id: 'perfect', name: 'Perfect day', text: 'Finish every task in one day.', test: (p) => p.perfectDays >= 1 },
  { id: 'streak3', name: 'Three-day streak', text: 'Perfect days three in a row.', test: (p) => p.bestStreak >= 3 },
  { id: 'streak7', name: 'Seven-day streak', text: 'Perfect days seven in a row.', test: (p) => p.bestStreak >= 7 },
  { id: 'scholar', name: 'Quick learner', text: 'Answer 3 daily questions correctly.', test: (p) => p.stats.quiz >= 3 },
];

// Simulated history so the leaderboard and streaks have something to show on first load.
export const SEED_PROGRESS = [
  { xp: 420, streak: 6, best: 6, perfect: 5, stats: { measure: 40, exercise: 14, hydration: 9, quiz: 5 } },
  { xp: 365, streak: 4, best: 5, perfect: 3, stats: { measure: 34, exercise: 12, hydration: 7, quiz: 2 } },
  { xp: 390, streak: 5, best: 5, perfect: 4, stats: { measure: 36, exercise: 13, hydration: 8, quiz: 4 } },
  { xp: 310, streak: 2, best: 3, perfect: 1, stats: { measure: 28, exercise: 9, hydration: 4, quiz: 1 } },
];

const statusOf = (win, hour, done) => (done ? 'done' : hour < win[0] ? 'upcoming' : hour < win[1] ? 'due' : 'missed');

export class TaskEngine {
  constructor({ crewIds, profile, you, rng = Math.random, seed = SEED_PROGRESS }) {
    this.crewIds = crewIds;
    this.profile = profile;
    this.you = you ?? crewIds[0];
    this.rng = rng;
    this.day = null;
    this.plans = {};
    this.feed = [];
    this.p = {};
    crewIds.forEach((id, i) => {
      const sd = seed[i] ?? {};
      this.p[id] = {
        xp: sd.xp ?? 0,
        streak: sd.streak ?? 0,
        bestStreak: sd.best ?? sd.streak ?? 0,
        perfectDays: sd.perfect ?? 0,
        stats: { measure: 0, exercise: 0, hydration: 0, quiz: 0, ...(sd.stats || {}) },
        badges: new Set(),
        done: {},
        quiz: null,
      };
    });
    crewIds.forEach((id) => this.checkBadges(id, 0, true));
  }

  index(id) { return this.crewIds.indexOf(id); }

  defs(id) {
    const index = this.index(id);
    return TASK_DEFS
      .filter((d) => !d.envs || d.envs.includes(this.profile.id))
      .map((d) => ({ ...d, win: d.window({ index }) }));
  }

  award(id, pts, t, text) {
    this.p[id].xp += pts;
    this.feed.unshift({ t, crew: id, text: `+${pts} XP · ${text}` });
    if (this.feed.length > 40) this.feed.pop();
  }

  checkBadges(id, t, silent = false) {
    const p = this.p[id];
    for (const b of BADGES) {
      if (!p.badges.has(b.id) && b.test(p)) {
        p.badges.add(b.id);
        if (!silent) {
          this.feed.unshift({ t, crew: id, text: `Badge earned · ${b.name}` });
          if (this.feed.length > 40) this.feed.pop();
        }
      }
    }
  }

  planDay() {
    this.plans = {};
    for (const id of this.crewIds) {
      this.plans[id] = {};
      for (const d of this.defs(id)) {
        this.plans[id][d.id] = {
          skip: this.rng() < 0.1,
          at: d.win[0] + this.rng() * (d.win[1] - d.win[0]) * 0.8,
        };
      }
    }
  }

  closeDay(t) {
    for (const id of this.crewIds) {
      const p = this.p[id];
      const all = this.defs(id).every((d) => p.done[d.id]);
      if (all) {
        p.streak += 1;
        p.bestStreak = Math.max(p.bestStreak, p.streak);
        p.perfectDays += 1;
        this.award(id, 25 + 5 * Math.min(p.streak, 10), t, `Perfect day, ${p.streak}-day streak`);
      } else {
        p.streak = 0;
      }
      p.done = {};
      this.checkBadges(id, t);
    }
  }

  /** Call after every simulator tick. */
  update(snap) {
    const day = Math.floor(snap.t / 86400);
    if (this.day === null) {
      this.day = day;
      this.planDay();
    } else if (day !== this.day) {
      this.closeDay(snap.t);
      this.day = day;
      this.planDay();
    }
    for (const c of snap.crew) {
      const p = this.p[c.id];
      for (const d of this.defs(c.id)) {
        if (p.done[d.id]) continue;
        if (d.kind === 'auto') {
          if (c.ex >= EXERCISE_OK * snap.exTarget) this.finish(c.id, d, snap, { auto: true });
          continue;
        }
        if (c.id === this.you) continue; // the person at the screen does their own routine
        const plan = this.plans[c.id]?.[d.id];
        if (plan && !plan.skip && snap.hour >= plan.at && snap.hour < d.win[1] + 1) {
          this.complete(c.id, d.id, snap, { value: 2 + Math.floor(this.rng() * 3) });
        }
      }
    }
  }

  read(d, c) {
    const values = {};
    const levels = {};
    for (const m of d.measures) {
      if (m === 'hr') { values.hr = c.v.hr; levels.hr = hrLevel(c.v.hr, c.act, c.max).level; }
      if (m === 'temp') { values.temp = c.v.temp; levels.temp = tempLevel(c.v.temp); }
      if (m === 'spo2') { values.spo2 = c.v.spo2; levels.spo2 = spo2Level(c.v.spo2); }
      if (m === 'sys') {
        values.sys = c.v.sys;
        values.dia = c.dia0 + (c.v.sys - c.sys0) * 0.45;
        levels.sys = sysLevel(c.v.sys);
      }
    }
    return { values, levels };
  }

  complete(id, taskId, snap, { value } = {}) {
    const p = this.p[id];
    const d = this.defs(id).find((x) => x.id === taskId);
    const c = snap.crew.find((x) => x.id === id);
    if (!d || !c) return { ok: false, reason: 'unknown', message: 'That task does not exist here.' };
    if (p.done[taskId]) return { ok: false, reason: 'done', message: 'Already done today.' };
    if (d.kind === 'auto') return { ok: false, reason: 'auto', message: 'This one counts automatically from your wearable.' };
    if (statusOf(d.win, snap.hour, false) === 'upcoming') {
      return { ok: false, reason: 'early', message: `This opens at ${formatHour(d.win[0])}.` };
    }
    let reading = null;
    if (d.kind === 'measure') {
      if (c.lost) return { ok: false, reason: 'sensor', message: 'Your sensor is not sending data. Reseat the patch, then try again.' };
      if (c.act !== 'work') return { ok: false, reason: 'context', message: 'Rest for five minutes first. Take this one while you are not exercising or sleeping.' };
      reading = this.read(d, c);
    }
    if (d.kind === 'rate') reading = { rating: value };
    return this.finish(id, d, snap, { reading });
  }

  finish(id, d, snap, { reading = null, auto = false } = {}) {
    const p = this.p[id];
    const onTime = statusOf(d.win, snap.hour, false) !== 'missed';
    const points = onTime ? d.points : Math.round(d.points / 2);
    p.done[d.id] = { t: snap.t, onTime, reading, points, auto };
    if (d.kind === 'measure') p.stats.measure += 1;
    if (d.id === 'exercise') p.stats.exercise += 1;
    if (d.id === 'hydration') p.stats.hydration += 1;
    this.award(id, points, snap.t, d.title + (onTime ? '' : ' (late)'));
    this.checkBadges(id, snap.t);
    return { ok: true, points, onTime, reading };
  }

  view(id, snap) {
    const p = this.p[id];
    const tasks = this.defs(id).map((d) => {
      const done = p.done[d.id] || null;
      return { ...d, done, status: statusOf(d.win, snap.hour, Boolean(done)) };
    });
    return {
      tasks,
      doneCount: tasks.filter((t) => t.done).length,
      total: tasks.length,
      due: tasks.filter((t) => t.status === 'due'),
    };
  }

  progress(id) {
    const p = this.p[id];
    return {
      xp: p.xp,
      level: Math.floor(p.xp / 100) + 1,
      into: p.xp % 100,
      streak: p.streak,
      bestStreak: p.bestStreak,
      perfectDays: p.perfectDays,
      badges: [...p.badges],
      stats: { ...p.stats },
    };
  }

  leaderboard(snap) {
    return snap.crew
      .map((c) => {
        const pr = this.progress(c.id);
        const v = this.view(c.id, snap);
        return { id: c.id, name: c.name, xp: pr.xp, level: pr.level, streak: pr.streak, done: v.doneCount, total: v.total };
      })
      .sort((a, b) => b.xp - a.xp);
  }

  team(snap) {
    const rows = this.leaderboard(snap);
    return { done: rows.reduce((s, r) => s + r.done, 0), total: rows.reduce((s, r) => s + r.total, 0) };
  }

  quizToday(id) {
    const q = QUIZ[(this.day ?? 0) % QUIZ.length];
    const a = this.p[id].quiz;
    return { question: q, answered: a && a.day === this.day ? a : null };
  }

  answerQuiz(id, choice, t) {
    const { question, answered } = this.quizToday(id);
    if (answered) return null;
    const correct = choice === question.answer;
    const p = this.p[id];
    p.quiz = { day: this.day, choice, correct };
    if (correct) p.stats.quiz += 1;
    this.award(id, correct ? 10 : 2, t, correct ? 'Daily question, correct' : 'Daily question, keep learning');
    this.checkBadges(id, t);
    return { correct };
  }
}
