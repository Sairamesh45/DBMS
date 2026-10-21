import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  CheckCircle2,
  Clock,
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
      <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-[#f2f7f3] border border-[#c6dcce] text-[#2d6e42] ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#2d6e42] animate-pulse" />
        Active
      </span>
    );
  }
  if (status === 'Critical') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-[#fdf3f3] border border-[#f5cacc] text-[#9e2a2b] ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#9e2a2b]" />
        Critical
      </span>
    );
  }
  if (status === 'Observation') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-[#fdf8f0] border border-[#f2dfbe] text-[#b58550] ${sizeClasses}`}>
        <Radio className="w-3 h-3 text-[#b58550]" />
        Observation
      </span>
    );
  }
  if (status === 'Inactive') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-[#f5efeb] border border-[#e6dfd5] text-[#78716c] ${sizeClasses}`}>
        Inactive
      </span>
    );
  }

  // Sensor Authentication Status
  if (status === 'Authenticated') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-lg font-medium bg-[#f2f7f3] border border-[#c6dcce] text-[#2d6e42] ${sizeClasses}`}>
        <ShieldCheck className="w-3.5 h-3.5 text-[#2d6e42]" />
        Authenticated
      </span>
    );
  }
  if (status === 'Pending Challenge') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-lg font-medium bg-[#fdf8f0] border border-[#f2dfbe] text-[#b58550] ${sizeClasses}`}>
        <Clock className="w-3.5 h-3.5 text-[#b58550]" />
        Pending Challenge
      </span>
    );
  }
  if (status === 'Failed Challenge' || status === 'Quarantined' || status === 'Blocked') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-lg font-medium bg-[#fdf3f3] border border-[#f5cacc] text-[#9e2a2b] ${sizeClasses}`}>
        <ShieldX className="w-3.5 h-3.5 text-[#9e2a2b]" />
        {status}
      </span>
    );
  }

  // Anchoring Status
  if (status === 'Anchored') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-lg font-medium bg-[#f5efeb] border border-[#d8cfc2] text-[#8c6d46] ${sizeClasses}`}>
        <CheckCircle2 className="w-3.5 h-3.5 text-[#8c6d46]" />
        Anchored
      </span>
    );
  }
  if (status === 'Priority Anchored') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-lg font-bold bg-[#fdf3f3] border border-[#f5cacc] text-[#9e2a2b] ${sizeClasses}`}>
        <ShieldAlert className="w-3.5 h-3.5 text-[#9e2a2b]" />
        Priority Anchored
      </span>
    );
  }
  if (status === 'Pending Batch') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-lg font-medium bg-[#fdf8f0] border border-[#f2dfbe] text-[#b58550] ${sizeClasses}`}>
        <Clock className="w-3.5 h-3.5 text-[#b58550]" />
        Pending Batch
      </span>
    );
  }

  // Access Control Status
  if (status === 'Approved') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-lg font-medium bg-[#f2f7f3] border border-[#c6dcce] text-[#2d6e42] ${sizeClasses}`}>
        <CheckCircle2 className="w-3.5 h-3.5 text-[#2d6e42]" />
        Approved
      </span>
    );
  }
  if (status === 'Pending') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-lg font-medium bg-[#fdf8f0] border border-[#f2dfbe] text-[#b58550] ${sizeClasses}`}>
        <Clock className="w-3.5 h-3.5 text-[#b58550]" />
        Pending Review
      </span>
    );
  }
  if (status === 'Rejected' || status === 'Revoked') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-lg font-medium bg-[#fdf3f3] border border-[#f5cacc] text-[#9e2a2b] ${sizeClasses}`}>
        {status}
      </span>
    );
  }

  // Gateway Decisions
  if (status.includes('Normal')) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-lg font-medium bg-[#f2f7f3] border border-[#c6dcce] text-[#2d6e42] ${sizeClasses}`}>
        <CheckCircle2 className="w-3.5 h-3.5 text-[#2d6e42]" />
        {status}
      </span>
    );
  }
  if (status.includes('Poor Signal')) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-lg font-medium bg-[#fdf8f0] border border-[#f2dfbe] text-[#b58550] ${sizeClasses}`}>
        <AlertTriangle className="w-3.5 h-3.5 text-[#b58550]" />
        {status}
      </span>
    );
  }
  if (status.includes('Abnormal') || status.includes('Unauthorized') || status.includes('Repeated')) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-lg font-bold bg-[#fdf3f3] border border-[#f5cacc] text-[#9e2a2b] ${sizeClasses}`}>
        <ShieldAlert className="w-3.5 h-3.5 text-[#9e2a2b]" />
        {status}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center rounded-lg font-medium bg-[#faf7f2] border border-[#e6dfd5] text-[#2c2623] ${sizeClasses}`}>
      {status}
    </span>
  );
};
