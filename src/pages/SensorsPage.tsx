import React, { useState, useEffect, useMemo } from 'react';
import {
  Cpu,
  Search,
  Filter,
  Plus,
  ShieldX,
  ShieldCheck,
  RefreshCw,
  Eye,
  Lock,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { Patient, Sensor } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { AddSensorModal } from '../components/forms/AddSensorModal';
import { SensorDetailDrawer } from '../components/inspection/SensorDetailDrawer';
import { useGateway } from '../context/GatewayContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { INITIAL_SENSORS } from '../data/mockData';

export const SensorsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { activeRole, refreshTrigger, triggerRefresh } = useGateway();

  const [sensors, setSensors] = useState<Sensor[]>(INITIAL_SENSORS);
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
    // Independent resilient fetches
    dataService.getSensors().then(setSensors).catch(err => console.warn('Sensors fetch:', err));
    dataService.getPatients().then(setPatients).catch(err => console.warn('Patients fetch:', err));
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
    if (activeRole !== 'Admin') {
      showToast({
        type: 'warning',
        title: 'Action Unauthorized',
        message: 'Only Administrators are authorized to quarantine hardware nodes.',
      });
      return;
    }
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

  // RBAC Access Guard: Patient cannot view or manage hospital IoT hardware network
  if (activeRole === 'Patient') {
    return (
      <div className="p-8 sm:p-12 rounded-2xl bg-white border border-[#e6dfd5] text-center max-w-lg mx-auto my-12 space-y-4 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-[#fdf3f3] text-[#9e2a2b] border border-[#f5cacc] flex items-center justify-center mx-auto shadow-2xs">
          <Lock className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#2c2623]">Access Restricted • Patient Privacy Guard</h2>
          <p className="text-xs text-[#78716c] mt-2 leading-relaxed">
            In compliance with hospital IT security standards, patient accounts are restricted from accessing hospital-wide IoT hardware provisioning consoles and simulated silicon PUF tokens.
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#2c2623] flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#8c6d46]" />
            Medical Hardware Sensor Trust Registry
          </h1>
          <p className="text-xs text-[#78716c] mt-1">
            Simulated PUF device identity authentication, signal quality telemetry, and hardware quarantine
          </p>
        </div>

        {activeRole === 'Admin' ? (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8c6d46] hover:bg-[#745733] text-white font-semibold text-xs transition-colors shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Provision Sensor</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#faf7f2] border border-[#e6dfd5] text-[#78716c] text-xs font-medium">
            <Cpu className="w-3.5 h-3.5 text-[#8c6d46]" />
            <span>Sensor Fleet (Read-Only)</span>
          </div>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3.5 rounded-2xl bg-white border border-[#e6dfd5] shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#78716c]" />
          <input
            type="text"
            placeholder="Search by Sensor ID, Patient, or PUF Token..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#faf7f2] border border-[#e6dfd5] text-[#2c2623] text-xs focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[#78716c] shrink-0" />
          <select
            value={authFilter}
            onChange={e => setAuthFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#faf7f2] border border-[#e6dfd5] text-[#2c2623] text-xs focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Auth States</option>
            <option value="Authenticated">Authenticated</option>
            <option value="Pending Challenge">Pending Challenge</option>
            <option value="Quarantined">Quarantined / Blocked</option>
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#faf7f2] border border-[#e6dfd5] text-[#2c2623] text-xs focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Types</option>
            <option value="12-Lead ECG">12-Lead ECG</option>
            <option value="Pulse Oximeter (SpO2)">Pulse Oximeter (SpO2)</option>
            <option value="Continuous NIBP">Continuous NIBP</option>
            <option value="Temperature Sensor">Temperature Sensor</option>
            <option value="Capnography (EtCO2)">Capnography (EtCO2)</option>
          </select>
        </div>
      </div>

      {/* Sensors Table */}
      <div className="rounded-2xl border border-[#e6dfd5] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e6dfd5] bg-[#faf7f2] text-[#78716c] font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-mono">Sensor ID</th>
                <th className="py-3 px-4">Sensor Type</th>
                <th className="py-3 px-4">Assigned Patient</th>
                <th className="py-3 px-4 font-mono">PUF Token</th>
                <th className="py-3 px-4">Auth Status</th>
                <th className="py-3 px-4">Device Trust</th>
                <th className="py-3 px-4">Signal Quality</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5efeb]">
              {filteredSensors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#78716c]">
                    No hardware sensors found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredSensors.map(sensor => (
                  <tr key={sensor.id} className="hover:bg-[#faf7f2] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#8c6d46]">{sensor.id}</td>
                    <td className="py-3 px-4 font-medium text-[#2c2623]">{sensor.type}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#2c2623]">{sensor.patientName}</div>
                      <div className="text-[11px] text-[#78716c] font-mono">{sensor.patientId}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#78716c] max-w-[140px] truncate">
                      {sensor.hardwareFingerprint}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={sensor.authStatus} size="sm" />
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">
                      <span className={sensor.deviceTrust >= 80 ? 'text-[#2d6e42]' : 'text-[#9e2a2b]'}>
                        {sensor.deviceTrust} / 100
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#78716c]">
                      {sensor.signalQuality}%
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleAuthenticate(sensor)}
                          disabled={authenticatingId === sensor.id}
                          className="px-2.5 py-1 rounded-lg bg-[#f2f7f3] hover:bg-[#e2ede4] border border-[#c6dcce] text-[#2d6e42] font-semibold text-[11px] cursor-pointer transition-colors flex items-center gap-1 disabled:opacity-50"
                          title="Simulate PUF Challenge-Response Protocol"
                        >
                          {authenticatingId === sensor.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <ShieldCheck className="w-3 h-3" />
                          )}
                          <span>Challenge</span>
                        </button>

                        <button
                          onClick={() => handleQuarantine(sensor)}
                          className="p-1 rounded-lg bg-[#fdf3f3] hover:bg-[#fae4e5] border border-[#f5cacc] text-[#9e2a2b] transition-colors cursor-pointer"
                          title="Quarantine Sensor"
                        >
                          <ShieldX className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setSelectedSensorForDrawer(sensor)}
                          className="p-1 rounded-lg bg-[#faf7f2] hover:bg-[#efe8df] border border-[#d8cfc2] text-[#2c2623] transition-colors cursor-pointer"
                          title="View Hardware Specs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
