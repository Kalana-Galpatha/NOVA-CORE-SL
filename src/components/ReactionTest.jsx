import { useState, useRef, useEffect, useCallback } from 'react';
import { scorePVT } from '../lib/pvt.js';
import StatusPill from './StatusPill.jsx';

export default function ReactionTest({ onComplete, initialResult = null, beginner = true }) {
  const [state, setState] = useState('idle'); // idle | waiting | ready | trial_done | finished
  const [trials, setTrials] = useState([]);
  const [currentTrial, setCurrentTrial] = useState(0);
  const [targetCount] = useState(5); // 5 rapid trials for smooth demo experience
  const [message, setMessage] = useState('Press Start when ready for your cognitive alertness check.');
  const [lastRT, setLastRT] = useState(null);
  const [result, setResult] = useState(initialResult);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const animFrameRef = useRef(null);
  const [displayMs, setDisplayMs] = useState(0);

  const startNextTrial = useCallback((trialNum) => {
    setState('waiting');
    setMessage('Wait for the red stimulus... Do not tap early.');
    setDisplayMs(0);
    setLastRT(null);

    // Random wait between 1.5s and 4.0s
    const delay = 1500 + Math.random() * 2500;
    timerRef.current = setTimeout(() => {
      startTimeRef.current = performance.now();
      setState('ready');
      setMessage('TAP NOW!');

      const updateClock = () => {
        if (startTimeRef.current) {
          setDisplayMs(Math.round(performance.now() - startTimeRef.current));
          animFrameRef.current = requestAnimationFrame(updateClock);
        }
      };
      animFrameRef.current = requestAnimationFrame(updateClock);
    }, delay);
  }, []);

  const handleStart = () => {
    setTrials([]);
    setCurrentTrial(1);
    setResult(null);
    startNextTrial(1);
  };

  const handleArenaClick = () => {
    if (state === 'idle') {
      handleStart();
      return;
    }

    if (state === 'waiting') {
      // False start / anticipation
      if (timerRef.current) clearTimeout(timerRef.current);
      setState('trial_done');
      setLastRT(50);
      setMessage('False start! You tapped before the stimulus.');
      const newTrials = [...trials, 50];
      setTrials(newTrials);

      setTimeout(() => {
        if (currentTrial < targetCount) {
          setCurrentTrial((c) => c + 1);
          startNextTrial(currentTrial + 1);
        } else {
          finishTest(newTrials);
        }
      }, 1200);
      return;
    }

    if (state === 'ready') {
      const rt = Math.round(performance.now() - startTimeRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      startTimeRef.current = null;
      setDisplayMs(rt);
      setLastRT(rt);
      setState('trial_done');

      let commentary = rt < 250 ? 'Excellent reaction time!' : rt < 350 ? 'Good speed.' : rt >= 500 ? 'Lapse detected (>500ms).' : 'Acceptable.';
      setMessage(`${rt} ms — ${commentary}`);
      const newTrials = [...trials, rt];
      setTrials(newTrials);

      setTimeout(() => {
        if (currentTrial < targetCount) {
          setCurrentTrial((c) => c + 1);
          startNextTrial(currentTrial + 1);
        } else {
          finishTest(newTrials);
        }
      }, 1000);
    }
  };

  const finishTest = (finalTrials) => {
    setState('finished');
    const scored = scorePVT(finalTrials);
    setResult(scored);
    if (onComplete) {
      onComplete(scored);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <section className="panel" aria-label="Psychomotor Vigilance Test">
      <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Behavioral Alertness: PVT Reaction Test</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--muted, #94a3b8)' }}>
            NASA standard assessment for spaceflight micro-sleep lapses and cognitive degradation.
          </p>
        </div>
        {result && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <StatusPill level={result.level} label={result.status} />
            <span className="mono" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{result.score}% Readiness</span>
          </div>
        )}
      </div>

      <div style={{ marginTop: '16px' }}>
        {state !== 'finished' ? (
          <div>
            <div
              onClick={handleArenaClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') handleArenaClick(); }}
              style={{
                height: '150px',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'background 0.15s ease, border-color 0.15s ease',
                border: state === 'ready' ? '3px solid #ef4444' : state === 'waiting' ? '2px dashed #f59e0b' : '2px solid rgba(255,255,255,0.15)',
                background: state === 'ready' ? 'rgba(239, 68, 68, 0.25)' : state === 'waiting' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255,255,255,0.03)',
              }}
            >
              {state === 'idle' && (
                <div style={{ textAlign: 'center' }}>
                  <b style={{ fontSize: '1.2rem', color: '#38bdf8' }}>Click or Press Space to Begin</b>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: 'var(--muted, #94a3b8)' }}>5-trial rapid assessment</p>
                </div>
              )}
              {state === 'waiting' && (
                <div style={{ textAlign: 'center', color: '#f59e0b' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Get Ready...</span>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>Do not tap yet</p>
                </div>
              )}
              {state === 'ready' && (
                <div style={{ textAlign: 'center', color: '#ef4444' }}>
                  <span className="mono" style={{ fontSize: '2.5rem', fontWeight: 800 }}>{displayMs} ms</span>
                  <p style={{ margin: '2px 0 0 0', fontSize: '1rem', fontWeight: 'bold' }}>TAP NOW!</p>
                </div>
              )}
              {state === 'trial_done' && (
                <div style={{ textAlign: 'center' }}>
                  <span className="mono" style={{ fontSize: '1.8rem', fontWeight: 700, color: lastRT < 100 ? '#ef4444' : lastRT > 500 ? '#f59e0b' : '#34d399' }}>
                    {lastRT < 100 ? 'FALSE START' : `${lastRT} ms`}
                  </span>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--muted, #94a3b8)' }}>
                    Round {currentTrial} of {targetCount}
                  </p>
                </div>
              )}
            </div>

            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--muted, #94a3b8)' }}>
              <span>{message}</span>
              {currentTrial > 0 && <span>Progress: {trials.length}/{targetCount}</span>}
            </div>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', textAlign: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted, #94a3b8)' }}>Mean Speed</span>
                <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '4px' }}>{result.meanRT} ms</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted, #94a3b8)' }}>Lapses (&gt;500ms)</span>
                <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '4px', color: result.lapses > 0 ? '#ef4444' : '#34d399' }}>{result.lapses}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted, #94a3b8)' }}>Fastest RT</span>
                <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '4px' }}>{result.fastest} ms</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted, #94a3b8)' }}>EVA / Docking Status</span>
                <div style={{ fontSize: '0.95rem', fontWeight: 'bold', marginTop: '6px', color: result.evaEligible ? '#34d399' : '#ef4444' }}>
                  {result.evaEligible ? 'CLEARED' : 'RESTRICTED'}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '12px', padding: '10px', borderRadius: '6px', background: result.evaEligible ? 'rgba(52, 211, 153, 0.08)' : 'rgba(239, 68, 68, 0.08)', borderLeft: `4px solid ${result.evaEligible ? '#34d399' : '#ef4444'}` }}>
              <p style={{ margin: 0, fontSize: '0.88rem' }}>{result.recommendation}</p>
            </div>

            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn" onClick={handleStart}>Re-test</button>
            </div>
          </div>
        )}
      </div>

      {beginner && (
        <details style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--muted, #94a3b8)' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 500 }}>Why astronauts take the PVT</summary>
          <p style={{ marginTop: '6px', lineHeight: '1.4' }}>
            In confined spacecraft, cumulative sleep debt and circadian misalignment cause micro-sleeps where your brain fails to register signals for half a second or more. On Earth, this causes highway crashes; in space, it can cause catastrophic errors during spacewalks (EVA) or manual thruster dockings.
          </p>
        </details>
      )}
    </section>
  );
}
