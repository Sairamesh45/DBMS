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
      className={`relative overflow-hidden rounded-xl border border-slate-800/90 bg-slate-900/60 p-4 backdrop-blur-md transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-cyan-500/40 hover:bg-slate-900/80 hover:shadow-lg hover:shadow-cyan-950/20' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-400 truncate">{title}</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-100 font-mono">
              {value}
            </span>
            {trend && (
              <span
                className={`text-xs font-mono font-medium ${
                  trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-400 truncate">{subtitle}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-950/50 border border-cyan-800/30 text-cyan-400">
            <Icon className="w-5 h-5" />
          </div>
          {badge && (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${
                badge.variant === 'success'
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                  : badge.variant === 'warning'
                  ? 'bg-amber-950/60 text-amber-300 border-amber-500/30'
                  : badge.variant === 'danger'
                  ? 'bg-rose-950/60 text-rose-300 border-rose-500/30'
                  : badge.variant === 'info'
                  ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {badge.text}
            </span>
          )}
        </div>
      </div>

      {/* Decorative cyber ambient bottom line */}
      <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
    </div>
  );
};
