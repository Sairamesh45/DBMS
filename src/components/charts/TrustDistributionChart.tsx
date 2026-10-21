import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface TrustDistributionChartProps {
  sensors: Array<{ id: string; deviceTrust: number; type: string }>;
  height?: number;
}

export const TrustDistributionChart: React.FC<TrustDistributionChartProps> = ({
  sensors,
  height = 200,
}) => {
  // Aggregate into buckets
  const buckets = [
    { range: 'High Trust (90-100)', count: 0, color: '#2d6e42' },
    { range: 'Good (75-89)', count: 0, color: '#8c6d46' },
    { range: 'Degraded (50-74)', count: 0, color: '#b58550' },
    { range: 'Quarantined (<50)', count: 0, color: '#9e2a2b' },
  ];

  sensors.forEach(s => {
    if (s.deviceTrust >= 90) buckets[0].count++;
    else if (s.deviceTrust >= 75) buckets[1].count++;
    else if (s.deviceTrust >= 50) buckets[2].count++;
    else buckets[3].count++;
  });

  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={buckets} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
          <XAxis
            dataKey="range"
            tick={{ fill: '#78716c', fontSize: 10, fontFamily: 'monospace' }}
            interval={0}
            angle={-10}
            textAnchor="end"
            stroke="#d8cfc2"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: '#78716c', fontSize: 10 }}
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
            formatter={(value: any) => [`${value} Sensors`, 'Count']}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {buckets.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
