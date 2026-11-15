import { useEffect, useRef, useState } from 'react';
import { askAssistant, STARTERS, GEMINI_DEFAULT_MODEL, resolveGeminiModel, OLLAMA_DEFAULT_URL, OLLAMA_DEFAULT_MODEL } from '../lib/chatbot.js';

export default function ChatBot({ tele, sw, youId }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Settings & credentials persisted in localStorage
  const [apiKey, setApiKey] = useState(() => {
    return (typeof localStorage !== 'undefined' ? localStorage.getItem('crew_vitals_gemini_api_key') : '')
      || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY)
      || '';
  });
  const [mode, setMode] = useState(() => {
    return (typeof localStorage !== 'undefined' ? localStorage.getItem('crew_vitals_chat_mode') : '') || 'auto';
  });
  const [model, setModel] = useState(() => {
    return resolveGeminiModel(typeof localStorage !== 'undefined' ? localStorage.getItem('crew_vitals_gemini_model') : '');
  });
  const [ollamaUrl, setOllamaUrl] = useState(() => (typeof localStorage !== 'undefined' ? localStorage.getItem('crew_vitals_ollama_url') : '') || OLLAMA_DEFAULT_URL);
  const [ollamaModel, setOllamaModel] = useState(() => (typeof localStorage !== 'undefined' ? localStorage.getItem('crew_vitals_ollama_model') : '') || OLLAMA_DEFAULT_MODEL);
  const [tempKey, setTempKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);

  const [msgs, setMsgs] = useState([
    {
      from: 'bot',
      level: 0,
      text: 'I am your Aerospace Health Assistant. Ask about your vitals, cabin air, symptoms, sleep, diet, exercise, or space adaptation. I provide operational decision support and never diagnose.',
      chips: STARTERS,
      isOnline: false,
    },
  ]);

  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [msgs, open, isThinking]);

  useEffect(() => {
    if (open && !settingsOpen) inputRef.current?.focus();
  }, [open, settingsOpen]);

  const handleSaveSettings = (ev) => {
    ev.preventDefault();
    const cleanKey = tempKey.trim();
    setApiKey(cleanKey);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('crew_vitals_gemini_api_key', cleanKey);
      localStorage.setItem('crew_vitals_chat_mode', mode);
      localStorage.setItem('crew_vitals_gemini_model', model);
      localStorage.setItem('crew_vitals_ollama_url', ollamaUrl.trim() || OLLAMA_DEFAULT_URL);
      localStorage.setItem('crew_vitals_ollama_model', ollamaModel.trim() || OLLAMA_DEFAULT_MODEL);
    }
    setSettingsOpen(false);
  };

  const handleClearKey = () => {
    setTempKey('');
    setApiKey('');
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('crew_vitals_gemini_api_key');
    }
  };

  const ask = async (q) => {
    const question = q.trim();
    if (!question || isThinking) return;

    const { world, alerts } = tele;
    const ctx = {
      snap: world.snap,
      youId,
      alerts: alerts || [],
      profile: world.profile,
      long: world.long.metrics(youId),
      view: world.tasks.view(youId, world.snap),
      spaceWeather: sw?.summary ? { text: sw.summary.text, level: sw.summary.level } : null,
    };

    // Add user message immediately
    setMsgs((m) => [...m, { from: 'user', text: question }]);
    setText('');
    setIsThinking(true);

    try {
      const r = await askAssistant(question, ctx, {
        apiKey,
        mode,
        model,
        ollamaUrl,
        ollamaModel,
        history: msgs.slice(-4),
      });
      setMsgs((m) => [...m, { from: 'bot', ...r }]);
    } catch {
      setMsgs((m) => [
        ...m,
        {
          from: 'bot',
          level: 2,
          text: 'An unexpected error occurred while processing your request. Please check your telemetry sensors or try asking again.',
          chips: STARTERS,
          isOnline: false,
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const last = msgs[msgs.length - 1];
  const isLocalAI = mode === 'ollama';
  const isOnlineActive = mode !== 'offline' && !isLocalAI && Boolean(apiKey);

  if (!open) {
    return (
      <button
        type="button"
        className="chat-fab"
        onClick={() => setOpen(true)}
        aria-label="Open aerospace health assistant"
      >
        ✦ Ask Health Assistant
      </button>
    );
  }

  return (
    <aside className="chat" aria-label="Aerospace health assistant">
      <header className="chat-head">
        <h2>
          <span>Health Assistant</span>
          <span className={`chat-status-pill ${isOnlineActive ? 'online' : 'offline'}`} title={isOnlineActive ? 'Online AI Connected (Gemini)' : isLocalAI ? 'Local AI model (Ollama)' : 'Offline Local Telemetry Engine'}>
            <span style={{ fontSize: '7px' }}>●</span> {isOnlineActive ? 'AI Online' : isLocalAI ? 'Local AI' : 'Local Engine'}
          </span>
        </h2>
        <div className="chat-head-actions">
          <button
            type="button"
            className="btn sm"
            onClick={() => {
              setTempKey(apiKey);
              setSettingsOpen(!settingsOpen);
            }}
            title="Chat settings & AI API key"
            aria-label="Settings"
          >
            ⚙️
          </button>
          <button
            type="button"
            className="btn sm"
            onClick={() => setOpen(false)}
            aria-label="Close health assistant"
          >
            ✕
          </button>
        </div>
      </header>

      {settingsOpen && (
        <form className="chat-settings-pane" onSubmit={handleSaveSettings}>
          <div>
            <strong>Chatbot Configuration</strong>
            <p style={{ margin: '2px 0 6px 0', opacity: 0.8, fontSize: '11px' }}>
              Connect Google Gemini for online medical Q&A, or run 100% offline using the onboard aerospace engine.
            </p>
          </div>

          <label>
            Mode:
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="auto">Auto (Gemini online → Local AI → Onboard engine)</option>
              <option value="online">Online AI Only (Gemini)</option>
              <option value="offline">Local Telemetry Engine Only (Offline)</option>
              <option value="ollama">Local AI Model (Ollama, offline)</option>
            </select>
          </label>

          {(mode === 'ollama' || mode === 'auto') && (
            <>
              <label>
                Ollama URL:
                <input value={ollamaUrl} onChange={(e) => setOllamaUrl(e.target.value)} placeholder={OLLAMA_DEFAULT_URL} />
              </label>
              <label>
                Ollama model:
                <input value={ollamaModel} onChange={(e) => setOllamaModel(e.target.value)} placeholder={OLLAMA_DEFAULT_MODEL} />
              </label>
              <p style={{ margin: 0, opacity: 0.8, fontSize: '11px' }}>
                Run <code>ollama pull {ollamaModel || OLLAMA_DEFAULT_MODEL}</code> once, then keep Ollama running.
              </p>
            </>
          )}

          <label>
            Gemini API Key:
            <div style={{ display: 'flex', gap: '4px' }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                placeholder="AIzaSy..."
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn sm"
                onClick={() => setShowKey(!showKey)}
                title="Toggle key visibility"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <label>
            Model:
            <input
              list="gemini-models"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={GEMINI_DEFAULT_MODEL}
            />
            <datalist id="gemini-models">
              <option value="gemini-3.8-flash">Fast, recommended</option>
              <option value="gemini-3.5-flash-lite">Cheapest and fastest</option>
              <option value="gemini-3.1-pro-preview">Most capable (preview)</option>
            </datalist>
          </label>

          <div className="actions">
            <button
              type="button"
              className="btn sm"
              onClick={handleClearKey}
              style={{ background: 'transparent', borderColor: 'var(--line)', opacity: 0.7 }}
            >
              Clear Key
            </button>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                className="btn sm"
                onClick={() => setSettingsOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn sm primary">
                Save Settings
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="chat-log" role="log" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`bubble ${m.from}`} data-lv={m.from === 'bot' ? m.level : undefined}>
            <div>{m.text}</div>
            {m.from === 'bot' && (
              <span className="bubble-meta">
                {m.isOnline ? '✦ Gemini AI Online' : m.isLocalAI ? '🖥️ Local AI (Ollama)' : m.source === 'scenario' ? '🧪 What-if Scenario Protocol (offline)' : m.source === 'dataset' ? '📡 Offline Dataset Engine' : '📡 Onboard Telemetry Engine'}
              </span>
            )}
          </div>
        ))}
        {isThinking && (
          <div className="chat-typing" aria-label="Thinking">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        )}
        <div ref={endRef} />
      </div>

      {!isThinking && last.from === 'bot' && last.chips?.length > 0 && (
        <div className="chat-chips">
          {last.chips.map((c) => (
            <button key={c} type="button" className="btn sm" onClick={() => ask(c)}>
              {c}
            </button>
          ))}
        </div>
      )}

      <form
        className="chat-form"
        onSubmit={(ev) => {
          ev.preventDefault();
          ask(text);
        }}
      >
        <input
          ref={inputRef}
          value={text}
          onChange={(ev) => setText(ev.target.value)}
          placeholder={isOnlineActive ? 'Ask AI assistant (online)...' : isLocalAI ? 'Ask local AI assistant...' : 'Ask health assistant (local)...'}
          aria-label="Your question"
          maxLength={300}
          disabled={isThinking}
        />
        <button type="submit" className="btn primary" disabled={!text.trim() || isThinking}>
          {isThinking ? '...' : 'Send'}
        </button>
      </form>
    </aside>
  );
}
