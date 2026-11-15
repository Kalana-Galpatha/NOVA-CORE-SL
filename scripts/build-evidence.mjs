// Compiles the real NASA data sets in dataset/real/ into src/data/evidence.json (used by the offline bot).
//   npm run evidence
// Inspiration4 serum panels (OSD-575 / LSDS-8) are summarised per crew member: each person's post-flight
// value is compared with THEIR OWN preflight average (L-92, L-44, L-3), then the median across the crew is kept.
// The Apollo AP005 and STS-46 DSO 484 numbers come from dataset/real/apollo_sts46_summary.json.
import fs from 'node:fs';
import path from 'node:path';

const dir = 'dataset/real';
const PRE = ['L-92', 'L-44', 'L-3'];
const POST = ['R+1', 'R+45', 'R+82', 'R+194'];

function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let q = false;
  const t = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < t.length; i += 1) {
    const ch = t[i];
    if (q) { if (ch === '"' && t[i + 1] === '"') { cell += '"'; i += 1; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i += 1; row.push(cell); cell = ''; if (row.some((x) => x !== '')) rows.push(row); row = []; }
    else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift();
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}
const read = (f) => parseCsv(fs.readFileSync(path.join(dir, f), 'utf8'));
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null; };
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const sig = (x) => (x == null ? null : Number(Number(x).toPrecision(4)));

/** rows -> { name: { unit, byCrew: { id: { timepoint: value } } } } */
function group(rows, nameKey, idKey, tpKey, valKey, unitKey) {
  const out = {};
  for (const r of rows) {
    const v = Number(r[valKey]);
    if (!Number.isFinite(v) || r[valKey] === '') continue;
    const o = (out[r[nameKey]] ??= { unit: r[unitKey] || '', byCrew: {} });
    ((o.byCrew[r[idKey]] ??= {})[r[tpKey]] = v);
  }
  return out;
}

function summarise(g) {
  const res = {};
  for (const [name, o] of Object.entries(g)) {
    const crew = Object.keys(o.byCrew);
    const pre = crew.map((c) => mean(PRE.map((t) => o.byCrew[c][t]).filter((x) => x != null))).filter((x) => x != null);
    const change = {}; const up = {}; const nn = {};
    for (const tp of POST) {
      const ch = []; let ups = 0;
      for (const c of crew) {
        const p = mean(PRE.map((t) => o.byCrew[c][t]).filter((x) => x != null));
        const v = o.byCrew[c][tp];
        if (p && v != null) { ch.push(((v - p) / p) * 100); if (v > p) ups += 1; }
      }
      change[tp] = ch.length ? r1(median(ch)) : null; up[tp] = ups; nn[tp] = ch.length;
    }
    res[name] = { unit: o.unit, preMean: sig(mean(pre)), change, crewUp: up, crewN: nn };
  }
  return res;
}

const immune = summarise(group(read('LSDS-8_Multiplex_serum.immune.EvePanel_SUBMITTED.csv'), 'Analyte', 'ID', 'Timepoint', 'Concentration', 'Unit'));
const cardio = summarise(group(read('LSDS-8_Multiplex_serum.cardiovascular.EvePanel_SUBMITTED.csv'), 'Analyte', 'ID', 'Timepoint', 'Concentration', 'Unit'));
const cmpRows = read('LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED.csv');
const cmp = summarise(group(cmpRows, 'ANALYTE', 'SUBJECT_ID', 'timepoint', 'VALUE', 'UNITS'));
for (const name of Object.keys(cmp)) {
  const rr = cmpRows.find((r) => r.ANALYTE === name);
  const lo = Number(rr.RANGE_MIN); const hi = Number(rr.RANGE_MAX);
  cmp[name].refMin = Number.isFinite(lo) ? lo : null; cmp[name].refMax = Number.isFinite(hi) ? hi : null;
}

const curated = JSON.parse(fs.readFileSync(path.join(dir, 'apollo_sts46_summary.json'), 'utf8'));
const tag = (o, group_) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { group: group_, ...v }]));
const evidence = {
  _generatedBy: 'scripts/build-evidence.mjs from dataset/real/ (do not edit by hand)',
  inspiration4: { ...curated.inspiration4, timepoints: { pre: PRE, post: POST } },
  biomarkers: { ...tag(immune, 'immune'), ...tag(cardio, 'inflammation') },
  metabolic: cmp,
  apollo: curated.apollo,
  sts46: curated.sts46,
};
fs.writeFileSync('src/data/evidence.json', JSON.stringify(evidence));
console.log(`evidence.json: ${Object.keys(immune).length} immune + ${Object.keys(cardio).length} inflammation markers, ${Object.keys(cmp).length} metabolic tests`);
for (const k of ['IL-6', 'CRP', 'TNFα', 'MCP-1']) console.log(' ', k, JSON.stringify(evidence.biomarkers[k]?.change), 'up', JSON.stringify(evidence.biomarkers[k]?.crewUp));
for (const k of ['GLUCOSE', 'BUN/CREATININE RATIO', 'SODIUM', 'POTASSIUM', 'CALCIUM']) console.log(' ', k, JSON.stringify(cmp[k].change), cmp[k].refMin, cmp[k].refMax);
