import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface TrustRadarChartProps {
  dt: number;
  sq: number;
  av: number;
  tc: number;
  ph: number;
  height?: number;
}

export const TrustRadarChart: React.FC<TrustRadarChartProps> = ({
  dt,
  sq,
  av,
  tc,
  ph,
  height = 240,
}) => {
  const data = [
    { dimension: 'Device Trust (DT)', score: dt, fullMark: 100 },
    { dimension: 'Signal Quality (SQ)', score: sq, fullMark: 100 },
    { dimension: 'Physiological Norm (AV)', score: av, fullMark: 100 },
    { dimension: 'Temporal Consist. (TC)', score: tc, fullMark: 100 },
    { dimension: 'Patient Baseline (PH)', score: ph, fullMark: 100 },
  ];

  return (
    <div className="w-full flex items-center justify-center" style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
          <PolarGrid stroke="#1e293b" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: '#64748b', fontSize: 9 }}
            stroke="#334155"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderColor: '#06b6d4',
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: 'monospace',
            }}
            formatter={(value: any) => [`${value} / 100`, 'Score']}
          />
          <Radar
            name="Trust Vector"
            dataKey="score"
            stroke="#06b6d4"
            fill="#0891b2"
            fillOpacity={0.4}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
