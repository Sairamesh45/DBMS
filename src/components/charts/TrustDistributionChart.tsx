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
    { range: 'High Trust (90-100)', count: 0, color: '#10b981' },
    { range: 'Good (75-89)', count: 0, color: '#06b6d4' },
    { range: 'Degraded (50-74)', count: 0, color: '#f59e0b' },
    { range: 'Quarantined (<50)', count: 0, color: '#ef4444' },
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
            tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
            interval={0}
            angle={-10}
            textAnchor="end"
            stroke="#1e293b"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: '#64748b', fontSize: 10 }}
            stroke="#1e293b"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderColor: '#1e293b',
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: 'monospace',
            }}
            formatter={(value: any) => [`${value} Sensors`, 'Count']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {buckets.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
