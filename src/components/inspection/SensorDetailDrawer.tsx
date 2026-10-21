import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Sensor } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import {
  ShieldX,
  Cpu,
  Battery,
  Wifi,
  Sparkles,
  RefreshCw,
  Clock,
  Terminal,
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { useToast } from '../../context/ToastContext';

interface SensorDetailDrawerProps {
  sensor: Sensor | null;
  isOpen: boolean;
  onClose: () => void;
  onSensorUpdated: () => void;
}

export const SensorDetailDrawer: React.FC<SensorDetailDrawerProps> = ({
  sensor,
  isOpen,
  onClose,
  onSensorUpdated,
}) => {
  const { showToast } = useToast();
  const [isChallenging, setIsChallenging] = useState(false);
  const [challengeLog, setChallengeLog] = useState<string | null>(null);

  if (!sensor) return null;

  const handleAuthenticate = async () => {
    setIsChallenging(true);
    setChallengeLog('Dispatching nonce challenge to PUF hardware token...');

    try {
      const result = await dataService.authenticateSensor(sensor.id);
      setIsChallenging(false);
      setChallengeLog(
        `Challenge ${result.success ? 'ACCEPTED' : 'REJECTED'}: Response latency ${result.latencyMs}ms. ${result.message}`
      );
      onSensorUpdated();
      showToast({
        type: result.success ? 'success' : 'error',
        title: result.success ? 'Authentication Verified' : 'Authentication Failed',
        message: result.message,
      });
    } catch (e: any) {
      setIsChallenging(false);
      console.error(e);
    }
  };

  const handleQuarantine = async () => {
    try {
      await dataService.quarantineSensor(sensor.id);
      onSensorUpdated();
      showToast({
        type: 'warning',
        title: 'Sensor Quarantined',
        message: `Device ${sensor.id} blocked by security gateway firewall.`,
      });
    } catch (e: any) {
      console.error(e);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Sensor Identity • ${sensor.id}`}
      subtitle={`Type: ${sensor.type} • Assigned: ${sensor.patientName}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Status card */}
        <div className="p-3.5 rounded-xl bg-[#F5EFEB] border border-[#E6DFD5] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-[#78716C] block mb-1">AUTHENTICATION STATUS</span>
            <StatusBadge status={sensor.authStatus} />
          </div>
          <div className="text-right">
            <span className="text-[11px] font-semibold text-[#78716C] block mb-1">DEVICE TRUST SCORE (DT)</span>
            <span className={`text-lg font-bold font-mono ${sensor.deviceTrust >= 80 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {sensor.deviceTrust} / 100
            </span>
          </div>
        </div>

        {/* Hardware Fingerprint info */}
        <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E6DFD5] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#2C2623] flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#8C6D46]" />
              Simulated PUF Hardware Identity
            </span>
            <span className="text-[10px] font-mono text-[#78716C]">ECDSA SECP256K1</span>
          </div>
          <div className="p-2.5 rounded bg-white border border-[#E6DFD5] font-mono text-xs text-[#2C2623] break-all font-semibold select-all">
            {sensor.hardwareFingerprint}
          </div>
          <p className="text-[11px] text-[#78716C] leading-relaxed">
            Unique simulated silicon physical token used to challenge the authenticity of sensor telemetry packets at the gateway boundary.
          </p>
        </div>

        {/* Telemetry specs */}
        <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-[#F5EFEB] border border-[#E6DFD5] text-xs">
          <div>
            <span className="text-[#78716C] text-[10px] block flex items-center gap-1 font-medium">
              <Wifi className="w-3 h-3 text-[#8C6D46]" />
              Signal Quality
            </span>
            <span className="font-bold text-[#2C2623] font-mono">{sensor.signalQuality}%</span>
          </div>
          <div>
            <span className="text-[#78716C] text-[10px] block flex items-center gap-1 font-medium">
              <Battery className="w-3 h-3 text-emerald-700" />
              Battery Level
            </span>
            <span className="font-bold text-[#2C2623] font-mono">{sensor.batteryLevel}%</span>
          </div>
          <div>
            <span className="text-[#78716C] text-[10px] block flex items-center gap-1 font-medium">
              <Clock className="w-3 h-3 text-[#78716C]" />
              Firmware
            </span>
            <span className="font-bold text-[#2C2623] font-mono truncate">{sensor.firmwareVersion}</span>
          </div>
        </div>

        {/* Challenge Log Box */}
        {challengeLog && (
          <div className="p-3 rounded-lg bg-[#FAF7F2] border border-[#D8CFC2] font-mono text-xs text-[#2C2623] space-y-1">
            <div className="text-[10px] text-[#8C6D46] font-bold flex items-center gap-1">
              <Terminal className="w-3 h-3" />
              CRYPTOGRAPHIC CHALLENGE LOG
            </div>
            <div className="text-[11px] leading-relaxed text-[#3D3531]">{challengeLog}</div>
          </div>
        )}

        {/* Action buttons */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#E6DFD5]">
          <button
            onClick={handleQuarantine}
            className="px-3.5 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldX className="w-3.5 h-3.5" />
            <span>Quarantine Device</span>
          </button>

          <button
            onClick={handleAuthenticate}
            disabled={isChallenging}
            className="px-4 py-2 rounded-lg bg-[#8C6D46] hover:bg-[#745733] text-white font-semibold text-xs transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {isChallenging ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>{isChallenging ? 'Testing Challenge...' : 'Authenticate Challenge-Response'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
