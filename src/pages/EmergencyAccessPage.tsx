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
      <div className="p-8 sm:p-12 rounded-2xl bg-white border border-[#e6dfd5] text-center max-w-lg mx-auto my-12 space-y-4 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-[#fdf3f3] text-[#9e2a2b] border border-[#f5cacc] flex items-center justify-center mx-auto shadow-2xs">
          <Lock className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#2c2623]">Access Restricted • Break-Glass Protocol</h2>
          <p className="text-xs text-[#78716c] mt-2 leading-relaxed">
            Emergency break-glass consent overrides are restricted to verified clinical physicians and emergency room staff during life-threatening patient conditions.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-xl bg-[#8c6d46] hover:bg-[#745733] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
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
      <div className="p-5 rounded-2xl bg-white border border-[#e6dfd5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-[#2c2623] flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#9e2a2b]" />
            Emergency Break-Glass Access Protocol
          </h1>
          <p className="text-xs text-[#78716c] mt-1">
            Enables attending doctors to bypass consent during trauma or cardiac emergency with immutable audit logging on chain.
          </p>
        </div>

        {canTriggerBreakGlass ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#9e2a2b] hover:bg-[#7e1f20] text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>New Break-Glass Request</span>
          </button>
        ) : (
          <div className="px-3 py-1.5 rounded-lg bg-[#f7f4ee] border border-[#e6dfd5] text-[#78716c] text-xs font-medium self-start sm:self-auto">
            Audit Mode: Read-Only
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-[#2c2623] flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#9e2a2b] animate-ping" />
          Active Emergency Sessions ({activeGrants.length})
        </h2>

        {activeGrants.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white border border-[#e6dfd5] shadow-xs text-center text-xs text-[#78716c]">
            No active emergency break-glass sessions currently open.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeGrants.map(grant => (
              <div
                key={grant.id}
                className="p-5 rounded-2xl border border-[#f5cacc] bg-[#fdf3f3]/60 space-y-3 shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#9e2a2b]">{grant.id}</span>
                    <h3 className="text-base font-bold text-[#2c2623] mt-0.5">
                      {grant.patientName} ({grant.patientId})
                    </h3>
                  </div>

                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-white text-[#9e2a2b] border border-[#f5cacc] shadow-2xs">
                    <Clock className="w-3.5 h-3.5" />
                    {timeLeftStr[grant.id] || 'Active'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white border border-[#f5cacc] text-xs text-[#2c2623]">
                  <span className="text-[#78716c] block text-[11px] mb-0.5 font-medium">Emergency Clinical Justification:</span>
                  "{grant.reason}"
                </div>

                <div className="flex items-center justify-between text-xs text-[#78716c] pt-2 border-t border-[#f5cacc]">
                  <span>Doctor: <strong className="text-[#2c2623]">{grant.doctorName}</strong></span>
                  {canTriggerBreakGlass && (
                    <button
                      onClick={() => handleRevokeEarly(grant.id)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#faf7f2] border border-[#f5cacc] text-[#9e2a2b] text-xs font-semibold cursor-pointer shadow-2xs"
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
      <div className="p-5 rounded-2xl bg-white border border-[#e6dfd5] shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-[#2c2623]">
          Historical Break-Glass Audit Ledger
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e6dfd5] bg-[#faf7f2] text-[#78716c] font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3 font-mono">Grant ID</th>
                <th className="py-2.5 px-3">Patient</th>
                <th className="py-2.5 px-3">Physician</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 font-mono">Audit Blockchain Tx</th>
                <th className="py-2.5 px-3 text-right">Granted At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5efeb]">
              {grants.map(g => (
                <tr key={g.id} className="hover:bg-[#faf7f2] transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#8c6d46]">{g.id}</td>
                  <td className="py-2.5 px-3 font-medium text-[#2c2623]">{g.patientName}</td>
                  <td className="py-2.5 px-3 text-[#78716c]">{g.doctorName}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        g.status === 'Active'
                          ? 'bg-[#fdf3f3] text-[#9e2a2b] border border-[#f5cacc]'
                          : 'bg-[#faf7f2] text-[#78716c] border border-[#e6dfd5]'
                      }`}
                    >
                      {g.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[#78716c] max-w-[140px] truncate">{g.auditTxHash}</td>
                  <td className="py-2.5 px-3 text-right text-[#78716c] font-mono">
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
