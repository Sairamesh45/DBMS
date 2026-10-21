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
          <label className="block text-xs font-semibold text-[#2c2623] mb-1">Sensor Modality / Type</label>
          <select
            value={type}
            onChange={e => setType(e.target.value as SensorType)}
            className="w-full px-3 py-2 rounded-xl bg-[#faf7f2] border border-[#d8cfc2] text-[#2c2623] text-xs focus:outline-hidden cursor-pointer"
          >
            <option value="12-Lead ECG">12-Lead ECG Telemetry</option>
            <option value="Pulse Oximeter (SpO2)">Pulse Oximeter (SpO2)</option>
            <option value="Continuous NIBP">Continuous NIBP (Blood Pressure)</option>
            <option value="Temperature Sensor">Continuous Temperature Sensor</option>
            <option value="Capnography (EtCO2)">Capnography (EtCO2 Gas)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#2c2623] mb-1">Assign to Patient</label>
          <select
            value={patientId}
            onChange={e => setPatientId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#faf7f2] border border-[#d8cfc2] text-[#2c2623] text-xs focus:outline-hidden cursor-pointer"
          >
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.id}) • {p.ward}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-[#2c2623]">
              Hardware PUF Fingerprint Token (Simulated Silicon PUF)
            </label>
            <button
              type="button"
              onClick={generateNewPUF}
              className="text-[11px] text-[#8c6d46] hover:text-[#745733] font-medium flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Regenerate Token</span>
            </button>
          </div>
          <input
            type="text"
            value={hardwareFingerprint}
            onChange={e => setHardwareFingerprint(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#faf7f2] border border-[#d8cfc2] text-[#2c2623] font-mono text-xs focus:outline-hidden"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#2c2623] mb-1">Initial Signal Quality (%)</label>
            <input
              type="number"
              min={10}
              max={100}
              value={signalQuality}
              onChange={e => setSignalQuality(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 rounded-xl bg-[#faf7f2] border border-[#d8cfc2] text-[#2c2623] text-xs focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2c2623] mb-1">Battery Level (%)</label>
            <input
              type="number"
              min={1}
              max={100}
              value={batteryLevel}
              onChange={e => setBatteryLevel(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 rounded-xl bg-[#faf7f2] border border-[#d8cfc2] text-[#2c2623] text-xs focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#2c2623] mb-1">Firmware Build Identifier</label>
          <input
            type="text"
            value={firmwareVersion}
            onChange={e => setFirmwareVersion(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#faf7f2] border border-[#d8cfc2] text-[#2c2623] font-mono text-xs focus:outline-hidden"
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#e6dfd5]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#faf7f2] hover:bg-[#f5efeb] text-[#78716c] border border-[#d8cfc2] text-xs font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#8c6d46] hover:bg-[#745733] text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
          >
            Provision Device
          </button>
        </div>
      </form>
    </Modal>
  );
};
