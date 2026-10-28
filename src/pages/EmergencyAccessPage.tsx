import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Clock,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../services/dataService';
import { EmergencyAccessGrant, Patient } from '../types';
import { EmergencyAccessModal } from '../components/forms/EmergencyAccessModal';
import { useGateway } from '../context/GatewayContext';
import { useToast } from '../context/ToastContext';

export const EmergencyAccessPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { activeRole, refreshTrigger, triggerRefresh } = useGateway();

  const [grants, setGrants] = useState<EmergencyAccessGrant[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [timeLeftStr, setTimeLeftStr] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([dataService.getEmergencyGrants(), dataService.getPatients()]).then(([gList, pts]) => {
      setGrants(gList);
      setPatients(pts);
    });
  }, [refreshTrigger]);

  // Live countdown timer for active sessions
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const newMap: Record<string, string> = {};

      grants.forEach(g => {
        if (g.status === 'Active') {
          const exp = new Date(g.expiresAt).getTime();
          const diffMs = exp - now;
          if (diffMs <= 0) {
            newMap[g.id] = 'EXPIRED';
          } else {
            const mins = Math.floor(diffMs / 60000);
            const secs = Math.floor((diffMs % 60000) / 1000);
            newMap[g.id] = `${mins}m ${secs.toString().padStart(2, '0')}s remaining`;
          }
        }
      });
      setTimeLeftStr(newMap);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [grants]);

  const handleRevokeEarly = async (grantId: string) => {
    try {
      await dataService.revokeEmergencyAccess(grantId);
      triggerRefresh();
      showToast({
        type: 'warning',
        title: 'Emergency Session Terminated',
        message: `Break-glass session ${grantId} closed.`,
      });
    } catch (e: any) {
      console.error(e);
    }
  };

  const activeGrants = grants.filter(g => g.status === 'Active');

  // RBAC Access Guard: Patient cannot access clinical break-glass override controls
  if (activeRole === 'Patient') {
    return (
      <div className="p-8 sm:p-12 bubbly-glass text-center max-w-lg mx-auto my-12 space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#FDF0EE] text-[#BF4E3B] border border-[#F5CAC3] flex items-center justify-center mx-auto shadow-xs">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#2A241E] font-serif">Access Restricted • Break-Glass Protocol</h2>
          <p className="text-xs text-[#756A5C] mt-2 leading-relaxed">
            Emergency break-glass consent overrides are restricted to verified clinical physicians and emergency room staff during life-threatening patient conditions.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="pill-btn-primary"
          >
            Return to My Health Dashboard
          </button>
        </div>
      </div>
    );
  }

  const canTriggerBreakGlass = activeRole === 'Doctor' || activeRole === 'Admin';

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bubbly-glass p-6 md:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#C75341] to-[#B03E2D] text-white flex items-center justify-center shadow-xs">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#2A241E] font-serif">
              Emergency Break-Glass Access Protocol
            </h1>
            <p className="text-xs text-[#756A5C] mt-1">
              Enables attending doctors to bypass consent during trauma or cardiac emergency with immutable audit logging on chain.
            </p>
          </div>
        </div>

        {canTriggerBreakGlass ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="pill-btn-danger shrink-0 self-start sm:self-auto"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>New Break-Glass Request</span>
          </button>
        ) : (
          <div className="px-4 py-2 rounded-full bg-white/70 border border-white/80 text-[#756A5C] text-xs font-semibold self-start sm:self-auto shadow-2xs">
            Audit Mode: Read-Only
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div className="space-y-3.5">
        <h2 className="text-base font-bold text-[#2A241E] flex items-center gap-2.5 font-serif">
          <span className="w-2.5 h-2.5 rounded-full bg-[#BF4E3B] animate-ping" />
          Active Emergency Sessions ({activeGrants.length})
        </h2>

        {activeGrants.length === 0 ? (
          <div className="p-7 bubbly-glass text-center text-xs text-[#756A5C]">
            No active emergency break-glass sessions currently open.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeGrants.map(grant => (
              <div
                key={grant.id}
                className="p-6 rounded-[26px] border border-[#F5CAC3] bg-[#FDF0EE]/70 space-y-4 shadow-sm backdrop-blur-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#BF4E3B] px-2.5 py-0.5 rounded-full bg-white border border-[#F5CAC3] shadow-2xs">
                      {grant.id}
                    </span>
                    <h3 className="text-lg font-bold text-[#2A241E] mt-2 font-serif">
                      {grant.patientName} ({grant.patientId})
                    </h3>
                  </div>

                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full font-mono font-bold text-xs bg-white text-[#BF4E3B] border border-[#F5CAC3] shadow-xs">
                    <Clock className="w-3.5 h-3.5" />
                    {timeLeftStr[grant.id] || 'Active'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/80 border border-[#F5CAC3] text-xs text-[#2A241E] shadow-2xs">
                  <span className="text-[#756A5C] block text-[11px] mb-1 font-medium">Emergency Clinical Justification:</span>
                  "{grant.reason}"
                </div>

                <div className="flex items-center justify-between text-xs text-[#756A5C] pt-3 border-t border-[rgba(191,78,59,0.2)]">
                  <span>Attending: <strong className="text-[#2A241E]">{grant.doctorName}</strong></span>
                  {canTriggerBreakGlass && (
                    <button
                      onClick={() => handleRevokeEarly(grant.id)}
                      className="pill-btn-danger py-1 px-3 text-xs"
                    >
                      Terminate Early
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Break-Glass Audit Trail */}
      <div className="bubbly-glass p-6 md:p-7 space-y-4">
        <h3 className="text-base font-bold text-[#2A241E] font-serif">
          Historical Break-Glass Audit Ledger
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[rgba(160,140,115,0.12)] text-[#756A5C] font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 font-mono">Grant ID</th>
                <th className="py-3 px-3">Patient</th>
                <th className="py-3 px-3">Physician</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 font-mono">Audit Blockchain Tx</th>
                <th className="py-3 px-3 text-right">Granted At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(160,140,115,0.08)]">
              {grants.map(g => (
                <tr key={g.id} className="hover:bg-white/60 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-[#9C7854]">{g.id}</td>
                  <td className="py-3 px-3 font-medium text-[#2A241E]">{g.patientName}</td>
                  <td className="py-3 px-3 text-[#756A5C]">{g.doctorName}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                        g.status === 'Active'
                          ? 'bg-[#FDF0EE] text-[#BF4E3B] border border-[#F5CAC3]'
                          : 'bg-white/80 text-[#756A5C] border border-white/90'
                      }`}
                    >
                      {g.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[#756A5C] max-w-[140px] truncate">{g.auditTxHash}</td>
                  <td className="py-3 px-3 text-right text-[#756A5C] font-mono">
                    {new Date(g.grantedAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Emergency Modal */}
      <EmergencyAccessModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        patients={patients}
        onGrantCreated={triggerRefresh}
      />
    </div>
  );
};
