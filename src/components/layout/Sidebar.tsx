import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  Users,
  Cpu,
  Calculator,
  ShieldCheck,
  Boxes,
  KeyRound,
  AlertOctagon,
  ScrollText,
  RotateCcw,
  Shield,
  Database,
  Lock,
  Stethoscope,
  FileCheck2,
  Heart,
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { useGateway } from '../../context/GatewayContext';
import { useToast } from '../../context/ToastContext';

export const Sidebar: React.FC = () => {
  const { activeRole, triggerRefresh } = useGateway();
  const { showToast } = useToast();

  const roleProfiles: Record<string, { name: string; title: string; badgeClass: string; icon: any }> = {
    Doctor: {
      name: 'Dr. Sarah Jenkins',
      title: 'Attending Cardiologist',
      badgeClass: 'bg-[#EBF3ED] text-[#306B49] border-[#C8E1D2]',
      icon: Stethoscope,
    },
    Admin: {
      name: 'IT Security Admin',
      title: 'Gateway Root Operator',
      badgeClass: 'bg-[#FAF5EE] text-[#8C6642] border-[#E8DACB]',
      icon: Shield,
    },
    Auditor: {
      name: 'Security Auditor',
      title: 'Consortium Forensic Inspector',
      badgeClass: 'bg-[#FAF5EE] text-[#9A6424] border-[#F2DAC0]',
      icon: FileCheck2,
    },
    Patient: {
      name: 'Eleanor Vance',
      title: 'Patient Portal (Bed 04)',
      badgeClass: 'bg-[#EFF5FA] text-[#2C6288] border-[#CCE0EE]',
      icon: Heart,
    },
  };

  const currentProfile = roleProfiles[activeRole] || roleProfiles.Doctor;
  const ProfileIcon = currentProfile.icon;

  const getNavSections = () => {
    if (activeRole === 'Patient') {
      return [
        {
          title: 'MY HEALTH & TELEMETRY',
          items: [
            { name: 'My Health Dashboard', path: '/dashboard', icon: LayoutDashboard },
            { name: 'My Live Telemetry (ECG)', path: '/monitoring', icon: Activity },
          ],
        },
        {
          title: 'MY PRIVACY & RECORDS',
          items: [
            { name: 'My Verified Records', path: '/provenance', icon: ShieldCheck },
            { name: 'Informed Consent Policies', path: '/access-control', icon: KeyRound },
          ],
        },
      ];
    }

    if (activeRole === 'Doctor') {
      return [
        {
          title: 'CLINICAL & PATIENTS',
          items: [
            { name: 'Overview Dashboard', path: '/dashboard', icon: LayoutDashboard },
            { name: 'Live Monitoring (ECG)', path: '/monitoring', icon: Activity },
            { name: 'Patient Directory', path: '/patients', icon: Users },
          ],
        },
        {
          title: 'INTEGRITY & TRUST',
          items: [
            { name: 'Data Provenance Ledger', path: '/provenance', icon: ShieldCheck },
            { name: 'Trust Scoring (MDTS)', path: '/trust-analysis', icon: Calculator },
          ],
        },
        {
          title: 'GOVERNANCE & EMERGENCY',
          items: [
            { name: 'File Access Request', path: '/access-control', icon: KeyRound },
            { name: 'Emergency Break-Glass', path: '/emergency-access', icon: AlertOctagon },
          ],
        },
      ];
    }

    if (activeRole === 'Auditor') {
      return [
        {
          title: 'COMPLIANCE & AUDIT',
          items: [
            { name: 'Overview Dashboard', path: '/dashboard', icon: LayoutDashboard },
            { name: 'Patient Registry (Audit)', path: '/patients', icon: Users },
            { name: 'Data Provenance Ledger', path: '/provenance', icon: ShieldCheck },
            { name: 'Trust Scoring (MDTS)', path: '/trust-analysis', icon: Calculator },
            { name: 'Consortium Blockchain', path: '/blockchain', icon: Boxes },
            { name: 'Access Grants Audit', path: '/access-control', icon: KeyRound },
            { name: 'System Audit Trail', path: '/audit-logs', icon: ScrollText },
          ],
        },
      ];
    }

    // Admin: Full Access across all modules
    return [
      {
        title: 'CLINICAL & PATIENTS',
        items: [
          { name: 'Overview Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { name: 'Live Monitoring (ECG)', path: '/monitoring', icon: Activity },
          { name: 'Patient Registry', path: '/patients', icon: Users },
          { name: 'IoT Hardware Nodes', path: '/sensors', icon: Cpu },
        ],
      },
      {
        title: 'INTEGRITY & LEDGER',
        items: [
          { name: 'Data Provenance Ledger', path: '/provenance', icon: ShieldCheck },
          { name: 'Trust Scoring (MDTS)', path: '/trust-analysis', icon: Calculator },
          { name: 'Consortium Blockchain', path: '/blockchain', icon: Boxes },
        ],
      },
      {
        title: 'SECURITY & AUDIT',
        items: [
          { name: 'Access Control & Consent', path: '/access-control', icon: KeyRound },
          { name: 'Emergency Break-Glass', path: '/emergency-access', icon: AlertOctagon },
          { name: 'System Audit Trail', path: '/audit-logs', icon: ScrollText },
        ],
      },
    ];
  };

  const navSections = getNavSections();

  const handleResetData = async () => {
    if (activeRole !== 'Admin') {
      showToast({
        type: 'warning',
        title: 'Access Denied',
        message: 'Only System Administrators have authorization to reset database records.',
      });
      return;
    }

    if (window.confirm('Reset all demo database records, hardware sensors, and hashes to default baseline state?')) {
      try {
        await dataService.resetDemoData();
        triggerRefresh();
        showToast({
          type: 'info',
          title: 'Database Reset',
          message: 'All records, hardware sensors, and cryptographic hashes reset to verified default state.',
        });
      } catch (e: any) {
        showToast({
          type: 'error',
          title: 'Reset Failed',
          message: e.message || 'Could not reset database',
        });
      }
    }
  };

  return (
    <aside className="w-[270px] shrink-0 h-full flex flex-col bubbly-glass rounded-[28px] p-5 select-none relative z-20 overflow-hidden">
      {/* Brand Header */}
      <div className="pb-4 mb-3 border-b border-[rgba(112,91,66,0.12)] flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#8C6642] text-white flex items-center justify-center shadow-xs shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm text-[#30291F] tracking-tight flex items-center gap-1.5 font-serif">
            <span className="text-base tracking-wide font-serif">MEDGUARD</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-[#FAF5EE] text-[#8C6642] border border-[#E8DACB]">
              v2.4
            </span>
          </div>
          <div className="text-[11px] text-[#82776A] font-medium leading-tight mt-0.5">
            Data Trust Gateway
          </div>
        </div>
      </div>

      {/* Physician Profile Card */}
      <div className="mb-3.5">
        <div className="p-3 rounded-2xl bg-[#FFFCF7]/65 border border-white/80 shadow-2xs flex items-center gap-2.5 backdrop-blur-md">
          <div className="w-8 h-8 rounded-xl bg-white border border-[#E8DACB] flex items-center justify-center text-[#8C6642] shrink-0 shadow-2xs">
            <ProfileIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-[#30291F] truncate leading-tight">
              {currentProfile.name}
            </div>
            <div className="text-[10px] text-[#82776A] truncate leading-tight mt-0.5">
              {currentProfile.title}
            </div>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${currentProfile.badgeClass}`}>
            {activeRole}
          </span>
        </div>
      </div>

      {/* Categorized Navigation Hierarchy */}
      <nav className="flex-1 py-1 space-y-4 overflow-y-auto pr-0.5">
        {navSections.map(section => (
          <div key={section.title} className="space-y-1">
            <div className="px-3 text-[10px] font-bold tracking-wider uppercase text-[#8C8275] font-sans">
              {section.title}
            </div>
            <div className="space-y-1 pt-1">
              {section.items.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 h-[42px] rounded-[14px] text-[13px] transition-all ${
                        isActive
                          ? 'bg-[#8C6642] text-white font-medium shadow-[0_3px_10px_rgba(140,102,66,0.22)]'
                          : 'text-[#6E6355] hover:text-[#30291F] hover:bg-white/60 font-medium'
                      }`
                    }
                  >
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Clean Consolidated Footer: Storage & Sync Status */}
      <div className="pt-3 mt-1 border-t border-[rgba(112,91,66,0.12)] space-y-2.5">
        <div className="p-3 rounded-2xl bg-[#FFFCF7]/65 border border-white/80 text-[11px] space-y-1.5 text-[#82776A] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium text-[#30291F]">
              <Database className="w-3.5 h-3.5 text-[#8C6642]" /> Storage Engine
            </span>
            <span className="font-mono text-[#306B49] font-bold text-[10px] px-2 py-0.5 rounded-full bg-[#EBF3ED] border border-[#C8E1D2]">
              SQLite ACID
            </span>
          </div>
          <div className="flex items-center justify-between text-[#82776A] pt-0.5">
            <span>Consortium Rollup</span>
            <span className="font-mono text-[#30291F] font-semibold text-[10px]">5 Nodes Synced</span>
          </div>
        </div>

        {activeRole === 'Admin' ? (
          <button
            onClick={handleResetData}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-full bg-white/75 hover:bg-white text-[#82776A] hover:text-[#30291F] text-xs font-semibold border border-[rgba(112,91,66,0.18)] transition-all cursor-pointer shadow-2xs hover:shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#8C6642]" />
            <span>Reset Demo Database</span>
          </button>
        ) : (
          <div className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full bg-[#30291F]/5 text-[#9E9486] text-[11px] font-medium border border-transparent cursor-not-allowed">
            <Lock className="w-3 h-3 text-[#9E9486]" />
            <span>Reset DB (Admin Only)</span>
          </div>
        )}
      </div>
    </aside>
  );
};
