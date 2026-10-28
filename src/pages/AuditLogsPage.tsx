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
      <div className="p-8 sm:p-12 bubbly-glass text-center max-w-lg mx-auto my-12 space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#FDF0EE] text-[#BF4E3B] border border-[#F5CAC3] flex items-center justify-center mx-auto shadow-xs">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#2A241E] font-serif">Access Restricted • Forensic Audit Trail</h2>
          <p className="text-xs text-[#756A5C] mt-2 leading-relaxed">
            Consortium-wide system audit logs and forensic security timelines are restricted to Certified Consortium Auditors and IT Security Administrators.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="pill-btn-primary"
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
      <div className="bubbly-glass p-6 md:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#9C7854] to-[#85613D] text-white flex items-center justify-center shadow-xs">
            <ScrollText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#2A241E] font-serif">
              Unified System & Security Audit Ledger
            </h1>
            <p className="text-xs text-[#756A5C] mt-1">
              Tamper-resistant chronological timeline recording authentication, telemetry, access grants, and security incidents.
            </p>
          </div>
        </div>

        <button
          onClick={handleExportJSON}
          className="pill-btn-secondary shrink-0 self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-[#9C7854]" />
          <span>Export Audit Log</span>
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-4 rounded-2xl bg-white/70 border border-white/80 shadow-2xs backdrop-blur-md">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#756A5C]" />
          <input
            type="text"
            placeholder="Search audit events by action, actor, resource, or keywords..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-full bg-white border border-[rgba(160,140,115,0.2)] text-[#2A241E] text-xs focus:outline-hidden focus:border-[#9C7854] shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[#756A5C] shrink-0" />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3.5 py-2 rounded-full bg-white border border-[rgba(160,140,115,0.2)] text-[#2A241E] text-xs focus:outline-hidden cursor-pointer shadow-xs"
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
            className="px-3.5 py-2 rounded-full bg-white border border-[rgba(160,140,115,0.2)] text-[#2A241E] text-xs focus:outline-hidden cursor-pointer shadow-xs"
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
      <div className="bubbly-glass p-6 md:p-7 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[rgba(160,140,115,0.12)] text-[#756A5C] font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 font-mono">Timestamp</th>
                <th className="py-3 px-3">Actor & Role</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 font-mono">Target Resource</th>
                <th className="py-3 px-3">Outcome</th>
                <th className="py-3 px-3">Severity</th>
                <th className="py-3 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(160,140,115,0.08)] font-sans">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#756A5C]">
                    No audit records match the selected search or filters.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-white/60 transition-colors">
                    <td className="py-3 px-3 font-mono text-[#756A5C] text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-[#2A241E]">{log.actor}</div>
                      <div className="text-[10px] text-[#756A5C]">{log.role}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] font-semibold text-[#9C7854]">
                      {log.action}
                    </td>
                    <td className="py-3 px-3 text-[#756A5C] text-[11px]">{log.category}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-[#2A241E]">{log.resource}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          log.outcome === 'SUCCESS'
                            ? 'bg-[#EBF3ED] text-[#2D6643] border border-[#C8E1D2]'
                            : log.outcome === 'WARNING'
                            ? 'bg-[#FCF4E9] text-[#9A6424] border border-[#F2DAC0]'
                            : 'bg-[#FDF0EE] text-[#BF4E3B] border border-[#F5CAC3]'
                        }`}
                      >
                        {log.outcome}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[11px] font-bold ${
                          log.severity === 'Critical'
                            ? 'text-[#BF4E3B]'
                            : log.severity === 'High'
                            ? 'text-[#C75341]'
                            : log.severity === 'Medium'
                            ? 'text-[#B87B32]'
                            : 'text-[#756A5C]'
                        }`}
                      >
                        {log.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 rounded-full hover:bg-white text-[#756A5C] hover:text-[#2A241E] transition-all cursor-pointer shadow-2xs"
                        title="View Full Entry"
                      >
                        <Eye className="w-4 h-4" />
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
          <div className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#FAF7F2] border border-[rgba(160,140,115,0.15)]">
              <div>
                <span className="text-[#756A5C] text-[11px] block">Actor / Role:</span>
                <span className="font-bold text-[#2A241E] text-sm mt-0.5 block">{selectedLog.actor} ({selectedLog.role})</span>
              </div>
              <div>
                <span className="text-[#756A5C] text-[11px] block">Outcome:</span>
                <span className="font-bold text-[#2A241E] text-sm mt-0.5 block">{selectedLog.outcome}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/80 border border-white/90 shadow-2xs">
              <span className="text-[#756A5C] text-[11px] block mb-1 font-medium">Details:</span>
              <p className="text-[#2A241E] font-mono leading-relaxed text-xs">{selectedLog.details}</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
