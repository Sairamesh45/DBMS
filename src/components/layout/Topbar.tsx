import React from 'react';
import { User, ShieldCheck, Database } from 'lucide-react';
import { useGateway } from '../../context/GatewayContext';
import { useToast } from '../../context/ToastContext';
import { ActorRole } from '../../types';

export const Topbar: React.FC = () => {
  const {
    activeRole,
    setActiveRole,
  } = useGateway();
  const { showToast } = useToast();

  const roles: ActorRole[] = ['Doctor', 'Admin', 'Auditor', 'Patient'];

  const roleLabels: Record<string, string> = {
    Doctor: 'Dr. Sarah Jenkins (Attending)',
    Admin: 'System Administrator (IT)',
    Auditor: 'Consortium Security Auditor',
    Patient: 'Eleanor Vance (Patient Portal)',
  };

  const handleRoleChange = (newRole: ActorRole) => {
    setActiveRole(newRole);
    showToast({
      type: 'info',
      title: `Switched to ${newRole} Perspective`,
      message: `Dashboard & interface adapted to ${roleLabels[newRole]}.`,
    });
  };

  return (
    <header className="h-14 shrink-0 bubbly-glass rounded-[24px] px-5 flex items-center justify-between gap-4 select-none relative z-20">
      {/* Left: Project title & institutional context */}
      <div className="flex items-center gap-3">
        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#FAF5EE] text-[#8C6642] border border-[#E8DACB] font-mono shadow-xs">
          BCSE302P
        </span>
        <div className="hidden sm:block">
          <div className="text-xs font-bold text-[#30291F] leading-tight font-serif text-sm">
            Database Systems Lab
          </div>
          <div className="text-[11px] text-[#82776A] leading-tight font-sans">
            Hardware Trust Gateway & Cryptographic Ledger
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 pl-3 border-l border-[rgba(112,91,66,0.12)]">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#EBF3ED] text-[#306B49] border border-[#C8E1D2] shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#47765B] animate-pulse" />
            SQLite Storage Active
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-[#FFFCF7]/65 text-[#82776A] border border-white/80 shadow-2xs">
            <Database className="w-3 h-3 text-[#8C6642]" />
            Consortium Sync: 5/5 Nodes
          </span>
        </div>
      </div>

      {/* Right: Security state & Actor perspective */}
      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-[#82776A] font-semibold px-3 py-1 rounded-full bg-[#FFFCF7]/65 border border-white/80 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-[#47765B]" />
          <span>SHA-256 Engine Verified</span>
        </div>

        {/* Role perspective selector */}
        <div className="flex items-center gap-2 bg-[#FFFCF7]/80 border border-[rgba(112,91,66,0.18)] px-3.5 py-1 rounded-full text-xs hover:border-[#8C6642] shadow-xs transition-all">
          <User className="w-3.5 h-3.5 text-[#8C6642]" />
          <span className="text-[#82776A] text-[11px] font-medium hidden sm:inline">Role:</span>
          <select
            value={activeRole}
            onChange={e => handleRoleChange(e.target.value as ActorRole)}
            className="bg-transparent text-[#30291F] text-xs font-semibold focus:outline-hidden cursor-pointer py-0.5"
          >
            {roles.map(r => (
              <option key={r} value={r} className="bg-[#F5F0E7] text-[#30291F]">
                {roleLabels[r]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};
