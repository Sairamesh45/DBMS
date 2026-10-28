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
  const sizeClasses = isSm ? 'px-2 py-0.5 text-[10px] font-semibold' : 'px-2.5 py-1 text-xs font-semibold';

  // Monitoring Status
  if (status === 'Active') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#47765B]/10 border border-[#47765B]/25 text-[#47765B] ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#47765B] animate-pulse" />
        Active
      </span>
    );
  }
  if (status === 'Critical') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#B85C4A]/10 border border-[#B85C4A]/25 text-[#B85C4A] ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#B85C4A] animate-ping" />
        Critical
      </span>
    );
  }
  if (status === 'Observation') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#B78343]/10 border border-[#B78343]/25 text-[#B78343] ${sizeClasses}`}>
        <Radio className="w-3 h-3 text-[#B78343]" />
        Observation
      </span>
    );
  }
  if (status === 'Inactive') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#82776A]/10 border border-[#82776A]/25 text-[#82776A] ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#82776A]" />
        Inactive
      </span>
    );
  }

  // Sensor Authentication Status
  if (status === 'Authenticated') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#47765B]/10 border border-[#47765B]/25 text-[#47765B] ${sizeClasses}`}>
        <ShieldCheck className="w-3.5 h-3.5 text-[#47765B]" />
        Authenticated
      </span>
    );
  }
  if (status === 'Pending Challenge') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#B78343]/10 border border-[#B78343]/25 text-[#B78343] ${sizeClasses}`}>
        <Clock className="w-3.5 h-3.5 text-[#B78343]" />
        Pending Challenge
      </span>
    );
  }
  if (status === 'Failed Challenge' || status === 'Quarantined' || status === 'Blocked') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#B85C4A]/10 border border-[#B85C4A]/25 text-[#B85C4A] ${sizeClasses}`}>
        <ShieldX className="w-3.5 h-3.5 text-[#B85C4A]" />
        {status}
      </span>
    );
  }

  // Anchoring Status
  if (status === 'Anchored') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#72583F]/10 border border-[#72583F]/25 text-[#72583F] ${sizeClasses}`}>
        <CheckCircle2 className="w-3.5 h-3.5 text-[#72583F]" />
        Anchored
      </span>
    );
  }
  if (status === 'Priority Anchored') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#B85C4A]/10 border border-[#B85C4A]/25 text-[#B85C4A] ${sizeClasses}`}>
        <ShieldAlert className="w-3.5 h-3.5 text-[#B85C4A]" />
        Priority Anchored
      </span>
    );
  }
  if (status === 'Pending Batch') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#B78343]/10 border border-[#B78343]/25 text-[#B78343] ${sizeClasses}`}>
        <Clock className="w-3.5 h-3.5 text-[#B78343]" />
        Pending Batch
      </span>
    );
  }

  // Access Control Status
  if (status === 'Approved') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#47765B]/10 border border-[#47765B]/25 text-[#47765B] ${sizeClasses}`}>
        <CheckCircle2 className="w-3.5 h-3.5 text-[#47765B]" />
        Approved
      </span>
    );
  }
  if (status === 'Pending') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#B78343]/10 border border-[#B78343]/25 text-[#B78343] ${sizeClasses}`}>
        <Clock className="w-3.5 h-3.5 text-[#B78343]" />
        Pending Review
      </span>
    );
  }
  if (status === 'Rejected' || status === 'Revoked') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#B85C4A]/10 border border-[#B85C4A]/25 text-[#B85C4A] ${sizeClasses}`}>
        <ShieldX className="w-3.5 h-3.5 text-[#B85C4A]" />
        {status}
      </span>
    );
  }

  // Gateway Decisions
  if (status.includes('Normal')) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#47765B]/10 border border-[#47765B]/25 text-[#47765B] ${sizeClasses}`}>
        <CheckCircle2 className="w-3.5 h-3.5 text-[#47765B]" />
        {status}
      </span>
    );
  }
  if (status.includes('Poor Signal')) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#B78343]/10 border border-[#B78343]/25 text-[#B78343] ${sizeClasses}`}>
        <AlertTriangle className="w-3.5 h-3.5 text-[#B78343]" />
        {status}
      </span>
    );
  }
  if (status.includes('Abnormal') || status.includes('Unauthorized') || status.includes('Repeated')) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#B85C4A]/10 border border-[#B85C4A]/25 text-[#B85C4A] ${sizeClasses}`}>
        <ShieldAlert className="w-3.5 h-3.5 text-[#B85C4A]" />
        {status}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center rounded-full bg-[#EFE5D6] border border-[rgba(112,91,66,0.18)] text-[#30291F] ${sizeClasses}`}>
      {status}
    </span>
  );
};
