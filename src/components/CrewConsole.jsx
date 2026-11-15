import { useState } from 'react';
import StatusPill from './StatusPill.jsx';
import VitalChart from './VitalChart.jsx';
import VitalCharts from './VitalCharts.jsx';
import { ACTIVITY_LABEL, ADVICE } from '../lib/constants.js';
import { LT_META } from '../lib/longterm.js';
import { bpText, crewLevel, formatMET, levelOf, num } from '../lib/format.js';

function Sparkline({ data }) {
  const pts = data.map((v, i) => [i, v]);
  const vals = data.filter((v) => v != null);
  if (vals.length < 2) return <svg className="spark" viewBox="0 0 120 34" aria-hidden="true" />;
  const lo = 40;
  const hi = 170;
  const x = (i) => (i / (data.length - 1)) * 120;
  const y = (v) => 32 - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * 30;
  let d = '';
  let pen = false;
  pts.forEach(([i, v]) => {
    if (v == null) { pen = false; return; }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
    pen = true;
  });
  return (
    <svg className="spark" viewBox="0 0 120 34" preserveAspectRatio="none" aria-hidden="true">
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function CrewCard({ c, level, selected, onSelect }) {
  const lv = c.lost && level === 0 ? 'n' : level;
  return (
    <button type="button" className="crew" data-lv={lv} aria-pressed={selected} onClick={onSelect}>
      <span className="row">
        <span>
          <span className="nm">{c.name}</span>
          <span className="role">{c.role}</span>
        </span>
        <StatusPill level={lv} />
      </span>
      <span className="trio">
        <span className="m"><span className="k">Heart rate</span><span className="val mono">{c.lost ? '—' : num(c.v.hr)}<small>bpm</small></span></span>
        <span className="m"><span className="k">SpO₂</span><span className="val mono">{c.lost ? '—' : num(c.v.spo2, 1)}<small>%</small></span></span>
        <span className="m"><span className="k">Core temp</span><span className="val mono">{c.lost ? '—' : num(c.v.temp, 1)}<small>°C</small></span></span>
      </span>
      <Sparkline data={c.hist.hr} />
      <span className="foot">
        <span>{ACTIVITY_LABEL[c.act]}</span>
        <span>{c.lost ? 'No signal' : `BP ${bpText(c)}`}</span>
      </span>
    </button>
  );
}

function AlertPanel({ alerts, shelter, onAck, onShelter }) {
  return (
    <section className="panel" aria-label="Alerts">
      <header>
        <h2>Active alerts</h2>
        <p>Suggested steps support the flight surgeon. They do not replace them.</p>
      </header>
      <ul className="alerts" aria-live="polite">
        {alerts.length === 0 && <li className="empty">No active alerts. Every monitored value is inside its limits.</li>}
        {alerts.map((a) => (
          <li key={a.key} className={a.ack ? 'alert acked' : 'alert'} data-lv={a.level}>
            <div className="top">
              <StatusPill level={a.level} />
              <strong>{a.title}</strong>
            </div>
            <div className="sub">{a.subject} · since {formatMET(a.since)}{a.ack ? ' · acknowledged' : ''}</div>
            <div className="mono">{a.detail}</div>
            <p className="adv"><b>Suggested step.</b> {ADVICE[a.adv]}</p>
            <div className="acts">
              {!a.ack && <button type="button" className="btn sm" onClick={() => onAck(a.key)}>Acknowledge</button>}
              {a.adv === 'rad' && (
                <button type="button" className="btn sm" aria-pressed={shelter} onClick={() => onShelter(!shelter)}>
                  {shelter ? 'Crew in shelter, release' : 'Send crew to shelter'}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EnvironmentPanel({ snap, alerts }) {
  const e = snap.env;
  const tiles = [
    ['CO₂', num(e.co2, 1), 'mmHg', levelOf(alerts, 'co2')],
    ['Pressure', num(e.pressure, 1), 'kPa', levelOf(alerts, 'press')],
    ['ppO₂', num(e.ppo2, 1), 'kPa', levelOf(alerts, 'ppo2')],
    ['Cabin temp', num(e.temp, 1), '°C', 0],
    ['Humidity', num(e.hum), '%', 0],
    ['Dose rate', num(e.dose), 'µSv/h', levelOf(alerts, 'rad')],
  ];
  return (
    <section className="panel" aria-label="Cabin and radiation">
      <header><h2>Cabin and radiation</h2><p>Last 90 minutes</p></header>
      <div className="env">
        {tiles.map(([k, v, u, lv]) => (
          <div key={k} className="et" data-lv={lv}>
            <span className="k">{k}</span>
            <b className="mono">{v} <small>{u}</small></b>
          </div>
        ))}
      </div>
      <VitalChart title="Cabin CO₂" unit="mmHg" data={e.hist.co2} decimals={1} domain={[0, 10]} band={[0, 4]} limits={[{ y: 5.3, level: 2 }, { y: 7, level: 3 }]} />
      <VitalChart title="Radiation dose rate" unit="µSv/h" data={e.hist.dose} domain={[0, 2000]} band={[0, 150]} limits={[{ y: 400, level: 2 }, { y: 1000, level: 3 }]} />
    </section>
  );
}

const CREW_EVENTS = [['tachy', 'Resting tachycardia'], ['fever', 'Fever'], ['arrhythmia', 'Cardiac arrhythmia'], ['drop', 'Sensor dropout']];
const CABIN_EVENTS = [['scrub', 'CO₂ scrubber fault'], ['leak', 'Cabin leak'], ['spe', 'Solar particle event']];

function Injector({ snap, sel, onSel, onEvent }) {
  const c = snap.crew.find((x) => x.id === sel);
  const on = {
    tachy: c.fx.tachy, fever: c.fx.fever, arrhythmia: c.fx.arrhythmia, drop: c.lost,
    scrub: snap.env.scrub, leak: snap.env.leak, spe: snap.env.spe,
  };
  return (
    <section className="panel" aria-label="Scenario injector">
      <details open>
        <summary>Scenario injector</summary>
        <div className="inj">
          <label className="k" htmlFor="inj-crew">Crew events apply to</label>
          <select id="inj-crew" value={sel} onChange={(ev) => onSel(ev.target.value)}>
            {snap.crew.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          <div className="grp">
            {CREW_EVENTS.map(([k, label]) => (
              <button key={k} type="button" className="btn" aria-pressed={on[k]} onClick={() => onEvent(k, sel)}>{label}</button>
            ))}
          </div>
          <span className="k">Vehicle events</span>
          <div className="grp">
            {CABIN_EVENTS.map(([k, label]) => (
              <button key={k} type="button" className="btn" aria-pressed={on[k]} onClick={() => onEvent(k, sel)}>{label}</button>
            ))}
          </div>
          <button type="button" className="btn" onClick={() => onEvent('clear', sel)}>Clear all events</button>
        </div>
      </details>
    </section>
  );
}

function EventLog({ log }) {
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const copy = async () => {
    const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
    const csv = ['MET,Event,Subject,Detail']
      .concat([...log].reverse().map((e) => [formatMET(e.t), e.kind, e.subject, e.title + (e.detail ? ` (${e.detail})` : '')].map(q).join(',')))
      .join('\n');
    try {
      await navigator.clipboard.writeText(csv);
      setText('');
      setMsg('Log copied.');
    } catch {
      setText(csv);
      setMsg('Select and copy the text below.');
    }
  };
  return (
    <section className="panel" aria-label="Event log">
      <header>
        <h2>Event log</h2>
        <button type="button" className="btn sm" onClick={copy}>Copy as CSV</button>
      </header>
      {msg && <p className="note" role="status">{msg}</p>}
      {text && <textarea readOnly value={text} aria-label="Event log as CSV" onFocus={(ev) => ev.target.select()} />}
      <ul className="log">
        {log.length === 0 && <li className="empty">Nothing logged yet.</li>}
        {log.slice(0, 60).map((e) => (
          <li key={`${e.t}-${e.kind}-${e.subject}-${e.title}`} data-lv={e.level}>
            <time className="mono">{formatMET(e.t)}</time>
            <span className="kd">{e.kind}</span>
            <span>{e.subject}, {e.title}{e.detail ? ` (${e.detail})` : ''}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// The flight surgeon's view of the whole crew.
export default function CrewConsole({ tele }) {
  const { world, alerts, log } = tele;
  const { snap } = world;
  const [sel, setSel] = useState('okafor');
  const c = snap.crew.find((x) => x.id === sel);
  const worst = alerts.reduce((m, a) => Math.max(m, a.level), 0);
  const unack = alerts.filter((a) => !a.ack).length;
  const flagged = snap.crew.filter((x) => crewLevel(alerts, x.id) > 0).map((x) => x.name.split(' ')[1]);
  const nominal = snap.crew.length - snap.crew.filter((x) => crewLevel(alerts, x.id) > 0).length;
  return (
    <div className="stack">
      <section className="tiles" aria-label="Summary">
        <div className="tile" data-lv={Math.max(...snap.crew.map((x) => crewLevel(alerts, x.id)))}>
          <span className="k">Crew</span><b>{nominal} of {snap.crew.length} nominal</b>
          <span>{flagged.length ? `Flagged: ${flagged.join(', ')}` : 'All vitals inside limits'}</span>
        </div>
        <div className="tile" data-lv={worst}>
          <span className="k">Alerts</span><b>{alerts.length} active</b>
          <span>{alerts.length ? `${unack} unacknowledged` : 'None open'}</span>
        </div>
        <div className="tile" data-lv={Math.max(levelOf(alerts, 'co2'), levelOf(alerts, 'press'), levelOf(alerts, 'ppo2'))}>
          <span className="k">Cabin</span><b>CO₂ {num(snap.env.co2, 1)} mmHg</b>
          <span>{num(snap.env.pressure, 1)} kPa</span>
        </div>
        <div className="tile" data-lv={levelOf(alerts, 'rad')}>
          <span className="k">Radiation</span><b>{num(snap.env.dose)} µSv/h</b>
          <span>{snap.env.shelter ? 'Crew in storm shelter' : 'Inside shielded cabin'}</span>
        </div>
      </section>

      <div className="console-grid">
        <div className="stack">
          <div className="crews">
            {snap.crew.map((x) => (
              <CrewCard key={x.id} c={x} level={crewLevel(alerts, x.id)} selected={x.id === sel} onSelect={() => setSel(x.id)} />
            ))}
          </div>
          <section className="panel" aria-label="Selected crew member">
            <header><h2>{c.name}</h2><p>{c.role}, age {c.age}</p></header>
            <VitalCharts crew={c} />
            <div className="stats">
              <div><span className="k">Exercise today</span><b className="mono">{c.ex} of {snap.exTarget} min</b></div>
              <div><span className="k">Sleep, last night</span><b className="mono">{num(c.sleep, 1)} h</b></div>
              <div><span className="k">Mission dose</span><b className="mono">{num(c.dose, 1)} mSv</b></div>
              <div><span className="k">Sensor</span><b>{c.lost ? 'Signal lost' : 'Signal good'}</b></div>
            </div>
            <h3 className="sub">Slow changes</h3>
            <ul className="chips">
              {Object.entries(snap.long?.[c.id] ?? {}).map(([k, m]) => (
                <li key={k} className="chip" data-lv={m.level}>
                  <span>{LT_META[k].title}</span>
                  <b className="mono">{m.text}</b>
                  <StatusPill level={m.level} />
                </li>
              ))}
            </ul>
          </section>
        </div>
        <div className="stack">
          <AlertPanel alerts={alerts} shelter={snap.env.shelter} onAck={tele.ack} onShelter={tele.shelter} />
          <EnvironmentPanel snap={snap} alerts={alerts} />
          <Injector snap={snap} sel={sel} onSel={setSel} onEvent={tele.scenario} />
          <EventLog log={log} />
        </div>
      </div>
    </div>
  );
}
