import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Patient, SensorType } from '../../types';
import { dataService } from '../../services/dataService';
import { useToast } from '../../context/ToastContext';
import { Sparkles } from 'lucide-react';

interface AddSensorModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  onSensorAdded: () => void;
}

export const AddSensorModal: React.FC<AddSensorModalProps> = ({
  isOpen,
  onClose,
  patients,
  onSensorAdded,
}) => {
  const { showToast } = useToast();
  const [type, setType] = useState<SensorType>('12-Lead ECG');
  const [patientId, setPatientId] = useState<string>(patients[0]?.id || 'UNASSIGNED');
  const [hardwareFingerprint, setHardwareFingerprint] = useState<string>(
    () => `PUF-0x${Math.random().toString(16).slice(2, 6).toUpperCase()}-${Math.random().toString(16).slice(2, 6).toUpperCase()}-HW`
  );
  const [signalQuality, setSignalQuality] = useState<number>(98);
  const [batteryLevel, setBatteryLevel] = useState<number>(95);
  const [firmwareVersion, setFirmwareVersion] = useState<string>('v3.4.1-hw-trust');

  const generateNewPUF = () => {
    const puf = `PUF-0x${Math.random().toString(16).slice(2, 6).toUpperCase()}-${Math.random().toString(16).slice(2, 6).toUpperCase()}-HW`;
    setHardwareFingerprint(puf);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const assignedPatient = patients.find(p => p.id === patientId);

    try {
      const created = await dataService.createSensor({
        type,
        patientId,
        patientName: assignedPatient ? assignedPatient.name : 'Unassigned Standby Unit',
        hardwareFingerprint,
        authStatus: 'Pending Challenge',
        signalQuality,
        deviceTrust: 95,
        batteryLevel,
        firmwareVersion,
        lastCommunication: new Date().toISOString(),
        deviceState: 'Online',
      });

      showToast({
        type: 'success',
        title: 'Sensor Provisioned',
        message: `${created.id} (${created.type}) provisioned with PUF token ${created.hardwareFingerprint.slice(0, 16)}...`,
      });

      onSensorAdded();
      onClose();
      generateNewPUF();
    } catch (err: any) {
      console.error(err);
      showToast({
        type: 'error',
        title: 'Provisioning Failed',
        message: 'Could not register medical hardware sensor.',
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Provision Medical Hardware Sensor"
      subtitle="Register device identity token & initialize cryptographic trust credentials"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Sensor Modality / Type</label>
          <select
            value={type}
            onChange={e => setType(e.target.value as SensorType)}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:border-blue-500 focus:outline-hidden cursor-pointer"
          >
            <option value="12-Lead ECG">12-Lead ECG Telemetry</option>
            <option value="Pulse Oximeter (SpO2)">Pulse Oximeter (SpO2)</option>
            <option value="Continuous NIBP">Continuous NIBP (Blood Pressure)</option>
            <option value="Temperature Sensor">Continuous Temperature Sensor</option>
            <option value="Capnography (EtCO2)">Capnography (EtCO2 Gas)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Assign to Patient</label>
          <select
            value={patientId}
            onChange={e => setPatientId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:border-blue-500 focus:outline-hidden cursor-pointer"
          >
            <option value="UNASSIGNED">Unassigned (Pool / Standby)</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.id}) - {p.ward}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              Simulated PUF Hardware Identity Token *
            </label>
            <button
              type="button"
              onClick={generateNewPUF}
              className="text-[11px] text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              Generate Token
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs truncate font-semibold">
              {hardwareFingerprint}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Academic simulation: Represents silicon unclonable physical fingerprint token.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Initial Signal Quality ({signalQuality}%)
            </label>
            <input
              type="range"
              min={30}
              max={100}
              value={signalQuality}
              onChange={e => setSignalQuality(parseInt(e.target.value, 10))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Battery Level ({batteryLevel}%)
            </label>
            <input
              type="range"
              min={10}
              max={100}
              value={batteryLevel}
              onChange={e => setBatteryLevel(parseInt(e.target.value, 10))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Firmware Build</label>
          <input
            type="text"
            value={firmwareVersion}
            onChange={e => setFirmwareVersion(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-mono text-xs focus:border-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
          >
            Register Sensor
          </button>
        </div>
      </form>
    </Modal>
  );
};
