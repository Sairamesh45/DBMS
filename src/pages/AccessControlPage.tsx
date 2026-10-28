import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Plus,
  CheckCircle2,
  XCircle,
  Lock,
  UserCheck,
  Filter,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { AccessRequest, Patient } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { RequestAccessModal } from '../components/forms/RequestAccessModal';
import { useGateway } from '../context/GatewayContext';
import { useToast } from '../context/ToastContext';

export const AccessControlPage: React.FC = () => {
  const { showToast } = useToast();
  const { activeRole, selectedPatientId, refreshTrigger, triggerRefresh } = useGateway();

  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    Promise.all([dataService.getAccessRequests(), dataService.getPatients()]).then(([reqs, pts]) => {
      setRequests(reqs);
      setPatients(pts);
    });
  }, [refreshTrigger]);

  const handleApprove = async (id: string) => {
    try {
      const updated = await dataService.approveAccessRequest(id);
      triggerRefresh();
      showToast({
        type: 'success',
        title: 'Access Request Approved',
        message: `Granted ${updated.requestedDurationHours}h access to ${updated.doctorName} for ${updated.patientName}.`,
      });
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const updated = await dataService.rejectAccessRequest(id);
      triggerRefresh();
      showToast({
        type: 'warning',
        title: 'Access Request Rejected',
        message: `Denied access request ${id} filed by ${updated.doctorName}.`,
      });
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      const updated = await dataService.revokeAccess(id);
      triggerRefresh();
      showToast({
        type: 'info',
        title: 'Access Revoked',
        message: `Revoked active access permissions for ${updated.doctorName}.`,
      });
    } catch (e: any) {
      console.error(e);
    }
  };

  // Role-based filtering
  const relevantRequests = requests.filter(r => {
    if (activeRole === 'Patient') {
      return r.patientId === selectedPatientId || r.patientId === 'PT-1042';
    }
    return true;
  });

  const filteredRequests = relevantRequests.filter(r => {
    return filterStatus === 'ALL' || r.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bubbly-glass p-6 md:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#9C7854] to-[#85613D] text-white flex items-center justify-center shadow-xs">
            <KeyRound className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#2A241E] font-serif">
              {activeRole === 'Patient'
                ? 'My Informed Consent & Data Sharing Policies'
                : 'Medical Access Control & Patient Consent'}
            </h1>
            <p className="text-xs text-[#756A5C] mt-1">
              {activeRole === 'Patient'
                ? 'Manage and grant consent for clinical doctors requesting access to your real-time ECG and telemetry streams.'
                : 'Role-based access matrix governing clinical telemetric streams with cryptographic consent policies.'}
            </p>
          </div>
        </div>

        {activeRole === 'Doctor' || activeRole === 'Admin' ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="pill-btn-primary shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>File Access Request</span>
          </button>
        ) : activeRole === 'Patient' ? (
          <div className="px-4 py-2 rounded-full bg-[#EFF5FA] border border-[#CCE0EE] text-[#2C6288] text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto shadow-2xs">
            <UserCheck className="w-4 h-4" />
            <span>Consent Authority: Eleanor Vance</span>
          </div>
        ) : (
          <div className="px-4 py-2 rounded-full bg-white/70 border border-white/80 text-[#756A5C] text-xs font-semibold self-start sm:self-auto shadow-2xs">
            Audit Mode: Read-Only
          </div>
        )}
      </div>

      {/* Role Perspective Selector Strip */}
      <div className="p-4 rounded-2xl bg-white/70 border border-white/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs backdrop-blur-md">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[#9C7854]" />
          <span className="font-semibold text-[#2A241E]">Active Perspective:</span>
          <span className="font-mono text-[#8C6642] font-bold px-3 py-1 rounded-full bg-[#F8F2EA] border border-[#EADAC7]">
            {activeRole} Perspective
          </span>
        </div>
        <p className="text-[#756A5C] text-[11px]">
          {activeRole === 'Doctor' && 'As a Doctor, file telemetry access requests and monitor approved clinical streams.'}
          {activeRole === 'Admin' && 'As an Administrator, review clinical justifications and approve or revoke doctor credentials.'}
          {activeRole === 'Patient' && 'As a Patient, review physician requests and grant or deny access to your private medical telemetry.'}
          {activeRole === 'Auditor' && 'As an Auditor, monitor access grants and verify compliance logs.'}
        </p>
      </div>

      {/* Access Requests Table */}
      <div className="bubbly-glass p-6 md:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[rgba(160,140,115,0.12)]">
          <div>
            <h3 className="text-base font-bold text-[#2A241E] font-serif">
              {activeRole === 'Patient' ? 'Access Requests for My Telemetry' : 'Clinical Telemetry Access Requests'}
            </h3>
            <p className="text-xs text-[#756A5C] mt-0.5">
              Time-bounded granular permissions for medical sensor telemetry
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/70 border border-white/80 px-3 py-1.5 rounded-full shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-[#756A5C]" />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-transparent text-[#2A241E] text-xs font-semibold focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Pending">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Revoked">Revoked</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[rgba(160,140,115,0.12)] text-[#756A5C] text-[11px] uppercase tracking-wider font-semibold">
                <th className="pb-3">Request ID</th>
                <th className="pb-3">Physician</th>
                <th className="pb-3">Patient</th>
                <th className="pb-3">Data Scope</th>
                <th className="pb-3">Duration</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Decisions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(160,140,115,0.08)]">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-[#756A5C]">
                    No access requests matching criteria.
                  </td>
                </tr>
              ) : (
                filteredRequests.map(req => (
                  <tr key={req.id} className="hover:bg-white/60 transition-colors">
                    <td className="py-3 font-mono font-bold text-[#9C7854]">{req.id}</td>
                    <td className="py-3">
                      <div className="font-semibold text-[#2A241E]">{req.doctorName}</div>
                      <div className="text-[11px] text-[#756A5C]">{req.doctorSpecialty}</div>
                    </td>
                    <td className="py-3">
                      <div className="font-semibold text-[#2A241E]">{req.patientName}</div>
                      <div className="text-[11px] text-[#756A5C] font-mono">{req.patientId}</div>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {req.categories.map((cat, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-full text-[10px] bg-white border border-[rgba(160,140,115,0.15)] text-[#756A5C] shadow-2xs"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                      <div className="text-[11px] text-[#756A5C] italic mt-1 max-w-xs truncate">
                        "{req.purpose}"
                      </div>
                    </td>
                    <td className="py-3 font-mono text-[#756A5C]">{req.requestedDurationHours}h</td>
                    <td className="py-3">
                      <StatusBadge status={req.status} size="sm" />
                    </td>
                    <td className="py-3 text-right">
                      {req.status === 'Pending' ? (
                        (activeRole === 'Admin' || activeRole === 'Patient') ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApprove(req.id)}
                              className="px-3 py-1 rounded-full bg-[#EBF3ED] hover:bg-[#D4EBDC] text-[#2D6643] border border-[#C8E1D2] text-[11px] font-semibold cursor-pointer transition-all shadow-2xs"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(req.id)}
                              className="px-3 py-1 rounded-full bg-[#FDF0EE] hover:bg-[#FBE0DC] text-[#BF4E3B] border border-[#F5CAC3] text-[11px] font-semibold cursor-pointer transition-all shadow-2xs"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#756A5C] italic">Pending Approval</span>
                        )
                      ) : req.status === 'Approved' ? (
                        (activeRole === 'Admin' || activeRole === 'Patient') ? (
                          <button
                            onClick={() => handleRevoke(req.id)}
                            className="px-3 py-1 rounded-full bg-white/80 hover:bg-[#FDF0EE] text-[#BF4E3B] border border-[rgba(160,140,115,0.2)] text-[11px] font-semibold cursor-pointer transition-all shadow-2xs"
                          >
                            Revoke
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#2D6643] font-semibold">Active Grant</span>
                        )
                      ) : (
                        <span className="text-[11px] text-[#756A5C] font-mono">Completed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request Access Modal */}
      <RequestAccessModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        patients={patients}
        onRequestSubmitted={triggerRefresh}
      />
    </div>
  );
};
