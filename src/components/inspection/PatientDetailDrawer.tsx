import React from 'react';
import { Modal } from '../common/Modal';
import { MedicalMeasurement, Patient, Sensor } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { ShieldCheck, Cpu, ArrowRight, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PatientDetailDrawerProps {
  patient: Patient | null;
  isOpen: boolean;
  onClose: () => void;
  sensors: Sensor[];
  measurements: MedicalMeasurement[];
}

export const PatientDetailDrawer: React.FC<PatientDetailDrawerProps> = ({
  patient,
  isOpen,
  onClose,
  sensors,
  measurements,
}) => {
  const navigate = useNavigate();

  if (!patient) return null;

  const patientSensors = sensors.filter(s => patient.assignedSensors.includes(s.id));
  const patientMeasurements = measurements.filter(m => m.patientId === patient.id).slice(0, 5);

  const handleLaunchProvenance = () => {
    onClose();
    navigate('/provenance');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Patient Record • ${patient.name}`}
      subtitle={`Identifier: ${patient.id} • ${patient.ward}`}
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Top Demographics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <span className="text-slate-500 block text-[11px] font-medium">Age / Sex</span>
            <span className="text-slate-900 font-semibold">{patient.age} yrs • {patient.gender}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px] font-medium">Blood Type</span>
            <span className="text-blue-600 font-bold">{patient.bloodGroup}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px] font-medium">Status</span>
            <StatusBadge status={patient.monitoringStatus} size="sm" />
          </div>
          <div>
            <span className="text-slate-500 block text-[11px] font-medium">Trust Score</span>
            <span className="text-emerald-600 font-bold text-sm font-mono">{patient.latestTrustScore}%</span>
          </div>
        </div>

        {/* Clinical Condition */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 block mb-1">Clinical Diagnosis & Medical Condition</span>
          <p className="text-sm font-bold text-slate-900">{patient.condition}</p>
          <p className="text-xs text-slate-600 mt-1">{patient.notes}</p>
        </div>

        {/* Assigned Sensors */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-blue-600" />
              Bound Hardware Sensors ({patientSensors.length})
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {patientSensors.map(s => (
              <div key={s.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900 font-mono">{s.id}</div>
                  <div className="text-[11px] text-slate-500">{s.type}</div>
                </div>
                <div className="text-right">
                  <StatusBadge status={s.authStatus} size="sm" />
                  <div className="text-[10px] font-mono text-blue-600 font-semibold mt-1">Trust: {s.deviceTrust}/100</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Diagnostic Records Log */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5 mb-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Recent Electronic Health Ingestion Records
          </span>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {patientMeasurements.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500 bg-slate-50 rounded-lg">
                No recent measurement records.
              </div>
            ) : (
              patientMeasurements.map(m => (
                <div key={m.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-500 text-[11px]">
                      {new Date(m.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-slate-800 font-mono font-medium">
                      {m.id}
                    </span>
                    <span className="text-slate-600 hidden sm:inline">
                      Hardware: <strong className="text-slate-800 font-mono">{m.sensorId}</strong>
                    </span>
                  </div>
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      ANCHORED
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-3 flex items-center justify-between border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handleLaunchProvenance}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verify Records in Tamper Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
