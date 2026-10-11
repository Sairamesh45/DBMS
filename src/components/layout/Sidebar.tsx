import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Cpu,
  Calculator,
  ShieldCheck,
  Boxes,
  KeyRound,
  AlertOctagon,
  ScrollText,
  RotateCcw,
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { useGateway } from '../../context/GatewayContext';
import { useToast } from '../../context/ToastContext';

export const Sidebar: React.FC = () => {
  const { triggerRefresh } = useGateway();
  const { showToast } = useToast();

  const navItems = [
    { name: '1. Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: '2. Tamper Detection', path: '/provenance', icon: ShieldCheck },
    { name: '3. Trust Score (MDTS)', path: '/trust-analysis', icon: Calculator },
    { name: '4. Blockchain Blocks', path: '/blockchain', icon: Boxes },
    { name: '5. Patient Records', path: '/patients', icon: Users },
    { name: '6. Hardware Sensors', path: '/sensors', icon: Cpu },
    { name: '7. Access Control', path: '/access-control', icon: KeyRound },
    { name: '8. Emergency Break-Glass', path: '/emergency-access', icon: AlertOctagon },
    { name: '9. Audit Logs', path: '/audit-logs', icon: ScrollText },
  ];

  const handleResetData = () => {
    if (window.confirm('Reset all demo data back to default values?')) {
      dataService.resetDemoData();
      triggerRefresh();
      showToast({
        type: 'info',
        title: 'Demo Data Reset',
        message: 'All records, hardware sensors, and hashes reset to default.',
      });
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 h-screen sticky top-0 shadow-xs">
      {/* Simple Header */}
      <div className="p-4 border-b border-slate-200 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
          MG
        </div>
        <div>
          <div className="font-bold text-sm text-slate-900">MEDGUARD</div>
          <div className="text-[11px] text-slate-500 font-medium">Medical Trust Gateway</div>
        </div>
      </div>

      {/* Clean Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Simple Footer with Reset button */}
      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <button
          onClick={handleResetData}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 transition-colors cursor-pointer shadow-2xs"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>Reset All Demo Data</span>
        </button>
      </div>
    </aside>
  );
};
