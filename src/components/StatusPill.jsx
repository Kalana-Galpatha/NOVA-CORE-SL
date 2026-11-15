import { LEVELS } from '../lib/constants.js';

// Colour is never the only signal: the pill always carries a word as well.
export default function StatusPill({ level, label }) {
  const text = label ?? (level === 'n' ? 'No signal' : LEVELS[level]);
  return (
    <span className="pill" data-lv={level}>
      <i aria-hidden="true" />
      <em>{text}</em>
    </span>
  );
}
