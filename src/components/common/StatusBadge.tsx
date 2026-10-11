import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lock,
  Radio,
} from 'lucide-react';
import {
  AccessStatus,
  AnchoringStatus,
  AuthStatus,
  GatewayDecision,
  MonitoringStatus,
} from '../../types';

interface StatusBadgeProps {
  status: MonitoringStatus | AuthStatus | AnchoringStatus | GatewayDecision | AccessStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const isSm = size === 'sm';
  const sizeClasses = isSm ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  // Monitoring Status
  if (status === 'Active') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-emerald-50 border border-emerald-200 text-emerald-700 ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Active
      </span>
    );
  }
  if (status === 'Critical') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-rose-50 border border-rose-200 text-rose-700 ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
        Critical
      </span>
    );
  }
  if (status === 'Observation') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-amber-50 border border-amber-200 text-amber-700 ${sizeClasses}`}>
        <Radio className="w-3 h-3 text-amber-600" />
        Observation
      </span>
    );
  }
  if (status === 'Inactive') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-slate-100 border border-slate-200 text-slate-600 ${sizeClasses}`}>
        Inactive
      </span>
    );
  }

  // Sensor Authentication Status
  if (status === 'Authenticated') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md font-medium bg-blue-50 border border-blue-200 text-blue-700 ${sizeClasses}`}>
        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
        Authenticated
      </span>
    );
  }
  if (status === 'Pending Challenge') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md font-medium bg-amber-50 border border-amber-200 text-amber-700 ${sizeClasses}`}>
        <Clock className="w-3.5 h-3.5 text-amber-600" />
        Pending Challenge
      </span>
    );
  }
  if (status === 'Failed Challenge' || status === 'Quarantined' || status === 'Blocked') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md font-medium bg-rose-50 border border-rose-200 text-rose-700 ${sizeClasses}`}>
        <ShieldX className="w-3.5 h-3.5 text-rose-600" />
        {status}
      </span>
    );
  }

  // Anchoring Status
  if (status === 'Anchored') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md font-medium bg-blue-50 border border-blue-200 text-blue-700 ${sizeClasses}`}>
        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
        Anchored
      </span>
    );
  }
  if (status === 'Priority Anchored') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md font-medium bg-purple-50 border border-purple-200 text-purple-700 ${sizeClasses}`}>
        <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
        Priority Anchored
      </span>
    );
  }
  if (status === 'Pending Batch') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md font-medium bg-slate-100 border border-slate-200 text-slate-700 ${sizeClasses}`}>
        <Clock className="w-3.5 h-3.5 text-slate-500" />
        Pending Batch
      </span>
    );
  }

  // Access Status
  if (status === 'Approved') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md font-medium bg-emerald-50 border border-emerald-200 text-emerald-700 ${sizeClasses}`}>
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        Approved
      </span>
    );
  }
  if (status === 'Pending') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md font-medium bg-amber-50 border border-amber-200 text-amber-700 ${sizeClasses}`}>
        <Clock className="w-3.5 h-3.5 text-amber-600" />
        Pending
      </span>
    );
  }
  if (status === 'Rejected' || status === 'Revoked') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md font-medium bg-rose-50 border border-rose-200 text-rose-700 ${sizeClasses}`}>
        <Lock className="w-3.5 h-3.5 text-rose-600" />
        {status}
      </span>
    );
  }

  // Gateway Decisions
  if (status.includes('Normal')) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md font-medium bg-emerald-50 border border-emerald-200 text-emerald-700 ${sizeClasses}`}>
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        {status}
      </span>
    );
  }
  if (status.includes('Poor Signal')) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md font-medium bg-amber-50 border border-amber-200 text-amber-700 ${sizeClasses}`}>
        <AlertTriangle className="w-3 h-3 text-amber-600" />
        {status}
      </span>
    );
  }
  if (status.includes('Abnormal') || status.includes('Repeated Anomaly')) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md font-medium bg-rose-50 border border-rose-200 text-rose-700 ${sizeClasses}`}>
        <ShieldAlert className="w-3 h-3 text-rose-600" />
        {status}
      </span>
    );
  }
  if (status.includes('Unauthorized')) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md font-medium bg-rose-50 border border-rose-200 text-rose-700 ${sizeClasses}`}>
        <ShieldX className="w-3 h-3 text-rose-600" />
        {status}
      </span>
    );
  }

  // Default fallback badge
  return (
    <span className={`inline-flex items-center gap-1 rounded-md font-medium bg-slate-100 border border-slate-200 text-slate-700 ${sizeClasses}`}>
      {status}
    </span>
  );
};
