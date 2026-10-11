import React, { useState, useEffect } from 'react';
import {
  Flame,
  Clock,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { EmergencyAccessGrant, Patient } from '../types';
import { EmergencyAccessModal } from '../components/forms/EmergencyAccessModal';
import { useGateway } from '../context/GatewayContext';
import { useToast } from '../context/ToastContext';

export const EmergencyAccessPage: React.FC = () => {
  const { showToast } = useToast();
  const { refreshTrigger, triggerRefresh } = useGateway();

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

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Flame className="w-5 h-5 text-rose-600" />
            Emergency Break-Glass Access Protocol
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enables attending doctors to bypass consent during cardiac arrest or trauma while logging an immutable audit record
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Flame className="w-4 h-4" />
          <span>New Break-Glass Request</span>
        </button>
      </div>

      {/* Active Sessions */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          Active Emergency Sessions ({activeGrants.length})
        </h2>

        {activeGrants.length === 0 ? (
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs text-center text-xs text-slate-500">
            No active emergency break-glass sessions currently open.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeGrants.map(grant => (
              <div
                key={grant.id}
                className="p-5 rounded-xl border border-rose-200 bg-rose-50/30 space-y-3 shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-rose-600">{grant.id}</span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">
                      {grant.patientName} ({grant.patientId})
                    </h3>
                  </div>

                  <span className="flex items-center gap-1 px-2.5 py-1 rounded font-mono font-bold text-xs bg-rose-100 text-rose-800 border border-rose-300">
                    <Clock className="w-3.5 h-3.5" />
                    {timeLeftStr[grant.id] || 'Active'}
                  </span>
                </div>

                <div className="p-2.5 rounded bg-white border border-rose-200 text-xs text-slate-700">
                  <span className="text-slate-500 block text-[11px] mb-0.5 font-medium">Emergency Reason:</span>
                  "{grant.reason}"
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-rose-200">
                  <span>Doctor: <strong className="text-slate-800">{grant.doctorName}</strong></span>
                  <button
                    onClick={() => handleRevokeEarly(grant.id)}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 text-xs font-medium cursor-pointer shadow-2xs"
                  >
                    Terminate Early
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical Logs Table */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">
          Emergency Break-Glass Audit Trail
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3 font-mono">Grant ID</th>
                <th className="py-2.5 px-3">Patient</th>
                <th className="py-2.5 px-3">Doctor</th>
                <th className="py-2.5 px-3">Clinical Justification</th>
                <th className="py-2.5 px-3 font-mono">Audit Hash</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {grants.map(grant => (
                <tr key={grant.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-rose-600">{grant.id}</td>
                  <td className="py-2.5 px-3 text-slate-900 font-semibold">{grant.patientName}</td>
                  <td className="py-2.5 px-3 text-slate-600">{grant.doctorName}</td>
                  <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">{grant.reason}</td>
                  <td className="py-2.5 px-3 font-mono text-blue-600 text-[11px] max-w-[120px] truncate">
                    {grant.auditTxHash}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        grant.status === 'Active'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {grant.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <EmergencyAccessModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        patients={patients}
        onGrantCreated={triggerRefresh}
      />
    </div>
  );
};
