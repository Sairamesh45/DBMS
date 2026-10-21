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
          <PolarGrid stroke="#e6dfd5" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: '#78716c', fontSize: 10, fontFamily: 'monospace' }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: '#78716c', fontSize: 9 }}
            stroke="#d8cfc2"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              borderColor: '#d8cfc2',
              borderRadius: '12px',
              fontSize: '12px',
              fontFamily: 'monospace',
              color: '#2c2623',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
            formatter={(value: any) => [`${value} / 100`, 'Score']}
          />
          <Radar
            name="Trust Vector"
            dataKey="score"
            stroke="#8c6d46"
            fill="#c89f70"
            fillOpacity={0.45}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
