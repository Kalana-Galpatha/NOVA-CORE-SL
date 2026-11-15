import VitalChart from './VitalChart.jsx';
import { hrLimits } from '../lib/status.js';

// The three live charts for one crew member.
export default function VitalCharts({ crew }) {
  const { hi } = hrLimits(crew.act, crew.max);
  return (
    <div className="charts">
      <VitalChart
        title="Heart rate" unit="bpm" data={crew.hist.hr}
        domain={[40, Math.max(180, Math.ceil(hi[2] + 10))]}
        band={[50, hi[0]]}
        limits={[{ y: hi[1], level: 2 }, { y: hi[2], level: 3 }]}
      />
      <VitalChart
        title="Blood oxygen" unit="%" data={crew.hist.spo2} decimals={1}
        domain={[86, 100]} band={[95, 100]}
        limits={[{ y: 93, level: 2 }, { y: 90, level: 3 }]}
      />
      <VitalChart
        title="Core temperature" unit="°C" data={crew.hist.temp} decimals={1}
        domain={[36, 39.5]} band={[36.1, 37.8]}
        limits={[{ y: 38.3, level: 2 }, { y: 39, level: 3 }]}
      />
    </div>
  );
}
