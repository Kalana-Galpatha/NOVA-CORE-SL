import { useState } from 'react';
import StatusPill from './StatusPill.jsx';
import VitalCard from './VitalCard.jsx';
import VitalCharts from './VitalCharts.jsx';
import TaskPanel from './TaskPanel.jsx';
import GamePanel from './GamePanel.jsx';
import InsightsPanel from './InsightsPanel.jsx';
import LearnPanel from './LearnPanel.jsx';
import LongTermPanel from './LongTermPanel.jsx';
import ImmunePanel from './ImmunePanel.jsx';
import ReactionTest from './ReactionTest.jsx';
import TrendsPanel from './TrendsPanel.jsx';
import SystemScores from './SystemScores.jsx';
import TriagePanel from './TriagePanel.jsx';
import SpaceWeatherPanel from './SpaceWeatherPanel.jsx';
import IssLivePanel from './IssLivePanel.jsx';
import DataSources from './DataSources.jsx';
import IssTrackerPanel from './IssTrackerPanel.jsx';
import { ACTIVITY_LABEL } from '../lib/constants.js';
import { HERO_TEXT, STATUS_TEXT } from '../lib/education.js';
import {
  gaugeFor, hrLevel, spo2Level, tempLevel, respLevel, sysLevel, hrvLevel,
  co2Level, pressureLevel, doseLevel,
} from '../lib/status.js';
import { bpText, crewLevel, formatHour, num } from '../lib/format.js';
import { buildInsights } from '../lib/insights.js';
import { getVitalBaselineInfo } from '../lib/baseline.js';

// The astronaut's own screen: how am I, what do I need to do, what does it mean.
export default function MyHealth({ tele, sw, issProps, youId, setYouId, beginner }) {
  const { world, alerts } = tele;
  const { snap, profile, tasks } = world;
  const c = snap.crew.find((x) => x.id === youId);
  const e = snap.env;
  const view = tasks.view(youId, snap);
  const level = crewLevel(alerts, youId);
  const cabinAlert = alerts.filter((a) => a.crew === null).reduce((m, a) => Math.max(m, a.level), 0);
  const overall = Math.max(level, cabinAlert);
  const lost = c.lost;

  const hr = hrLevel(c.v.hr, c.act, c.max).level;
  const vitals = [
    { id: 'hr', raw: lost ? null : c.v.hr, display: lost ? '—' : num(c.v.hr), level: hr, spec: gaugeFor('hr', c), baseline: getVitalBaselineInfo(youId, 'hr', c.v.hr) },
    { id: 'spo2', raw: lost ? null : c.v.spo2, display: lost ? '—' : num(c.v.spo2, 1), level: spo2Level(c.v.spo2), spec: gaugeFor('spo2', c), baseline: getVitalBaselineInfo(youId, 'spo2', c.v.spo2) },
    { id: 'temp', raw: lost ? null : c.v.temp, display: lost ? '—' : num(c.v.temp, 1), level: tempLevel(c.v.temp), spec: gaugeFor('temp', c), baseline: getVitalBaselineInfo(youId, 'temp', c.v.temp) },
    { id: 'resp', raw: lost ? null : c.v.resp, display: lost ? '—' : num(c.v.resp), level: respLevel(c.v.resp), spec: gaugeFor('resp', c), baseline: getVitalBaselineInfo(youId, 'resp', c.v.resp) },
    { id: 'bp', raw: lost ? null : c.v.sys, display: bpText(c), level: sysLevel(c.v.sys), spec: gaugeFor('sys', c), baseline: getVitalBaselineInfo(youId, 'bp', c.v.sys) },
    { id: 'hrv', raw: lost ? null : c.v.hrv, display: lost ? '—' : num(c.v.hrv), level: c.v.hrv != null ? hrvLevel(c.v.hrv) : 0, spec: gaugeFor('hrv', c), baseline: getVitalBaselineInfo(youId, 'hrv', c.v.hrv) },
  ];
  const cabin = [
    { id: 'co2', raw: e.co2, display: num(e.co2, 1), level: co2Level(e.co2), spec: gaugeFor('co2') },
    { id: 'pressure', raw: e.pressure, display: num(e.pressure, 1), level: pressureLevel(e.pressure), spec: gaugeFor('pressure') },
    { id: 'dose', raw: e.dose, display: num(e.dose), level: doseLevel(e.dose), spec: gaugeFor('dose') },
  ];

  const long = world.long.metrics(youId);
  const triageCtx = {
    co2: co2Level(e.co2), co2v: e.co2, fever: tempLevel(c.v.temp),
    vision: long.vision.level, muscle: long.muscle.level, hydration: long.hydration.level, sleep: long.sleep.level,
    immune: long.immune?.level ?? 0,
  };
  const insights = buildInsights({ snap, crewId: youId, profile, alerts });
  const mineAlerts = alerts.filter((a) => a.crew === youId || a.crew === null);
  const [tab, setTab] = useState('vitals');

  const TABS = [
    { id: 'vitals', label: 'Vitals & Cabin', icon: '📊' },
    { id: 'routine', label: `Routine & XP${view.due.length > 0 ? ` (${view.due.length} due)` : ''}`, icon: '📋' },
    { id: 'assessments', label: 'Clinical Assessments', icon: '🔬' },
    { id: 'trends', label: 'Mission Trends', icon: '📈' },
    { id: 'triage', label: `Triage & Comms${mineAlerts.length > 0 ? ` (${mineAlerts.length})` : ''}`, icon: '🩺' },
    { id: 'learn', label: 'Learn & Quiz', icon: '💡' },
    { id: 'sources', label: 'Data & Sources', icon: '🔗' },
    { id: 'all', label: 'All Panels', icon: '📑' },
  ];

  return (
    <div className="stack">
      <section className="hero" data-lv={overall} aria-live="polite">
        <div className="hero-id">
          <label className="k" htmlFor="you">Signed in as</label>
          <select id="you" value={youId} onChange={(ev) => setYouId(ev.target.value)}>
            {snap.crew.map((x) => <option key={x.id} value={x.id}>{x.name}, {x.role}</option>)}
          </select>
          <p className="k">{ACTIVITY_LABEL[c.act]} · {profile.name} · {profile.gravityLabel}</p>
        </div>
        <div className="hero-status">
          <StatusPill level={overall} label={HERO_TEXT[overall]} />
          <p>{lost ? 'Your sensor is not sending data. Reseat the patch.' : overall === 0 ? 'Your readings and the cabin are inside their usual ranges.' : STATUS_TEXT[overall]}</p>
        </div>
      </section>

      <SystemScores crew={c} env={e} long={long} alerts={alerts} />

      {mineAlerts.length > 0 && (
        <section className="panel alerts-inline" aria-label="Alerts for you">
          <h2>What needs your attention</h2>
          <ul>
            {mineAlerts.map((a) => (
              <li key={a.key} data-lv={a.level}>
                <StatusPill level={a.level} />
                <div style={{ flex: 1 }}>
                  <b>{a.title}</b> <span className="mono">{a.detail}</span>
                  {a.action ? (
                    <div style={{ marginTop: '4px', fontSize: '0.85rem', color: '#38bdf8' }}>
                      ✓ Action logged: {a.action.text} (Re-evaluating in {a.action.retestMinutes}m)
                    </div>
                  ) : (
                    <div style={{ marginTop: '6px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => tele.takeAction(a.key, 'Executed clinical countermeasure protocol', 30)}
                      >
                        Execute Protocol
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav aria-label="Astronaut Console Tabs" style={{ margin: '10px 0 6px 0' }}>
        <div className="seg" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              className="btn"
              aria-selected={tab === t.id}
              aria-pressed={tab === t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '6px 12px',
                fontSize: '0.85rem',
                fontWeight: tab === t.id ? 600 : 400,
              }}
            >
              <span style={{ marginRight: '5px' }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {view.due.length > 0 && tab !== 'routine' && tab !== 'all' && (
        <button
          type="button" className="prompt"
          onClick={() => setTab('routine')}
        >
          <b>{view.due.length} {view.due.length === 1 ? 'task is' : 'tasks are'} due now</b>
          <span>{view.due.slice(0, 3).map((t) => t.title).join(', ')}. Tap to open today’s routine.</span>
        </button>
      )}

      {(tab === 'vitals' || tab === 'all') && (
        <>
          <section aria-label="Your vitals">
            <h2 className="section-title">Your vitals</h2>
            <div className="vitals">
              {vitals.map((v) => <VitalCard key={v.id} {...v} beginner={beginner} />)}
            </div>
          </section>

          <section aria-label="Live charts">
            <h2 className="section-title">How they are changing (Live 90-min Telemetry)</h2>
            <VitalCharts crew={c} />
            <p className="note">The last 90 minutes. The green band is your usual range and dashed lines mark where status changes. A gap in a line means the sensor stopped sending.</p>
          </section>

          <section aria-label="The air around you">
            <h2 className="section-title">The air and radiation around you</h2>
            <div className="vitals three">
              {cabin.map((v) => <VitalCard key={v.id} {...v} beginner={beginner} />)}
            </div>
            <p className="note">Cabin temperature {num(e.temp, 1)} °C, humidity {num(e.hum)} %, clock {formatHour(snap.hour)}.</p>
          </section>

          {issProps && (
            <IssLivePanel
              iss={issProps.iss} enabled={issProps.issEnabled} setEnabled={issProps.setIssEnabled}
              isStation={issProps.isStation} onGoStation={issProps.goStation}
            />
          )}

          {issProps?.isStation && <IssTrackerPanel active={tab === 'vitals' || tab === 'all'} />}

          {sw && <SpaceWeatherPanel sw={sw} onSimulateStorm={() => tele.scenario('spe')} />}
        </>
      )}

      {(tab === 'routine' || tab === 'all') && (
        <div className="two" id="routine">
          <TaskPanel view={view} onComplete={tele.completeTask} beginner={beginner} />
          <GamePanel
            progress={tasks.progress(youId)} view={view}
            board={tasks.leaderboard(snap)} team={tasks.team(snap)}
            feed={tasks.feed} youId={youId}
          />
        </div>
      )}

      {(tab === 'assessments' || tab === 'all') && (
        <>
          <ReactionTest onComplete={(res) => tele.completeTask('pvt', res.score)} beginner={beginner} />
          <ImmunePanel immuneData={long.immune?.data} beginner={beginner} />
        </>
      )}

      {(tab === 'trends' || tab === 'all') && (
        <>
          <TrendsPanel crewId={youId} beginner={beginner} />
          <LongTermPanel metrics={long} beginner={beginner} />
        </>
      )}

      {(tab === 'triage' || tab === 'all') && (
        <div className="two">
          <InsightsPanel insights={insights} />
          <TriagePanel ctx={triageCtx} profile={profile} />
        </div>
      )}

      {(tab === 'sources' || tab === 'all') && issProps && (
        <DataSources iss={issProps.iss} issEnabled={issProps.issEnabled && issProps.isStation} sw={sw} />
      )}

      {(tab === 'learn' || tab === 'all') && (
        <LearnPanel profile={profile} quiz={tasks.quizToday(youId)} onAnswer={tele.answerQuiz} />
      )}
    </div>
  );
}
