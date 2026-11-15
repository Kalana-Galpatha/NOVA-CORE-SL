import { useState } from 'react';
import StatusPill from './StatusPill.jsx';
import { formatHour } from '../lib/format.js';
import { INDICATORS } from '../lib/education.js';

const STATUS = {
  due: { level: 1, label: 'Due now' },
  done: { level: 0, label: 'Done' },
  missed: { level: 2, label: 'Missed' },
  upcoming: { level: 'n', label: 'Later' },
};

const show = (key, r) => {
  if (key === 'hr') return `${Math.round(r.values.hr)} bpm`;
  if (key === 'temp') return `${r.values.temp.toFixed(1)} °C`;
  if (key === 'spo2') return `${r.values.spo2.toFixed(1)} %`;
  return `${Math.round(r.values.sys)}/${Math.round(r.values.dia)} mmHg`;
};

function Result({ task }) {
  const d = task.done;
  if (d.reading && d.reading.levels) {
    return (
      <ul className="chips">
        {Object.keys(d.reading.levels).map((k) => (
          <li key={k} className="chip" data-lv={d.reading.levels[k]}>
            <span>{INDICATORS[k === 'sys' ? 'bp' : k].name}</span>
            <b className="mono">{show(k, d.reading)}</b>
            <StatusPill level={d.reading.levels[k]} />
          </li>
        ))}
      </ul>
    );
  }
  if (d.reading && d.reading.rating) {
    return <p className="done-note">You chose {d.reading.rating} of 5, {task.scale[d.reading.rating - 1].toLowerCase()}.</p>;
  }
  return <p className="done-note">{d.auto ? 'Confirmed by your wearable.' : 'Marked done.'}{d.onTime ? '' : ' Finished late.'}</p>;
}

function Row({ task, onComplete, beginner }) {
  const [msg, setMsg] = useState('');
  const st = STATUS[task.status];
  const late = task.status === 'missed';
  const go = (value) => {
    const r = onComplete(task.id, value);
    setMsg(r.ok ? '' : r.message);
  };
  const [from, to] = task.win;
  return (
    <li className="task" data-status={task.status}>
      <div className="task-head">
        <h3>{task.title}</h3>
        <StatusPill level={st.level} label={st.label} />
      </div>
      <p className="task-meta mono">
        {formatHour(from)} to {formatHour(to)} · +{task.points} XP
      </p>
      {task.done ? (
        <Result task={task} />
      ) : (
        <>
          <details key={String(beginner)} open={beginner && task.status === 'due'}>
            <summary>How to do it</summary>
            <p><b>How.</b> {task.how}</p>
            <p><b>Why.</b> {task.why}</p>
          </details>
          {task.kind === 'measure' && (
            <button type="button" className="btn primary" disabled={task.status === 'upcoming'} onClick={() => go()}>
              {late ? 'Take measurement (half XP)' : 'Take measurement'}
            </button>
          )}
          {task.kind === 'action' && (
            <button type="button" className="btn primary" disabled={task.status === 'upcoming'} onClick={() => go()}>
              {late ? 'Mark done (half XP)' : 'Mark done'}
            </button>
          )}
          {task.kind === 'rate' && (
            <div className="rate" role="group" aria-label={task.prompt}>
              <span className="k">{task.prompt}</span>
              <div className="rate-row">
                {task.scale.map((label, i) => (
                  <button key={label} type="button" className="btn" disabled={task.status === 'upcoming'} onClick={() => go(i + 1)} title={label}>
                    {i + 1}
                    <small>{label}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
          {task.kind === 'auto' && <p className="done-note">Counts by itself when your wearable sees you reach the target.</p>}
        </>
      )}
      {msg && <p className="msg" role="status">{msg}</p>}
    </li>
  );
}

export default function TaskPanel({ view, onComplete, beginner }) {
  return (
    <section className="panel" id="routine" aria-label="Today’s routine">
      <header>
        <h2>Today’s routine</h2>
        <p className="mono">{view.doneCount} of {view.total} done</p>
      </header>
      <ul className="tasks">
        {view.tasks.map((t) => (
          <Row key={t.id} task={t} onComplete={onComplete} beginner={beginner} />
        ))}
      </ul>
    </section>
  );
}
