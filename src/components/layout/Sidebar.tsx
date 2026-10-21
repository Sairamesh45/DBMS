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
  User,
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
      badgeClass: 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]',
      icon: Stethoscope,
    },
    Admin: {
      name: 'IT Security Admin',
      title: 'Gateway Root Operator',
      badgeClass: 'bg-[#f5efeb] text-[#8c6d46] border-[#d8cfc2]',
      icon: Shield,
    },
    Auditor: {
      name: 'Security Auditor',
      title: 'Consortium Forensic Inspector',
      badgeClass: 'bg-[#fefce8] text-[#854d0e] border-[#fef08a]',
      icon: FileCheck2,
    },
    Patient: {
      name: 'Eleanor Vance',
      title: 'Patient Portal (Bed 04)',
      badgeClass: 'bg-[#eff6ff] text-[#1e40af] border-[#bfdbfe]',
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
    <aside className="w-64 bg-white border-r border-[#e6dfd5] flex flex-col shrink-0 h-screen sticky top-0 shadow-2xs select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#e6dfd5] flex items-center gap-3 bg-[#faf7f2]">
        <div className="w-9 h-9 rounded-xl bg-[#8c6d46] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-bold text-sm text-[#2c2623] tracking-tight flex items-center gap-1.5">
            <span>MEDGUARD</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium bg-[#f5efeb] text-[#8c6d46] border border-[#d8cfc2]">
              v2.4
            </span>
          </div>
          <div className="text-[11px] text-[#78716c] font-medium">Medical Data Trust Gateway</div>
        </div>
      </div>

      {/* Active User Identity & Role Badge Card */}
      <div className="p-3 border-b border-[#e6dfd5] bg-white">
        <div className="p-2.5 rounded-xl bg-[#faf7f2] border border-[#e6dfd5] flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white border border-[#d8cfc2] flex items-center justify-center text-[#8c6d46] shrink-0 shadow-2xs">
            <ProfileIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-[#2c2623] truncate leading-tight">
              {currentProfile.name}
            </div>
            <div className="text-[10px] text-[#78716c] truncate leading-tight mt-0.5">
              {currentProfile.title}
            </div>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${currentProfile.badgeClass}`}>
            {activeRole}
          </span>
        </div>
      </div>

      {/* Categorized Navigation */}
      <nav className="flex-1 p-3 space-y-5 overflow-y-auto">
        {navSections.map(section => (
          <div key={section.title} className="space-y-1">
            <div className="px-3 text-[10px] font-bold tracking-wider uppercase text-[#78716c] font-mono">
              {section.title}
            </div>
            <div className="space-y-0.5 pt-1">
              {section.items.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors ${
                        isActive
                          ? 'bg-[#f5efeb] text-[#8c6d46] font-semibold border border-[#d8cfc2] shadow-2xs'
                          : 'text-[#78716c] hover:text-[#2c2623] hover:bg-[#faf7f2] font-medium'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Database Status & Reset */}
      <div className="p-3 border-t border-[#e6dfd5] bg-[#faf7f2] space-y-2">
        <div className="p-2.5 rounded-xl bg-white border border-[#e6dfd5] text-[11px] space-y-1 text-[#78716c]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 font-medium text-[#2c2623]">
              <Database className="w-3 h-3 text-[#8c6d46]" /> Storage Engine
            </span>
            <span className="font-mono text-[#2d6e42] font-bold">SQLite Persistence</span>
          </div>
          <div className="flex items-center justify-between text-[#78716c]">
            <span>Consortium Rollup</span>
            <span className="font-mono text-[#2c2623] font-semibold">5 Nodes Synced</span>
          </div>
        </div>

        {activeRole === 'Admin' ? (
          <button
            onClick={handleResetData}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-white hover:bg-[#f5efeb] text-[#78716c] hover:text-[#2c2623] text-xs font-medium border border-[#d8cfc2] transition-colors cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3 h-3 text-[#78716c]" />
            <span>Reset Demo Database</span>
          </button>
        ) : (
          <div className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-[#f5efeb]/60 text-[#a89f91] text-[11px] font-medium border border-[#e6dfd5] cursor-not-allowed">
            <Lock className="w-3 h-3 text-[#a89f91]" />
            <span>Reset DB (Admin Only)</span>
          </div>
        )}
      </div>
    </aside>
  );
};
