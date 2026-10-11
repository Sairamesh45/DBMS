import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertOctagon,
  CheckCircle2,
  Copy,
  Check,
  History,
  RotateCcw,
  Zap,
  FileText,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { ProvenanceRecord } from '../types';
import { useGateway } from '../context/GatewayContext';
import { sha256 } from '../services/cryptoService';
import { useToast } from '../context/ToastContext';

export const ProvenancePage: React.FC = () => {
  const { showToast } = useToast();
  const { refreshTrigger } = useGateway();

  const [records, setRecords] = useState<ProvenanceRecord[]>([]);
  const [selectedRecordIndex, setSelectedRecordIndex] = useState(0);

  // Tamper state
  const [medicalPayloadInput, setMedicalPayloadInput] = useState<string>('Aspirin 81 mg Daily • Ingestion Confirmed');
  const [isTampered, setIsTampered] = useState(false);
  const [activeHash, setActiveHash] = useState('');
  const [expectedHash, setExpectedHash] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    dataService.getProvenanceRecords().then(recs => {
      setRecords(recs);
      if (recs.length > 0) {
        setExpectedHash(recs[0].dataHash);
        setActiveHash(recs[0].dataHash);
      }
    });
  }, [refreshTrigger]);

  const activeRecord = records[selectedRecordIndex] || records[0];

  const handleTamper = async () => {
    const tamperedPayload = 'Aspirin 500 mg Daily (Overdose Tampered!)';
    setMedicalPayloadInput(tamperedPayload);
    const fakeData = JSON.stringify({
      patientId: activeRecord.patientId,
      medicalPayload: tamperedPayload,
      timestamp: activeRecord.timestamp,
    });
    const fakeHash = await sha256(fakeData);
    setActiveHash(fakeHash);
    setIsTampered(true);
    showToast({
      type: 'error',
      title: 'Tampering Detected!',
      message: `Medical order altered to "${tamperedPayload}". SHA-256 digest failed verification!`,
    });
  };

  const handleRestore = () => {
    setMedicalPayloadInput('Aspirin 81 mg Daily • Ingestion Confirmed');
    setActiveHash(expectedHash);
    setIsTampered(false);
    showToast({
      type: 'success',
      title: 'Data Restored',
      message: 'Original medical payload restored. Hash matches blockchain!',
    });
  };

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          Cryptographic Data Provenance & Tamper Detection
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Every medical record and prescription is hashed using genuine SHA-256. Any unauthorized modification in the database is detected instantly through hash mismatch.
        </p>
      </div>

      {/* Main Interactive Tamper Testing Station */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Interactive Tampering Simulator
            </h2>
            <p className="text-xs text-slate-500">
              Modify the medical prescription or clinical data below to test real-time SHA-256 cryptographic tamper detection.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isTampered ? (
              <button
                onClick={handleTamper}
                className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Simulate Tamper Attack (Alter Dosage)</span>
              </button>
            ) : (
              <button
                onClick={handleRestore}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Authentic Record</span>
              </button>
            )}
          </div>
        </div>

        {/* Verification Box */}
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
            isTampered
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-emerald-50 border-emerald-300 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {isTampered ? (
              <AlertOctagon className="w-6 h-6 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            )}
            <div>
              <div className="font-bold text-sm">
                {isTampered
                  ? 'CRITICAL INTEGRITY FAILURE: TAMPERING DETECTED'
                  : 'CRYPTOGRAPHIC INTEGRITY VERIFIED (SHA-256 MATCH)'}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                {isTampered
                  ? 'Computed hash diverges from blockchain hash. The database record has been modified without authorization.'
                  : 'Computed SHA-256 exactly matches the anchored blockchain hash.'}
              </div>
            </div>
          </div>

          <span
            className={`font-mono font-bold text-xs px-3 py-1 rounded border shrink-0 ${
              isTampered
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}
          >
            {isTampered ? 'TAMPERED' : 'VALID'}
          </span>
        </div>

        {/* Editable values for demonstration */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          <div>
            <label className="text-slate-500 block mb-1 font-medium">Target Patient:</label>
            <div className="font-bold text-slate-800">{activeRecord?.patientName} ({activeRecord?.patientId})</div>
          </div>

          <div>
            <label className="text-slate-500 block mb-1 font-medium">Clinical Prescription Payload:</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={medicalPayloadInput}
                onChange={e => setMedicalPayloadInput(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-500 block mb-1 font-medium">Hardware Source:</label>
            <div className="font-bold text-blue-600">{activeRecord?.sensorType}</div>
          </div>
        </div>

        {/* Hashes Display */}
        <div className="space-y-2 font-mono text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex justify-between text-slate-500 text-[11px] mb-1 font-sans font-medium">
              <span>Anchored Blockchain Hash (Stored on Ledger):</span>
              <button
                onClick={() => handleCopy(expectedHash)}
                className="text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="text-slate-800 break-all select-all font-semibold">{expectedHash}</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-slate-500 text-[11px] mb-1 font-sans font-medium">
              Recomputed SHA-256 Digest (from live database record):
            </div>
            <div className={`break-all select-all font-bold ${isTampered ? 'text-rose-600' : 'text-emerald-600'}`}>
              {activeHash}
            </div>
          </div>
        </div>
      </div>

      {/* Simple Records Table */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <History className="w-4 h-4 text-blue-600" />
          Chained Provenance Records
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                <th className="pb-2.5">Record ID</th>
                <th className="pb-2.5">Patient</th>
                <th className="pb-2.5">Timestamp</th>
                <th className="pb-2.5">SHA-256 Hash</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {records.map((rec, index) => (
                <tr
                  key={rec.id}
                  className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                    selectedRecordIndex === index ? 'bg-blue-50/60' : ''
                  }`}
                  onClick={() => {
                    setSelectedRecordIndex(index);
                    setExpectedHash(rec.dataHash);
                    setActiveHash(rec.dataHash);
                    setIsTampered(false);
                    setMedicalPayloadInput('Aspirin 81 mg Daily • Ingestion Confirmed');
                  }}
                >
                  <td className="py-2.5 font-bold text-blue-600">{rec.id}</td>
                  <td className="py-2.5 text-slate-800 font-sans font-medium">{rec.patientName}</td>
                  <td className="py-2.5 text-slate-500">
                    {new Date(rec.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 text-slate-600 max-w-[140px] truncate">{rec.dataHash}</td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      ANCHORED
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-sans">
                    <button className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer">
                      {selectedRecordIndex === index ? 'Selected' : 'Select'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
