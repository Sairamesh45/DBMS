import React, { useState, useEffect } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  Download,
  Eye,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { AuditLog } from '../types';
import { Modal } from '../components/common/Modal';
import { useGateway } from '../context/GatewayContext';
import { useToast } from '../context/ToastContext';

export const AuditLogsPage: React.FC = () => {
  const { showToast } = useToast();
  const { refreshTrigger } = useGateway();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    dataService.getAuditLogs().then(setLogs);
  }, [refreshTrigger]);

  const filteredLogs = logs.filter(l => {
    const matchesSearch =
      l.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.details.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || l.category === categoryFilter;
    const matchesSeverity = severityFilter === 'ALL' || l.severity === severityFilter;
    return matchesSearch && matchesCategory && matchesSeverity;
  });

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `medguard-audit-logs-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast({
      type: 'success',
      title: 'Audit Logs Exported',
      message: `Exported ${filteredLogs.length} audit records in JSON format.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-blue-600" />
            Unified System & Security Audit Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-resistant chronological timeline recording authentication, telemetry, access grants, and security incidents
          </p>
        </div>

        <button
          onClick={handleExportJSON}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs transition-colors shadow-2xs shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-4 h-4 text-blue-600" />
          <span>Export Audit Log</span>
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search audit events by action, actor, resource, or keywords..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:border-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs focus:border-blue-500 focus:outline-hidden cursor-pointer"
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
            className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs focus:border-blue-500 focus:outline-hidden cursor-pointer"
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
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
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
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No audit logs matching this search filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 font-mono text-xs">{log.actor}</div>
                      <div className="text-[10px] text-slate-400">{log.role}</div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-blue-600">
                      {log.action}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{log.category}</td>
                    <td className="py-3 px-3 font-mono text-slate-700">{log.resource}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                          log.outcome === 'ALERT'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : log.outcome === 'WARNING'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : log.outcome === 'BLOCKED'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {log.outcome}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[11px] font-medium ${
                          log.severity === 'Critical'
                            ? 'text-rose-600 font-bold'
                            : log.severity === 'High'
                            ? 'text-amber-600 font-bold'
                            : log.severity === 'Medium'
                            ? 'text-blue-600'
                            : 'text-slate-500'
                        }`}
                      >
                        {log.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                        title="Inspect Log Entry"
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
          title={`Audit Log Record • ${selectedLog.id}`}
          subtitle={`Event Action: ${selectedLog.action}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs space-y-2">
              <div className="flex justify-between text-slate-500">
                <span>Timestamp:</span>
                <span className="text-slate-800">{new Date(selectedLog.timestamp).toISOString()}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Actor & Role:</span>
                <span className="text-blue-600 font-bold">{selectedLog.actor} ({selectedLog.role})</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Resource:</span>
                <span className="text-slate-800">{selectedLog.resource}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Category & Severity:</span>
                <span className="text-slate-800">{selectedLog.category} • {selectedLog.severity}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs">
              <div className="text-slate-500 mb-1 font-medium">Details & Rationale:</div>
              <p className="text-slate-800 leading-relaxed">{selectedLog.details}</p>
            </div>

            <pre className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-mono text-xs overflow-x-auto">
              {JSON.stringify(selectedLog, null, 2)}
            </pre>
          </div>
        </Modal>
      )}
    </div>
  );
};
