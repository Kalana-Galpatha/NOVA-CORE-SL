import { useCallback, useEffect, useState } from 'react';
import { ENVIRONMENTS } from '../lib/environments.js';
import { Simulator } from '../lib/simulator.js';
import { AlertEngine } from '../lib/alertEngine.js';
import { TaskEngine } from '../lib/tasks.js';
import { LongTerm } from '../lib/longterm.js';
import { missionStartNow, REAL_TIME } from '../lib/constants.js';

/**
 * Everything that changes over time lives in one "world" object:
 * the simulator (telemetry), the alert engine and the routine/gamification engine.
 * To use real sensors, replace Simulator with a class that fills the same snapshot
 * shape from a WebSocket, and keep the rest as it is.
 */
export function createWorld(envId, youId) {
  const profile = ENVIRONMENTS[envId];
  const sim = new Simulator(profile, missionStartNow());
  sim.warmUp();
  const snap = sim.snapshot();
  const alerts = new AlertEngine();
  const tasks = new TaskEngine({ crewIds: snap.crew.map((c) => c.id), profile, you: youId });
  tasks.update(snap);
  const long = new LongTerm({ crewIds: snap.crew.map((c) => c.id), profile, tasks });
  long.update(snap);
  snap.long = long.snapshot();
  return { profile, sim, alerts, tasks, long, snap };
}

export function advance(world, n) {
  for (let i = 0; i < n; i += 1) {
    world.sim.tick();
    world.snap = world.sim.snapshot();
    world.tasks.update(world.snap);
    world.long.update(world.snap);
    world.snap.long = world.long.snapshot();
    world.alerts.update(world.snap);
  }
}

export function useTelemetry(initialEnv, youId) {
  const [envId, setEnvId] = useState(initialEnv);
  const [world, setWorld] = useState(() => createWorld(initialEnv, youId));
  const [, setN] = useState(0);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(REAL_TIME);
  const bump = useCallback(() => setN((n) => n + 1), []);

  useEffect(() => {
    world.tasks.you = youId;
    bump();
  }, [world, youId, bump]);

  useEffect(() => {
    if (!running) return undefined;
    let acc = 0;
    let last = Date.now();
    const timer = setInterval(() => {
      // Use wall-clock time so real-time mode stays accurate even if the tab is throttled.
      const now = Date.now();
      acc += speed * ((now - last) / 1000);
      last = now;
      const n = Math.min(Math.floor(acc), 60);
      acc -= Math.floor(acc);
      if (n > 0) {
        advance(world, n);
        bump();
      }
    }, 200);
    return () => clearInterval(timer);
  }, [running, speed, world, bump]);

  const refresh = useCallback(() => {
    world.snap = world.sim.snapshot();
    world.snap.long = world.long.snapshot();
    bump();
  }, [world, bump]);

  const note = useCallback((n) => {
    if (n) world.alerts.note(world.snap.t, n.subject, n.title);
  }, [world]);

  return {
    world,
    envId,
    alerts: world.alerts.alerts(),
    log: world.alerts.log(),
    running,
    speed,
    setRunning,
    setSpeed,
    changeEnv(id) {
      setEnvId(id);
      setWorld(createWorld(id, youId));
    },
    skip(minutes) {
      advance(world, minutes);
      bump();
    },
    scenario(event, crewId) {
      note(event === 'clear' ? world.sim.clearAll() : world.sim.toggle(event, crewId));
      refresh();
    },
    shelter(on) {
      note(world.sim.setShelter(on));
      refresh();
    },
    ack(key) {
      world.alerts.acknowledge(key);
      bump();
    },
    takeAction(key, actionText, retestMinutes) {
      world.alerts.takeAction(key, actionText, retestMinutes);
      bump();
    },
    completeTask(taskId, value) {
      const r = world.tasks.complete(youId, taskId, world.snap, { value });
      bump();
      return r;
    },
    answerQuiz(choice) {
      const r = world.tasks.answerQuiz(youId, choice, world.snap.t);
      bump();
      return r;
    },
  };
}
