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
    <header className="h-14 border-b border-[#e6dfd5] bg-white px-6 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-2xs">
      {/* Left: Project title & institutional context */}
      <div className="flex items-center gap-3">
        <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-[#f5efeb] text-[#8c6d46] border border-[#d8cfc2] font-mono">
          BCSE302P
        </span>
        <div className="hidden sm:block">
          <div className="text-xs font-bold text-[#2c2623] leading-tight">
            Database Systems Lab Project
          </div>
          <div className="text-[11px] text-[#78716c] leading-tight">
            Hardware Trust Gateway & Cryptographic Ledger
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 pl-3 border-l border-[#e6dfd5]">
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#f2f7f3] text-[#2d6e42] border border-[#c6dcce]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2d6e42]" />
            SQLite Storage Active
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#faf7f2] text-[#78716c] border border-[#e6dfd5]">
            <Database className="w-3 h-3 text-[#8c6d46]" />
            Consortium Sync: 5/5 Nodes
          </span>
        </div>
      </div>

      {/* Right: Security state & Actor perspective */}
      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-1 text-[11px] text-[#78716c] font-medium px-2.5 py-1 rounded-xl bg-[#faf7f2] border border-[#e6dfd5]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#8c6d46]" />
          <span>SHA-256 Engine Verified</span>
        </div>

        {/* Role perspective selector */}
        <div className="flex items-center gap-2 bg-[#faf7f2] border border-[#d8cfc2] px-3 py-1 rounded-xl text-xs hover:border-[#8c6d46] transition-colors">
          <User className="w-3.5 h-3.5 text-[#8c6d46]" />
          <span className="text-[#78716c] text-[11px] font-medium hidden sm:inline">Role:</span>
          <select
            value={activeRole}
            onChange={e => handleRoleChange(e.target.value as ActorRole)}
            className="bg-transparent text-[#2c2623] text-xs font-semibold focus:outline-hidden cursor-pointer"
          >
            {roles.map(r => (
              <option key={r} value={r} className="bg-white text-[#2c2623]">
                {roleLabels[r]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};
