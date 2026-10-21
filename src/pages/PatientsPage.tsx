import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Eye,
  ShieldCheck,
  Activity,
  Lock,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { MedicalMeasurement, Patient, Sensor } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { AddPatientModal } from '../components/forms/AddPatientModal';
import { PatientDetailDrawer } from '../components/inspection/PatientDetailDrawer';
import { useGateway } from '../context/GatewayContext';
import { useNavigate } from 'react-router-dom';
import { INITIAL_PATIENTS } from '../data/mockData';

export const PatientsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeRole, refreshTrigger, triggerRefresh, setSelectedPatientId } = useGateway();

  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [measurements, setMeasurements] = useState<MedicalMeasurement[]>([]);

  // Search, filter & sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'id' | 'name' | 'age' | 'latestTrustScore'>('id');
  const [sortAsc, setSortAsc] = useState(true);

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPatientForDrawer, setSelectedPatientForDrawer] = useState<Patient | null>(null);

  useEffect(() => {
    // Independent resilient fetches
    dataService.getPatients().then(setPatients).catch(err => console.warn('Patients fetch:', err));
    dataService.getSensors().then(setSensors).catch(err => console.warn('Sensors fetch:', err));
    dataService.getMeasurements().then(setMeasurements).catch(err => console.warn('Measurements fetch:', err));
  }, [refreshTrigger]);

  const filteredPatients = useMemo(() => {
    return patients
      .filter(p => {
        const matchesSearch =
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.condition.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || p.monitoringStatus === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        let valA: string | number = a[sortField];
        let valB: string | number = b[sortField];
        if (typeof valA === 'string') {
          return sortAsc
            ? valA.localeCompare(valB as string)
            : (valB as string).localeCompare(valA);
        }
        return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
      });
  }, [patients, searchQuery, statusFilter, sortField, sortAsc]);

  const handleSort = (field: 'id' | 'name' | 'age' | 'latestTrustScore') => {
    if (sortField === field) {
      setSortAsc(prev => !prev);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleLaunchLiveMonitor = (ptId: string) => {
    setSelectedPatientId(ptId);
    navigate('/monitoring');
  };

  // RBAC Access Guard: Patient cannot browse or enroll other hospital patients
  if (activeRole === 'Patient') {
    return (
      <div className="p-8 sm:p-12 rounded-2xl bg-white border border-[#e6dfd5] text-center max-w-lg mx-auto my-12 space-y-4 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-[#fdf3f3] text-[#9e2a2b] border border-[#f5cacc] flex items-center justify-center mx-auto shadow-2xs">
          <Lock className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#2c2623]">Access Restricted • Patient Privacy Guard</h2>
          <p className="text-xs text-[#78716c] mt-2 leading-relaxed">
            In compliance with HIPAA medical privacy rules and hospital data governance, patient accounts are restricted from accessing hospital-wide patient rosters and enrollment consoles.
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#2c2623] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#8c6d46]" />
            Patient Health Registry
          </h1>
          <p className="text-xs text-[#78716c] mt-1">
            Registered hospital patients with hardware sensor assignments and real-time trust scoring
          </p>
        </div>

        {activeRole === 'Admin' ? (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8c6d46] hover:bg-[#745733] text-white font-semibold text-xs transition-colors shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Enroll Patient</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#faf7f2] border border-[#e6dfd5] text-[#78716c] text-xs font-medium">
            <Users className="w-3.5 h-3.5 text-[#8c6d46]" />
            <span>Clinical Directory (Read-Only)</span>
          </div>
        )}
      </div>

      {/* Search & Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3.5 rounded-2xl bg-white border border-[#e6dfd5] shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#78716c]" />
          <input
            type="text"
            placeholder="Search by Patient ID, Name, or Condition..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#faf7f2] border border-[#e6dfd5] text-[#2c2623] text-xs focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[#78716c] shrink-0" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#faf7f2] border border-[#e6dfd5] text-[#2c2623] text-xs focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Critical">Critical</option>
            <option value="Observation">Observation</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Patients Table */}
      <div className="rounded-2xl border border-[#e6dfd5] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e6dfd5] bg-[#faf7f2] text-[#78716c] font-semibold text-[11px] uppercase tracking-wider">
                <th
                  onClick={() => handleSort('id')}
                  className="py-3 px-4 cursor-pointer hover:text-[#2c2623]"
                >
                  <div className="flex items-center gap-1 font-mono">
                    <span>Patient ID</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:text-[#2c2623]"
                >
                  <div className="flex items-center gap-1">
                    <span>Name & Ward</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('age')}
                  className="py-3 px-4 cursor-pointer hover:text-[#2c2623]"
                >
                  <div className="flex items-center gap-1">
                    <span>Age / Gender</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Assigned Hardware Sensors</th>
                <th className="py-3 px-4">Latest Measurement</th>
                <th className="py-3 px-4">Monitoring Status</th>
                <th
                  onClick={() => handleSort('latestTrustScore')}
                  className="py-3 px-4 cursor-pointer hover:text-[#2c2623] text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Trust Score</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5efeb]">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#78716c]">
                    No patients matching the specified criteria.
                  </td>
                </tr>
              ) : (
                filteredPatients.map(pt => (
                  <tr key={pt.id} className="hover:bg-[#faf7f2] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#8c6d46]">{pt.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#2c2623]">{pt.name}</div>
                      <div className="text-[11px] text-[#78716c] truncate max-w-xs">{pt.ward}</div>
                    </td>
                    <td className="py-3 px-4 text-[#78716c] text-[11px]">
                      {pt.age} yrs • {pt.gender} • <span className="font-semibold text-[#2c2623]">{pt.bloodGroup}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {pt.assignedSensors.map((sid: string) => (
                          <span
                            key={sid}
                            className="px-1.5 py-0.5 rounded-lg text-[10px] font-mono bg-[#f5efeb] border border-[#d8cfc2] text-[#2c2623]"
                          >
                            {sid}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#78716c] font-mono text-[11px]">
                      {new Date(pt.latestMeasurementTime).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={pt.monitoringStatus} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      <span
                        className={
                          pt.latestTrustScore >= 90
                            ? 'text-[#2d6e42]'
                            : pt.latestTrustScore >= 75
                            ? 'text-[#8c6d46]'
                            : 'text-[#b58550]'
                        }
                      >
                        {pt.latestTrustScore.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleLaunchLiveMonitor(pt.id)}
                          className="p-1.5 rounded-lg bg-[#faf7f2] hover:bg-[#efe8df] text-[#8c6d46] border border-[#d8cfc2] transition-colors cursor-pointer"
                          title="Open Live ECG Oscilloscope Workstation"
                        >
                          <Activity className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedPatientForDrawer(pt)}
                          className="p-1.5 rounded-lg bg-[#faf7f2] hover:bg-[#efe8df] text-[#2c2623] border border-[#d8cfc2] transition-colors cursor-pointer"
                          title="View Patient Details & History"
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

      {/* Add Patient Modal */}
      <AddPatientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        availableSensors={sensors}
        onPatientAdded={triggerRefresh}
      />

      {/* Patient Detail Drawer */}
      <PatientDetailDrawer
        patient={selectedPatientForDrawer}
        isOpen={!!selectedPatientForDrawer}
        onClose={() => setSelectedPatientForDrawer(null)}
        sensors={sensors}
        measurements={measurements}
      />
    </div>
  );
};
