import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceArea, ReferenceLine, Tooltip, ResponsiveContainer } from 'recharts';

const LV_COLOR = ['var(--ok)', 'var(--watch)', 'var(--caution)', 'var(--crit)'];

/**
 * Live line chart of the last 90 minutes.
 * band   [low, high] shaded green: the usual range
 * limits [{ y, level }] dashed lines coloured by severity
 * null values leave a gap in the line (sensor dropout), they are never joined.
 */
export default function VitalChart({ title, data, unit, domain, band, limits = [], decimals = 0 }) {
  const rows = data.map((v, i) => ({ m: i - data.length + 1, v }));
  const start = -(data.length - 1);
  const ticks = [-80, -60, -40, -20, 0].filter((t) => t >= start);
  return (
    <figure className="chart" aria-label={`${title}, last 90 minutes`}>
      <figcaption>{title}</figcaption>
      <ResponsiveContainer width="100%" height={176}>
        <LineChart data={rows} margin={{ top: 6, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          {band && <ReferenceArea y1={band[0]} y2={band[1]} fill="var(--ok)" fillOpacity={0.14} ifOverflow="hidden" />}
          {limits.map((l) => (
            <ReferenceLine key={`${l.y}-${l.level}`} y={l.y} stroke={LV_COLOR[l.level]} strokeDasharray="4 4" ifOverflow="hidden" />
          ))}
          <XAxis dataKey="m" type="number" domain={[start, 0]} ticks={ticks} tickFormatter={(m) => (m === 0 ? 'now' : `${m}m`)} stroke="var(--muted)" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
          <YAxis domain={domain} width={40} allowDecimals={decimals > 0} stroke="var(--muted)" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
          <Tooltip
            formatter={(v) => [`${Number(v).toFixed(decimals)} ${unit}`, title]}
            labelFormatter={(m) => (m === 0 ? 'Now' : `${-m} min ago`)}
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--fg)', fontSize: 12 }}
          />
          <Line type="monotone" dataKey="v" stroke="var(--accent)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}
