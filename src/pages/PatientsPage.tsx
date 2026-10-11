import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { MedicalMeasurement, Patient, Sensor } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { AddPatientModal } from '../components/forms/AddPatientModal';
import { PatientDetailDrawer } from '../components/inspection/PatientDetailDrawer';
import { useGateway } from '../context/GatewayContext';
import { useNavigate } from 'react-router-dom';

export const PatientsPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshTrigger, triggerRefresh, setSelectedPatientId } = useGateway();

  const [patients, setPatients] = useState<Patient[]>([]);
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
    Promise.all([
      dataService.getPatients(),
      dataService.getSensors(),
      dataService.getMeasurements(),
    ]).then(([pts, sns, ms]) => {
      setPatients(pts);
      setSensors(sns);
      setMeasurements(ms);
    });
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

  const handleInspectProvenance = () => {
    navigate('/provenance');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Patient Health Registry
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Registered hospital patients with hardware sensor assignments and real-time trust scoring
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Enroll Patient</span>
        </button>
      </div>

      {/* Search & Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Patient ID, Name, or Condition..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:border-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs focus:border-blue-500 focus:outline-hidden cursor-pointer"
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
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                <th
                  onClick={() => handleSort('id')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1 font-mono">
                    <span>Patient ID</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Name & Ward</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('age')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900"
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
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Trust Score</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No patients matching the specified criteria.
                  </td>
                </tr>
              ) : (
                filteredPatients.map(pt => (
                  <tr key={pt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">{pt.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{pt.name}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{pt.ward}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-[11px]">
                      {pt.age} yrs • {pt.gender} • <span className="font-semibold text-slate-800">{pt.bloodGroup}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {pt.assignedSensors.map((sid: string) => (
                          <span
                            key={sid}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 border border-slate-200 text-slate-700"
                          >
                            {sid}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(pt.latestMeasurementTime).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={pt.monitoringStatus} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      <span
                        className={
                          pt.latestTrustScore >= 90
                            ? 'text-emerald-600'
                            : pt.latestTrustScore >= 75
                            ? 'text-blue-600'
                            : 'text-amber-600'
                        }
                      >
                        {pt.latestTrustScore.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedPatientForDrawer(pt)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                          title="View Patient Details & History"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={handleInspectProvenance}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 transition-colors cursor-pointer"
                          title="Verify Records in Tamper Ledger"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
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
