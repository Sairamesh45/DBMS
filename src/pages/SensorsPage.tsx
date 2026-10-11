import React, { useState, useEffect, useMemo } from 'react';
import {
  Cpu,
  Search,
  Filter,
  Plus,
  ShieldX,
  Sparkles,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { Patient, Sensor } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { AddSensorModal } from '../components/forms/AddSensorModal';
import { SensorDetailDrawer } from '../components/inspection/SensorDetailDrawer';
import { useGateway } from '../context/GatewayContext';
import { useToast } from '../context/ToastContext';

export const SensorsPage: React.FC = () => {
  const { showToast } = useToast();
  const { refreshTrigger, triggerRefresh } = useGateway();

  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [authFilter, setAuthFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modals & Inspection
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSensorForDrawer, setSelectedSensorForDrawer] = useState<Sensor | null>(null);
  const [authenticatingId, setAuthenticatingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([dataService.getSensors(), dataService.getPatients()]).then(([sns, pts]) => {
      setSensors(sns);
      setPatients(pts);
    });
  }, [refreshTrigger]);

  const filteredSensors = useMemo(() => {
    return sensors.filter(s => {
      const matchesSearch =
        s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.hardwareFingerprint.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAuth = authFilter === 'ALL' || s.authStatus === authFilter;
      const matchesType = typeFilter === 'ALL' || s.type === typeFilter;
      return matchesSearch && matchesAuth && matchesType;
    });
  }, [sensors, searchQuery, authFilter, typeFilter]);

  const handleAuthenticate = async (sensor: Sensor) => {
    setAuthenticatingId(sensor.id);
    try {
      const result = await dataService.authenticateSensor(sensor.id);
      triggerRefresh();
      showToast({
        type: result.success ? 'success' : 'error',
        title: result.success ? 'Hardware Token Validated' : 'Authentication Failed',
        message: `${sensor.id}: ${result.message} (${result.latencyMs}ms)`,
      });
    } catch (e: any) {
      console.error(e);
    } finally {
      setAuthenticatingId(null);
    }
  };

  const handleQuarantine = async (sensor: Sensor) => {
    try {
      await dataService.quarantineSensor(sensor.id);
      triggerRefresh();
      showToast({
        type: 'warning',
        title: 'Sensor Quarantined',
        message: `Device ${sensor.id} has been blocked and quarantined by gateway.`,
      });
    } catch (e: any) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-600" />
            Medical Hardware Sensor Trust Registry
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Simulated PUF device identity authentication, signal quality telemetry, and hardware quarantine
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Provision Sensor</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Sensor ID, Patient, or PUF Token..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:border-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={authFilter}
            onChange={e => setAuthFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs focus:border-blue-500 focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Auth States</option>
            <option value="Authenticated">Authenticated</option>
            <option value="Pending Challenge">Pending Challenge</option>
            <option value="Quarantined">Quarantined / Blocked</option>
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs focus:border-blue-500 focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Types</option>
            <option value="12-Lead ECG">12-Lead ECG</option>
            <option value="Pulse Oximeter (SpO2)">SpO2 Pulse Oximeter</option>
            <option value="Continuous NIBP">Continuous NIBP</option>
            <option value="Temperature Sensor">Temperature</option>
            <option value="Capnography (EtCO2)">Capnography</option>
          </select>
        </div>
      </div>

      {/* Sensor Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-mono">Sensor ID</th>
                <th className="py-3 px-4">Modality Type</th>
                <th className="py-3 px-4">Assigned Patient</th>
                <th className="py-3 px-4">PUF Fingerprint</th>
                <th className="py-3 px-4">Auth Status</th>
                <th className="py-3 px-4">Signal Q.</th>
                <th className="py-3 px-4">Trust (DT)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredSensors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No hardware sensors found.
                  </td>
                </tr>
              ) : (
                filteredSensors.map(sensor => {
                  const isCurrentAuthenticating = authenticatingId === sensor.id;
                  return (
                    <tr key={sensor.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">{sensor.id}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{sensor.type}</td>
                      <td className="py-3 px-4 text-slate-700">
                        <div className="font-medium">{sensor.patientName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{sensor.patientId}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-[11px] text-slate-600 truncate max-w-xs bg-slate-50 px-2 py-1 rounded border border-slate-200">
                          {sensor.hardwareFingerprint}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={sensor.authStatus} size="sm" />
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className={sensor.signalQuality >= 80 ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                          {sensor.signalQuality}%
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        <span className={sensor.deviceTrust >= 80 ? 'text-blue-600' : 'text-rose-600'}>
                          {sensor.deviceTrust}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {sensor.authStatus !== 'Authenticated' ? (
                            <button
                              onClick={() => handleAuthenticate(sensor)}
                              disabled={isCurrentAuthenticating}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                              title="Challenge Hardware Token"
                            >
                              {isCurrentAuthenticating ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Sparkles className="w-3 h-3" />
                              )}
                              <span>Verify</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleQuarantine(sensor)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] transition-colors cursor-pointer"
                              title="Quarantine / Block Device"
                            >
                              <ShieldX className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedSensorForDrawer(sensor)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                            title="Inspect Hardware Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Sensor Modal */}
      <AddSensorModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        patients={patients}
        onSensorAdded={triggerRefresh}
      />

      {/* Sensor Detail Drawer */}
      <SensorDetailDrawer
        sensor={selectedSensorForDrawer}
        isOpen={!!selectedSensorForDrawer}
        onClose={() => setSelectedSensorForDrawer(null)}
        onSensorUpdated={triggerRefresh}
      />
    </div>
  );
};
