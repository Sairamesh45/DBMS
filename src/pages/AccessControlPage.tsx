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

  // Role-based filtering: Patients only see authorizations related to their own patient ID
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#2c2623] flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#8c6d46]" />
            {activeRole === 'Patient'
              ? 'My Informed Consent & Data Sharing Policies'
              : 'Medical Access Control & Patient Consent'}
          </h1>
          <p className="text-xs text-[#78716c] mt-1">
            {activeRole === 'Patient'
              ? 'Manage and grant consent for clinical doctors requesting access to your real-time ECG and telemetry streams'
              : 'Role-based access matrix governing clinical telemetric streams with cryptographic consent policies'}
          </p>
        </div>

        {activeRole === 'Doctor' || activeRole === 'Admin' ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8c6d46] hover:bg-[#745733] text-white font-semibold text-xs transition-colors shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>File Access Request</span>
          </button>
        ) : activeRole === 'Patient' ? (
          <div className="px-3.5 py-1.5 rounded-xl bg-[#eff6ff] border border-[#bfdbfe] text-[#1e40af] text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto">
            <UserCheck className="w-4 h-4" />
            <span>Consent Authority: Eleanor Vance</span>
          </div>
        ) : (
          <div className="px-3 py-1.5 rounded-lg bg-[#f7f4ee] border border-[#e6dfd5] text-[#78716c] text-xs font-medium self-start sm:self-auto">
            Audit Mode: Read-Only
          </div>
        )}
      </div>

      {/* Role Perspective Selector Strip */}
      <div className="p-4 rounded-2xl bg-white border border-[#e6dfd5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[#8c6d46]" />
          <span className="font-semibold text-[#2c2623]">Active Perspective:</span>
          <span className="font-mono text-[#8c6d46] font-bold px-2 py-0.5 rounded-lg bg-[#f5efeb] border border-[#d8cfc2]">
            {activeRole} Perspective
          </span>
        </div>
        <p className="text-[#78716c] text-[11px]">
          {activeRole === 'Doctor' && 'As a Doctor, file telemetry access requests and monitor approved clinical streams.'}
          {activeRole === 'Admin' && 'As an Administrator, review clinical justifications and approve or revoke doctor credentials.'}
          {activeRole === 'Patient' && 'As a Patient, review physician requests and grant or deny access to your private medical telemetry.'}
          {activeRole === 'Auditor' && 'As an Auditor, monitor access grants and verify compliance logs.'}
        </p>
      </div>

      {/* Access Requests Table */}
      <div className="rounded-2xl border border-[#e6dfd5] bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#2c2623]">
              {activeRole === 'Patient' ? 'Access Requests for My Telemetry' : 'Clinical Telemetry Access Requests'}
            </h3>
            <p className="text-xs text-[#78716c] mt-0.5">
              Time-bounded granular permissions for medical sensor telemetry
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#78716c]" />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-2.5 py-1 rounded-xl bg-[#faf7f2] border border-[#e6dfd5] text-[#2c2623] text-xs focus:outline-hidden cursor-pointer"
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
              <tr className="border-b border-[#e6dfd5] text-[#78716c] text-[11px] uppercase tracking-wider font-semibold">
                <th className="pb-2.5">Request ID</th>
                <th className="pb-2.5">Physician</th>
                <th className="pb-2.5">Patient</th>
                <th className="pb-2.5">Data Scope</th>
                <th className="pb-2.5">Duration</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5 text-right">Decisions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5efeb]">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-[#78716c]">
                    No access requests matching criteria.
                  </td>
                </tr>
              ) : (
                filteredRequests.map(req => (
                  <tr key={req.id} className="hover:bg-[#faf7f2] transition-colors">
                    <td className="py-3 font-mono font-bold text-[#8c6d46]">{req.id}</td>
                    <td className="py-3">
                      <div className="font-semibold text-[#2c2623]">{req.doctorName}</div>
                      <div className="text-[11px] text-[#78716c]">{req.doctorSpecialty}</div>
                    </td>
                    <td className="py-3">
                      <div className="font-semibold text-[#2c2623]">{req.patientName}</div>
                      <div className="text-[11px] text-[#78716c] font-mono">{req.patientId}</div>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {req.categories.map((cat, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded-lg text-[10px] bg-[#faf7f2] border border-[#e6dfd5] text-[#78716c]"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                      <div className="text-[11px] text-[#78716c] italic mt-0.5 max-w-xs truncate">
                        "{req.purpose}"
                      </div>
                    </td>
                    <td className="py-3 font-mono text-[#78716c]">{req.requestedDurationHours}h</td>
                    <td className="py-3">
                      <StatusBadge status={req.status} size="sm" />
                    </td>
                    <td className="py-3 text-right">
                      {req.status === 'Pending' ? (
                        (activeRole === 'Admin' || activeRole === 'Patient') ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApprove(req.id)}
                              className="px-2.5 py-1 rounded-lg bg-[#f2f7f3] hover:bg-[#e2ede4] text-[#2d6e42] border border-[#c6dcce] text-[11px] font-semibold cursor-pointer transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(req.id)}
                              className="px-2.5 py-1 rounded-lg bg-[#fdf3f3] hover:bg-[#fae4e5] text-[#9e2a2b] border border-[#f5cacc] text-[11px] font-semibold cursor-pointer transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#78716c] italic">Pending Approval</span>
                        )
                      ) : req.status === 'Approved' ? (
                        (activeRole === 'Admin' || activeRole === 'Patient') ? (
                          <button
                            onClick={() => handleRevoke(req.id)}
                            className="px-2.5 py-1 rounded-lg bg-[#faf7f2] hover:bg-[#fdf3f3] text-[#9e2a2b] border border-[#d8cfc2] text-[11px] font-semibold cursor-pointer transition-colors"
                          >
                            Revoke
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#2d6e42] font-semibold">Active Grant</span>
                        )
                      ) : (
                        <span className="text-[11px] text-[#78716c] font-mono">Completed</span>
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
