import React, { useState, useEffect } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  Download,
  Eye,
  Lock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../services/dataService';
import { AuditLog } from '../types';
import { Modal } from '../components/common/Modal';
import { useGateway } from '../context/GatewayContext';
import { useToast } from '../context/ToastContext';

export const AuditLogsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { activeRole, refreshTrigger } = useGateway();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    dataService.getAuditLogs({
      search: searchQuery,
      category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
      severity: severityFilter !== 'ALL' ? severityFilter : undefined,
    }).then(setLogs).catch(console.warn);
  }, [refreshTrigger, searchQuery, categoryFilter, severityFilter]);

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `medguard-audit-logs-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast({
      type: 'success',
      title: 'Audit Logs Exported',
      message: `Exported ${logs.length} audit records in compliant JSON format.`,
    });
  };

  // RBAC Access Guard: Only Auditor and Admin can inspect forensic audit trail
  if (activeRole === 'Patient' || activeRole === 'Doctor') {
    return (
      <div className="p-8 sm:p-12 rounded-2xl bg-white border border-[#e6dfd5] text-center max-w-lg mx-auto my-12 space-y-4 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-[#fdf3f3] text-[#9e2a2b] border border-[#f5cacc] flex items-center justify-center mx-auto shadow-2xs">
          <Lock className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#2c2623]">Access Restricted • Forensic Audit Trail</h2>
          <p className="text-xs text-[#78716c] mt-2 leading-relaxed">
            Consortium-wide system audit logs and forensic security timelines are restricted to Certified Consortium Auditors and IT Security Administrators.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-xl bg-[#8c6d46] hover:bg-[#745733] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#2c2623] flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-[#8c6d46]" />
            Unified System & Security Audit Ledger
          </h1>
          <p className="text-xs text-[#78716c] mt-1">
            Tamper-resistant chronological timeline recording authentication, telemetry, access grants, and security incidents
          </p>
        </div>

        <button
          onClick={handleExportJSON}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-[#faf7f2] text-[#2c2623] border border-[#d8cfc2] font-semibold text-xs transition-colors shadow-2xs shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-4 h-4 text-[#8c6d46]" />
          <span>Export Audit Log</span>
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3.5 rounded-2xl bg-white border border-[#e6dfd5] shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#78716c]" />
          <input
            type="text"
            placeholder="Search audit events by action, actor, resource, or keywords..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#faf7f2] border border-[#e6dfd5] text-[#2c2623] text-xs focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[#78716c] shrink-0" />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#faf7f2] border border-[#e6dfd5] text-[#2c2623] text-xs focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="Authentication">Authentication</option>
            <option value="Telemetry">Telemetry</option>
            <option value="Access Control">Access Control</option>
            <option value="Emergency">Emergency</option>
            <option value="Provenance">Provenance</option>
            <option value="Security Incident">Security Incident</option>
            <option value="Blockchain">Blockchain</option>
          </select>

          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#faf7f2] border border-[#e6dfd5] text-[#2c2623] text-xs focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Severities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl border border-[#e6dfd5] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e6dfd5] bg-[#faf7f2] text-[#78716c] font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3 font-mono">Timestamp</th>
                <th className="py-2.5 px-3">Actor & Role</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 font-mono">Target Resource</th>
                <th className="py-2.5 px-3">Outcome</th>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5efeb] font-sans">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#78716c]">
                    No audit records match the selected search or filters.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-[#faf7f2] transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[#78716c] text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-[#2c2623]">{log.actor}</div>
                      <div className="text-[10px] text-[#78716c]">{log.role}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-[#8c6d46]">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3 text-[#78716c] text-[11px]">{log.category}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#2c2623]">{log.resource}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          log.outcome === 'SUCCESS'
                            ? 'bg-[#f2f7f3] text-[#2d6e42] border border-[#c6dcce]'
                            : log.outcome === 'WARNING'
                            ? 'bg-[#fdf8f0] text-[#b58550] border border-[#f2dfbe]'
                            : 'bg-[#fdf3f3] text-[#9e2a2b] border border-[#f5cacc]'
                        }`}
                      >
                        {log.outcome}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[11px] font-bold ${
                          log.severity === 'Critical'
                            ? 'text-[#9e2a2b]'
                            : log.severity === 'High'
                            ? 'text-[#c2333b]'
                            : log.severity === 'Medium'
                            ? 'text-[#b58550]'
                            : 'text-[#78716c]'
                        }`}
                      >
                        {log.severity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1 rounded-lg hover:bg-[#f5efeb] text-[#78716c] hover:text-[#2c2623] transition-colors cursor-pointer"
                        title="View Full Entry"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Audit Record: ${selectedLog.id}`}
          subtitle={`${selectedLog.category} • ${selectedLog.action}`}
          maxWidth="md"
        >
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#faf7f2] border border-[#e6dfd5]">
              <div>
                <span className="text-[#78716c] text-[11px] block">Actor / Role:</span>
                <span className="font-bold text-[#2c2623]">{selectedLog.actor} ({selectedLog.role})</span>
              </div>
              <div>
                <span className="text-[#78716c] text-[11px] block">Outcome:</span>
                <span className="font-bold text-[#2c2623]">{selectedLog.outcome}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#e6dfd5]">
              <span className="text-[#78716c] text-[11px] block mb-1">Details:</span>
              <p className="text-[#2c2623] font-mono leading-relaxed">{selectedLog.details}</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
