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
      className={`bubbly-card rounded-[24px] p-5 space-y-2 relative overflow-hidden transition-all duration-200 ${
        onClick
          ? 'cursor-pointer hover:border-[#8C6642] hover:shadow-[0_8px_30px_rgba(91,68,43,0.12)] hover:-translate-y-0.5'
          : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-[#82776A] truncate uppercase tracking-wider">{title}</p>
          <div className="mt-1.5 flex items-baseline gap-2.5 flex-wrap">
            <span className="text-3xl font-bold tracking-tight text-[#30291F] font-serif truncate break-all">
              {value}
            </span>
            {trend && (
              <span
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                  trend.isPositive
                    ? 'bg-[#47765B]/10 text-[#47765B] border-[#47765B]/20'
                    : 'bg-[#B85C4A]/10 text-[#B85C4A] border-[#B85C4A]/20'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-[#82776A] truncate">{subtitle}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2.5 shrink-0">
          <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-[#FAF5EE] border border-[#E8DACB] text-[#8C6642] shadow-2xs">
            <Icon className="w-5 h-5" />
          </div>
          {badge && (
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border shadow-2xs ${
                badge.variant === 'success'
                  ? 'bg-[#47765B]/10 text-[#47765B] border-[#47765B]/25'
                  : badge.variant === 'warning'
                  ? 'bg-[#B78343]/10 text-[#B78343] border-[#B78343]/25'
                  : badge.variant === 'danger'
                  ? 'bg-[#B85C4A]/10 text-[#B85C4A] border-[#B85C4A]/25'
                  : badge.variant === 'info'
                  ? 'bg-[#EFF5FA] text-[#2C6288] border-[#CCE0EE]'
                  : 'bg-white/80 text-[#82776A] border-white/90'
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
