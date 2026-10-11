import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Plus,
  CheckCircle2,
  XCircle,
  Lock,
  UserCheck,
  Filter,
  FileCheck,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { AccessRequest, Patient } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { RequestAccessModal } from '../components/forms/RequestAccessModal';
import { useGateway } from '../context/GatewayContext';
import { useToast } from '../context/ToastContext';

export const AccessControlPage: React.FC = () => {
  const { showToast } = useToast();
  const { activeRole, refreshTrigger, triggerRefresh } = useGateway();

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

  const filteredRequests = requests.filter(r => {
    return filterStatus === 'ALL' || r.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-blue-600" />
            Medical Access Control & Patient Consent
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Role-based access matrix governing clinical telemetric streams with cryptographic consent policies
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>File Access Request</span>
        </button>
      </div>

      {/* Role Perspective Selector Strip */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-slate-800">Active Perspective:</span>
          <span className="font-mono text-blue-700 font-bold px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
            {activeRole} Perspective
          </span>
        </div>
        <p className="text-slate-500 text-[11px]">
          {activeRole === 'Doctor' && 'As a Doctor, file telemetry access requests and monitor approved clinical streams.'}
          {activeRole === 'Admin' && 'As an Administrator, review clinical justifications and approve or revoke doctor credentials.'}
          {activeRole === 'Patient' && 'As a Patient, manage informed consent permissions and toggle data sharing policies.'}
          {activeRole === 'Auditor' && 'As an Auditor, monitor access grants and verify compliance logs.'}
        </p>
      </div>

      {/* Access Requests Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Clinical Telemetry Access Requests
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Time-bounded granular permissions for medical sensor telemetry
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Revoked">Revoked</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3 font-mono">Request ID</th>
                <th className="py-2.5 px-3">Requesting Clinician</th>
                <th className="py-2.5 px-3">Target Patient</th>
                <th className="py-2.5 px-3">Data Scope</th>
                <th className="py-2.5 px-3">Clinical Purpose</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No access requests matching this filter.
                  </td>
                </tr>
              ) : (
                filteredRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-blue-600">{req.id}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{req.doctorName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{req.doctorId} • {req.doctorSpecialty}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800">{req.patientName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{req.patientId}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {req.categories.map(cat => (
                          <span
                            key={cat}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 border border-slate-200 text-slate-700"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 text-xs max-w-xs truncate" title={req.purpose}>
                      {req.purpose}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-800 font-bold">
                      {req.requestedDurationHours} Hours
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={req.status} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {req.status === 'Pending' ? (
                          <>
                            <button
                              onClick={() => handleApprove(req.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleReject(req.id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          </>
                        ) : req.status === 'Approved' ? (
                          <button
                            onClick={() => handleRevoke(req.id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-rose-700 text-[11px] font-semibold border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Lock className="w-3 h-3 text-rose-600" />
                            <span>Revoke</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient Consent Rules Panel */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-blue-600" />
          Patient Consent Master Policies
        </h3>
        <p className="text-xs text-slate-500">
          Global consent governance profiles configured by hospital ethics board and GDPR/HIPAA standards
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-bold text-slate-800">Electronic Health Record (EHR) Access</div>
            <p className="text-[11px] text-slate-500">Permitted for primary care team and assigned clinical staff.</p>
            <span className="text-emerald-600 font-mono text-[10px] font-bold block pt-1">DEFAULT ALLOWED</span>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-bold text-slate-800">Emergency Break-Glass Override</div>
            <p className="text-[11px] text-slate-500">Immediate trauma physician bypass with immutable blockchain logging.</p>
            <span className="text-rose-600 font-mono text-[10px] font-bold block pt-1">MANDATORY PROTOCOL</span>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-bold text-slate-800">Secondary AI Research Export</div>
            <p className="text-[11px] text-slate-500">Requires explicit separate consent and cryptographic pseudonymization.</p>
            <span className="text-amber-600 font-mono text-[10px] font-bold block pt-1">RESTRICTED OPT-IN</span>
          </div>
        </div>
      </div>

      {/* Request Modal */}
      <RequestAccessModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        patients={patients}
        onRequestSubmitted={triggerRefresh}
      />
    </div>
  );
};
