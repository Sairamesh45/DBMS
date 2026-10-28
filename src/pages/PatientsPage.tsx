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

  // RBAC Access Guard: Patient cannot browse other hospital patients
  if (activeRole === 'Patient') {
    return (
      <div className="p-8 sm:p-12 bubbly-glass text-center max-w-lg mx-auto my-12 space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#FDF0EE] text-[#BF4E3B] border border-[#F5CAC3] flex items-center justify-center mx-auto shadow-xs">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#2A241E] font-serif">Access Restricted • Patient Privacy Guard</h2>
          <p className="text-xs text-[#756A5C] mt-2 leading-relaxed">
            In compliance with HIPAA medical privacy rules and hospital data governance, patient accounts are restricted from accessing hospital-wide patient rosters and enrollment consoles.
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
      {/* Page Header */}
      <div className="bubbly-glass p-6 md:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#9C7854] to-[#85613D] text-white flex items-center justify-center shadow-xs">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#2A241E] font-serif">
              Patient Health Registry
            </h1>
            <p className="text-xs text-[#756A5C] mt-1">
              Registered hospital patients with hardware sensor assignments and real-time trust scoring.
            </p>
          </div>
        </div>

        {activeRole === 'Admin' ? (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="pill-btn-primary shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Enroll Patient</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 border border-white/80 text-[#756A5C] text-xs font-semibold shadow-2xs">
            <Users className="w-3.5 h-3.5 text-[#9C7854]" />
            <span>Clinical Directory (Read-Only)</span>
          </div>
        )}
      </div>

      {/* Search & Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-4 rounded-2xl bg-white/70 border border-white/80 shadow-2xs backdrop-blur-md">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#756A5C]" />
          <input
            type="text"
            placeholder="Search by Patient ID, Name, or Condition..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-full bg-white border border-[rgba(160,140,115,0.2)] text-[#2A241E] text-xs focus:outline-hidden focus:border-[#9C7854] shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[#756A5C] shrink-0" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 rounded-full bg-white border border-[rgba(160,140,115,0.2)] text-[#2A241E] text-xs focus:outline-hidden cursor-pointer shadow-xs"
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
      <div className="bubbly-glass p-6 md:p-7 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[rgba(160,140,115,0.12)] text-[#756A5C] font-semibold text-[11px] uppercase tracking-wider">
                <th
                  onClick={() => handleSort('id')}
                  className="py-3 px-3 cursor-pointer hover:text-[#2A241E]"
                >
                  <div className="flex items-center gap-1 font-mono">
                    <span>Patient ID</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-3 cursor-pointer hover:text-[#2A241E]"
                >
                  <div className="flex items-center gap-1">
                    <span>Name & Ward</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('age')}
                  className="py-3 px-3 cursor-pointer hover:text-[#2A241E]"
                >
                  <div className="flex items-center gap-1">
                    <span>Age / Gender</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3">Assigned Sensors</th>
                <th className="py-3 px-3">Latest Vitals</th>
                <th className="py-3 px-3">Status</th>
                <th
                  onClick={() => handleSort('latestTrustScore')}
                  className="py-3 px-3 cursor-pointer hover:text-[#2A241E] text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Trust Score</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(160,140,115,0.08)]">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#756A5C]">
                    No patients matching the specified criteria.
                  </td>
                </tr>
              ) : (
                filteredPatients.map(pt => (
                  <tr key={pt.id} className="hover:bg-white/60 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#9C7854]">{pt.id}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-[#2A241E]">{pt.name}</div>
                      <div className="text-[11px] text-[#756A5C] truncate max-w-xs">{pt.ward}</div>
                    </td>
                    <td className="py-3 px-3 text-[#756A5C] text-[11px]">
                      {pt.age} yrs • {pt.gender} • <span className="font-semibold text-[#2A241E]">{pt.bloodGroup}</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {pt.assignedSensors.map((sid: string) => (
                          <span
                            key={sid}
                            className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white border border-[rgba(160,140,115,0.2)] text-[#2A241E] shadow-2xs"
                          >
                            {sid}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[#756A5C] font-mono text-[11px]">
                      {new Date(pt.latestMeasurementTime).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={pt.monitoringStatus} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-right font-serif font-bold text-sm">
                      <span
                        className={
                          pt.latestTrustScore >= 90
                            ? 'text-[#2D6643]'
                            : pt.latestTrustScore >= 75
                            ? 'text-[#9C7854]'
                            : 'text-[#B87B32]'
                        }
                      >
                        {pt.latestTrustScore.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleLaunchLiveMonitor(pt.id)}
                          className="p-1.5 rounded-full bg-white/80 hover:bg-white text-[#9C7854] border border-[rgba(160,140,115,0.25)] transition-all cursor-pointer shadow-2xs"
                          title="Open Live ECG Oscilloscope Workstation"
                        >
                          <Activity className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedPatientForDrawer(pt)}
                          className="p-1.5 rounded-full bg-white/80 hover:bg-white text-[#2A241E] border border-[rgba(160,140,115,0.25)] transition-all cursor-pointer shadow-2xs"
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
