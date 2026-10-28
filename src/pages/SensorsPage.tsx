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
      <div className="p-8 sm:p-12 bubbly-glass text-center max-w-lg mx-auto my-12 space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#FDF0EE] text-[#BF4E3B] border border-[#F5CAC3] flex items-center justify-center mx-auto shadow-xs">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#2A241E] font-serif">Access Restricted • Patient Privacy Guard</h2>
          <p className="text-xs text-[#756A5C] mt-2 leading-relaxed">
            In compliance with hospital IT security standards, patient accounts are restricted from accessing hospital-wide IoT hardware provisioning consoles and simulated silicon PUF tokens.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="pill-btn-primary"
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
      <div className="bubbly-glass p-6 md:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#9C7854] to-[#85613D] text-white flex items-center justify-center shadow-xs">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#2A241E] font-serif">
              Medical Hardware Sensor Trust Registry
            </h1>
            <p className="text-xs text-[#756A5C] mt-1">
              Simulated PUF device identity authentication, signal quality telemetry, and hardware quarantine.
            </p>
          </div>
        </div>

        {activeRole === 'Admin' ? (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="pill-btn-primary shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Provision Sensor</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 border border-white/80 text-[#756A5C] text-xs font-semibold shadow-2xs">
            <Cpu className="w-3.5 h-3.5 text-[#9C7854]" />
            <span>Sensor Fleet (Read-Only)</span>
          </div>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-4 rounded-2xl bg-white/70 border border-white/80 shadow-2xs backdrop-blur-md">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#756A5C]" />
          <input
            type="text"
            placeholder="Search by Sensor ID, Patient, or PUF Token..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-full bg-white border border-[rgba(160,140,115,0.2)] text-[#2A241E] text-xs focus:outline-hidden focus:border-[#9C7854] shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[#756A5C] shrink-0" />
          <select
            value={authFilter}
            onChange={e => setAuthFilter(e.target.value)}
            className="px-3.5 py-2 rounded-full bg-white border border-[rgba(160,140,115,0.2)] text-[#2A241E] text-xs focus:outline-hidden cursor-pointer shadow-xs"
          >
            <option value="ALL">All Auth States</option>
            <option value="Authenticated">Authenticated</option>
            <option value="Pending Challenge">Pending Challenge</option>
            <option value="Quarantined">Quarantined / Blocked</option>
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3.5 py-2 rounded-full bg-white border border-[rgba(160,140,115,0.2)] text-[#2A241E] text-xs focus:outline-hidden cursor-pointer shadow-xs"
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
      <div className="bubbly-glass p-6 md:p-7 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[rgba(160,140,115,0.12)] text-[#756A5C] font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 font-mono">Sensor ID</th>
                <th className="py-3 px-3">Sensor Type</th>
                <th className="py-3 px-3">Assigned Patient</th>
                <th className="py-3 px-3 font-mono">PUF Token</th>
                <th className="py-3 px-3">Auth Status</th>
                <th className="py-3 px-3">Device Trust</th>
                <th className="py-3 px-3">Signal Quality</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(160,140,115,0.08)]">
              {filteredSensors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#756A5C]">
                    No hardware sensors found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredSensors.map(sensor => (
                  <tr key={sensor.id} className="hover:bg-white/60 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#9C7854]">{sensor.id}</td>
                    <td className="py-3 px-3 font-medium text-[#2A241E]">{sensor.type}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-[#2A241E]">{sensor.patientName}</div>
                      <div className="text-[11px] text-[#756A5C] font-mono">{sensor.patientId}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-[#756A5C] max-w-[140px] truncate">
                      {sensor.hardwareFingerprint}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={sensor.authStatus} size="sm" />
                    </td>
                    <td className="py-3 px-3 font-serif font-bold text-sm">
                      <span className={sensor.deviceTrust >= 80 ? 'text-[#2D6643]' : 'text-[#BF4E3B]'}>
                        {sensor.deviceTrust} / 100
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[#756A5C]">
                      {sensor.signalQuality}%
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleAuthenticate(sensor)}
                          disabled={authenticatingId === sensor.id}
                          className="px-3 py-1 rounded-full bg-[#EBF3ED] hover:bg-[#D4EBDC] border border-[#C8E1D2] text-[#2D6643] font-semibold text-[11px] cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-2xs"
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
                          className="p-1.5 rounded-full bg-[#FDF0EE] hover:bg-[#FBE0DC] border border-[#F5CAC3] text-[#BF4E3B] transition-all cursor-pointer shadow-2xs"
                          title="Quarantine Sensor"
                        >
                          <ShieldX className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setSelectedSensorForDrawer(sensor)}
                          className="p-1.5 rounded-full bg-white/80 hover:bg-white border border-[rgba(160,140,115,0.25)] text-[#2A241E] transition-all cursor-pointer shadow-2xs"
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
