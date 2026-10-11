import React from 'react';
import { User, ShieldCheck } from 'lucide-react';
import { useGateway } from '../../context/GatewayContext';
import { ActorRole } from '../../types';

export const Topbar: React.FC = () => {
  const {
    activeRole,
    setActiveRole,
  } = useGateway();

  const roles: ActorRole[] = ['Doctor', 'Admin', 'Auditor', 'Patient'];

  return (
    <header className="h-14 border-b border-slate-200 bg-white px-5 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-2xs">
      {/* Left: Project title & clean status indicator */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-slate-800 hidden sm:inline">
          BCSE302P Database Systems Lab • Medical Data Trust Gateway
        </span>
        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Gateway Active • 12 Sensors Verified
        </span>
      </div>

      {/* Right: Security & Role Perspective */}
      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-500 font-medium px-2">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>SHA-256 Chained</span>
        </div>

        {/* Role dropdown */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs">
          <User className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-500 text-[11px] font-medium hidden sm:inline">Role:</span>
          <select
            value={activeRole}
            onChange={e => setActiveRole(e.target.value as ActorRole)}
            className="bg-transparent text-slate-800 text-xs font-semibold focus:outline-hidden cursor-pointer"
          >
            {roles.map(r => (
              <option key={r} value={r} className="bg-white text-slate-900">
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};
