import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Hash,
  Copy,
  Check,
  RefreshCw,
  AlertOctagon,
  FileCode,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { ProvenanceRecord } from '../../types';
import { Modal } from '../common/Modal';
import { dataService } from '../../services/dataService';
import { canonicalStringify, sha256 } from '../../services/cryptoService';
import { useToast } from '../../context/ToastContext';

interface ProvenanceDetailModalProps {
  record: ProvenanceRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onRecordUpdated: () => void;
}

export const ProvenanceDetailModal: React.FC<ProvenanceDetailModalProps> = ({
  record,
  isOpen,
  onClose,
  onRecordUpdated,
}) => {
  const { showToast } = useToast();
  const [copiedHash, setCopiedHash] = useState(false);
  const [computedHash, setComputedHash] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [tamperedPayloadValue, setTamperedPayloadValue] = useState<string>('Aspirin 500 mg Daily (Overdose)');

  useEffect(() => {
    if (record) {
      const activePayload = record.isTampered && record.tamperedPayload ? record.tamperedPayload : record.payload;
      sha256(canonicalStringify(activePayload)).then(setComputedHash);
    }
  }, [record]);

  if (!record) return null;

  const isHashMatching = computedHash === record.dataHash;
  const isTampered = !!record.isTampered;

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleSimulateTamper = async () => {
    try {
      const result = await dataService.simulateTampering(record.id, 'prescription', tamperedPayloadValue);
      setComputedHash(result.computedHash);
      onRecordUpdated();
      showToast({
        type: 'error',
        title: 'Tampering Simulated!',
        message: `Clinical order modified to "${tamperedPayloadValue}". Computed SHA-256 hash now diverges from anchored blockchain hash!`,
        duration: 5000,
      });
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleRestore = async () => {
    try {
      await dataService.restoreOriginalPayload(record.id);
      const originalHash = await sha256(canonicalStringify(record.payload));
      setComputedHash(originalHash);
      onRecordUpdated();
      showToast({
        type: 'success',
        title: 'Integrity Restored',
        message: 'Original authentic telemetry payload restored. Hash verification succeeded!',
      });
    } catch (e: any) {
      console.error(e);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Provenance Record: ${record.id}`}
      subtitle={`Patient ${record.patientName} (${record.patientId}) • Sensor: ${record.sensorId}`}
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* Verification Status Banner */}
        <div
          className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition-colors ${
            !isHashMatching || isTampered
              ? 'bg-rose-950/80 border-rose-500/60 text-rose-100 shadow-lg shadow-rose-950/40'
              : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-100'
          }`}
        >
          <div className="flex items-start gap-3">
            {!isHashMatching || isTampered ? (
              <AlertOctagon className="w-6 h-6 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
            ) : (
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold text-sm tracking-wide">
                {!isHashMatching || isTampered
                  ? 'CRITICAL INTEGRITY FAILURE: HASH MISMATCH DETECTED'
                  : 'CRYPTOGRAPHIC INTEGRITY VERIFIED (SHA-256 MATCH)'}
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {!isHashMatching || isTampered
                  ? 'The current record payload has been modified post-generation. The computed SHA-256 does not match the immutable anchored hash on the blockchain.'
                  : 'The current record payload matches its registered SHA-256 checksum byte-for-byte. No tampering or bit flips detected.'}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <span
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase border ${
                !isHashMatching || isTampered
                  ? 'bg-rose-900 border-rose-400 text-white'
                  : 'bg-emerald-900 border-emerald-400 text-white'
              }`}
            >
              {!isHashMatching || isTampered ? 'TAMPERED' : 'VALID'}
            </span>
          </div>
        </div>

        {/* Cryptographic Hashes Comparison */}
        <div className="space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span>Anchored Blockchain Hash (Stored):</span>
              <button
                onClick={() => handleCopyHash(record.dataHash)}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
              >
                {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedHash ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-2.5 rounded bg-slate-900 text-cyan-300 border border-slate-800 break-all select-all">
              {record.dataHash}
            </div>
          </div>

          <div>
            <div className="text-slate-400 mb-1">
              Recomputed SHA-256 (from active payload):
            </div>
            <div
              className={`p-2.5 rounded border break-all select-all font-bold ${
                isHashMatching
                  ? 'bg-slate-900 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-950/60 text-rose-300 border-rose-500/60'
              }`}
            >
              {computedHash || 'Calculating Web Crypto digest...'}
            </div>
          </div>

          <div>
            <div className="text-slate-400 mb-1">Previous-Record Hash (Chain Pointer):</div>
            <div className="p-2 rounded bg-slate-900 text-slate-400 border border-slate-800 break-all select-all text-[11px]">
              {record.prevHash}
            </div>
          </div>
        </div>

        {/* Interactive Tampering Simulation Controls */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Demonstration Lab: Tamper & Integrity Test
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">Academic Simulation</span>
          </div>
          <p className="text-xs text-slate-400">
            Inject unauthorized modifications into this record's medical payload to verify how the gateway
            cryptographically flags data discrepancies.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-300">Alter Clinical Order to:</label>
              <input
                type="text"
                value={tamperedPayloadValue}
                onChange={e => setTamperedPayloadValue(e.target.value)}
                className="w-56 px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-hidden"
              />
            </div>

            <button
              onClick={handleSimulateTamper}
              className="px-3.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900/80 border border-rose-500/50 text-rose-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-rose-400" />
              Inject Fake Clinical Data
            </button>

            {isTampered && (
              <button
                onClick={handleRestore}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-500/50 text-emerald-200 text-xs font-semibold transition-colors flex items-center gap-1.5 ml-auto"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                Restore Authentic Payload
              </button>
            )}
          </div>
        </div>

        {/* Raw Payload Inspection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <FileCode className="w-4 h-4 text-cyan-400" />
              Canonical Serialized Payload (Object hashed for Web Crypto digest):
            </span>
            <span className="font-mono text-[11px]">Deterministic JSON</span>
          </div>
          <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs overflow-x-auto max-h-48 leading-relaxed">
            {JSON.stringify(record.isTampered && record.tamperedPayload ? record.tamperedPayload : record.payload, null, 2)}
          </pre>
        </div>
      </div>
    </Modal>
  );
};
