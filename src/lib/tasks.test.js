import { describe, it, expect } from 'vitest';
import { TaskEngine } from './tasks.js';
import { ENVIRONMENTS } from './environments.js';

const person = (id, over = {}) => ({
  id, name: id, max: 176, act: 'work', lost: false, lostTicks: 0, ex: 0, sleep: 7, dose: 80,
  sys0: 112, dia0: 72, fx: {}, v: { hr: 62, spo2: 98, temp: 36.8, resp: 14, sys: 112 },
  hist: { hr: [], spo2: [], temp: [] }, ...over,
});
const snapAt = (hour, a = {}, day = 47) => ({
  t: day * 86400 + hour * 3600, hour, exTarget: 120, crew: [person('a', a), person('b')], env: {},
});
const make = (seed = [{ xp: 0, streak: 0 }, { xp: 0, streak: 0 }]) =>
  new TaskEngine({ crewIds: ['a', 'b'], profile: ENVIRONMENTS.spacecraft, you: 'a', rng: () => 0.99, seed });

describe('TaskEngine routine', () => {
  it('records a measurement on time and awards XP', () => {
    const e = make();
    const s = snapAt(8);
    e.update(s);
    const r = e.complete('a', 'checkin', s);
    expect(r.ok).toBe(true);
    expect(r.points).toBe(20);
    expect(r.reading.values.hr).toBe(62);
    expect(r.reading.levels.hr).toBe(0);
    expect(e.progress('a').xp).toBe(20);
  });

  it('refuses a task before its window opens', () => {
    const e = make();
    const s = snapAt(5);
    e.update(s);
    expect(e.complete('a', 'checkin', s)).toMatchObject({ ok: false, reason: 'early' });
  });

  it('gives half XP when a task is finished late', () => {
    const e = make();
    const s = snapAt(11);
    e.update(s);
    const r = e.complete('a', 'checkin', s);
    expect(r.onTime).toBe(false);
    expect(r.points).toBe(10);
  });

  it('blocks a measurement when the sensor is lost or the person is not resting', () => {
    const e = make();
    const lost = snapAt(8, { lost: true });
    e.update(lost);
    expect(e.complete('a', 'checkin', lost).reason).toBe('sensor');
    const busy = snapAt(8, { act: 'exercise' });
    expect(e.complete('a', 'checkin', busy).reason).toBe('context');
  });

  it('completes exercise by itself once 75 percent of the target is reached', () => {
    const e = make();
    e.update(snapAt(11, { ex: 80 }));
    expect(e.view('a', snapAt(11)).tasks.find((t) => t.id === 'exercise').done).toBeNull();
    e.update(snapAt(11.5, { ex: 90 }));
    expect(e.view('a', snapAt(11.5)).tasks.find((t) => t.id === 'exercise').done).not.toBeNull();
  });

  it('only offers environment-specific tasks where they apply', () => {
    const e = make();
    const ids = e.defs('a').map((d) => d.id);
    expect(ids).toContain('vision');
    expect(ids).not.toContain('dust');
  });
});

describe('streaks, badges and quiz', () => {
  const finishEverything = (e) => {
    const s = snapAt(21, { ex: 100 });
    e.update(s);
    for (const d of e.defs('a')) if (d.kind !== 'auto') e.complete('a', d.id, s, { value: 3 });
  };

  it('a perfect day extends the streak, grants a bonus and resets the board', () => {
    const e = make();
    finishEverything(e);
    const before = e.progress('a').xp;
    e.update(snapAt(0.02, {}, 48));
    const p = e.progress('a');
    expect(p.streak).toBe(1);
    expect(p.perfectDays).toBe(1);
    expect(p.xp).toBeGreaterThan(before);
    expect(p.badges).toContain('perfect');
    expect(e.view('a', snapAt(0.02, {}, 48)).doneCount).toBe(0);
  });

  it('a missed task resets the streak', () => {
    const e = make([{ xp: 0, streak: 4, best: 4 }, { xp: 0 }]);
    e.update(snapAt(21));
    e.update(snapAt(0.02, {}, 48));
    expect(e.progress('a').streak).toBe(0);
    expect(e.progress('a').bestStreak).toBe(4);
  });

  it('the daily question pays once per day', () => {
    const e = make();
    e.update(snapAt(9));
    const { question } = e.quizToday('a');
    expect(e.answerQuiz('a', question.answer, 0)).toEqual({ correct: true });
    expect(e.answerQuiz('a', question.answer, 0)).toBeNull();
    expect(e.progress('a').xp).toBe(10);
  });
});
