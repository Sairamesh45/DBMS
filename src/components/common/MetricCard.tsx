import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  };
  trend?: {
    value: string;
    isPositive: boolean;
  };
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  trend,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border border-[#e6dfd5] bg-white p-4 shadow-xs transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-[#8c6d46]/50 hover:shadow-sm' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[#78716c] truncate">{title}</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-[#2c2623] font-mono">
              {value}
            </span>
            {trend && (
              <span
                className={`text-xs font-mono font-medium ${
                  trend.isPositive ? 'text-[#2d6e42]' : 'text-[#9e2a2b]'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-[#78716c] truncate">{subtitle}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#f5efeb] border border-[#d8cfc2] text-[#8c6d46]">
            <Icon className="w-5 h-5" />
          </div>
          {badge && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                badge.variant === 'success'
                  ? 'bg-[#f2f7f3] text-[#2d6e42] border-[#c6dcce]'
                  : badge.variant === 'warning'
                  ? 'bg-[#fdf8f0] text-[#b58550] border-[#f2dfbe]'
                  : badge.variant === 'danger'
                  ? 'bg-[#fdf3f3] text-[#9e2a2b] border-[#f5cacc]'
                  : 'bg-[#faf7f2] text-[#78716c] border-[#e6dfd5]'
              }`}
            >
              {badge.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
