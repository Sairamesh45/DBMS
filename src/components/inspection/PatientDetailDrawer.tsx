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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-[#F5EFEB] border border-[#E6DFD5] text-xs">
          <div>
            <span className="text-[#78716C] block text-[11px] font-medium">Age / Sex</span>
            <span className="text-[#2C2623] font-semibold">{patient.age} yrs • {patient.gender}</span>
          </div>
          <div>
            <span className="text-[#78716C] block text-[11px] font-medium">Blood Type</span>
            <span className="text-[#8C6D46] font-bold">{patient.bloodGroup}</span>
          </div>
          <div>
            <span className="text-[#78716C] block text-[11px] font-medium">Status</span>
            <StatusBadge status={patient.monitoringStatus} size="sm" />
          </div>
          <div>
            <span className="text-[#78716C] block text-[11px] font-medium">Trust Score</span>
            <span className="text-emerald-700 font-bold text-sm font-mono">{patient.latestTrustScore}%</span>
          </div>
        </div>

        {/* Clinical Condition */}
        <div className="p-3.5 rounded-xl bg-white border border-[#E6DFD5]">
          <span className="text-xs font-semibold text-[#78716C] block mb-1">Clinical Diagnosis & Medical Condition</span>
          <p className="text-sm font-bold text-[#2C2623]">{patient.condition}</p>
          <p className="text-xs text-[#59514B] mt-1">{patient.notes}</p>
        </div>

        {/* Assigned Sensors */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#59514B] flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#8C6D46]" />
              Bound Hardware Sensors ({patientSensors.length})
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {patientSensors.map(s => (
              <div key={s.id} className="p-2.5 rounded-lg bg-[#FAF7F2] border border-[#E6DFD5] flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-[#2C2623] font-mono">{s.id}</div>
                  <div className="text-[11px] text-[#78716C]">{s.type}</div>
                </div>
                <div className="text-right">
                  <StatusBadge status={s.authStatus} size="sm" />
                  <div className="text-[10px] font-mono text-[#8C6D46] font-semibold mt-1">Trust: {s.deviceTrust}/100</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Diagnostic Records Log */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#59514B] flex items-center gap-1.5 mb-2">
            <FileText className="w-4 h-4 text-[#8C6D46]" />
            Recent Electronic Health Ingestion Records
          </span>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {patientMeasurements.length === 0 ? (
              <div className="p-3 text-center text-xs text-[#78716C] bg-[#FAF7F2] rounded-lg border border-[#E6DFD5]">
                No recent measurement records.
              </div>
            ) : (
              patientMeasurements.map(m => (
                <div key={m.id} className="p-2.5 rounded-lg bg-[#FAF7F2] border border-[#E6DFD5] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[#78716C] text-[11px]">
                      {new Date(m.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-[#2C2623] font-mono font-medium">
                      {m.id}
                    </span>
                    <span className="text-[#59514B] hidden sm:inline">
                      Hardware: <strong className="text-[#2C2623] font-mono">{m.sensorId}</strong>
                    </span>
                  </div>
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F5EFEB] text-[#745733] border border-[#E6DFD5]">
                      ANCHORED
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-3 flex items-center justify-between border-t border-[#E6DFD5]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white hover:bg-[#F5EFEB] border border-[#E6DFD5] text-[#59514B] text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handleLaunchProvenance}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#8C6D46] hover:bg-[#745733] text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
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
