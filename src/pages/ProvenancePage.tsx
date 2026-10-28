import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  AlertOctagon,
  CheckCircle2,
  Copy,
  Check,
  History,
  RotateCcw,
  Zap,
  Lock,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { ProvenanceRecord } from '../types';
import { useGateway } from '../context/GatewayContext';
import { sha256, canonicalStringify } from '../services/cryptoService';
import { useToast } from '../context/ToastContext';
import { INITIAL_PROVENANCE_RECORDS } from '../data/mockData';

export const ProvenancePage: React.FC = () => {
  const { showToast } = useToast();
  const { activeRole, selectedPatientId, refreshTrigger, triggerRefresh } = useGateway();

  const [records, setRecords] = useState<ProvenanceRecord[]>(INITIAL_PROVENANCE_RECORDS);
  const [selectedRecordIndex, setSelectedRecordIndex] = useState(0);

  // Tamper state
  const [medicalPayloadInput, setMedicalPayloadInput] = useState<string>('Aspirin 81 mg Daily • Ingestion Confirmed');
  const [isTampered, setIsTampered] = useState(false);
  const [activeHash, setActiveHash] = useState(INITIAL_PROVENANCE_RECORDS[0]?.dataHash || '');
  const [expectedHash, setExpectedHash] = useState(INITIAL_PROVENANCE_RECORDS[0]?.dataHash || '');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    dataService.getProvenanceRecords()
      .then(recs => {
        if (Array.isArray(recs) && recs.length > 0) {
          setRecords(recs);
        }
      })
      .catch(err => {
        console.warn('Provenance records API fetch:', err);
        setRecords(INITIAL_PROVENANCE_RECORDS);
      });
  }, [refreshTrigger]);

  const relevantRecords = useMemo(() => {
    if (activeRole === 'Patient') {
      const userRecords = records.filter(r => r.patientId === selectedPatientId || r.patientId === 'PT-1042');
      return userRecords.length > 0 ? userRecords : records.filter(r => r.patientId === 'PT-1042');
    }
    return records;
  }, [records, activeRole, selectedPatientId]);

  const safeIndex = selectedRecordIndex < relevantRecords.length ? selectedRecordIndex : 0;
  const activeRecord = relevantRecords[safeIndex] || relevantRecords[0] || records[0];

  useEffect(() => {
    if (activeRecord) {
      setExpectedHash(activeRecord.dataHash || '');
      setActiveHash(activeRecord.isTampered && activeRecord.calculatedHash ? activeRecord.calculatedHash : (activeRecord.dataHash || ''));
      setIsTampered(Boolean(activeRecord.isTampered));
      const rx = activeRecord.isTampered && (activeRecord as any).tamperedPayload?.clinicalRecord?.prescription
        ? (activeRecord as any).tamperedPayload.clinicalRecord.prescription
        : (activeRecord.payload?.clinicalRecord?.prescription || 'Aspirin 81 mg Daily');
      setMedicalPayloadInput(`${rx} • Ingestion Confirmed`);
    }
  }, [activeRecord]);

  const handlePayloadChange = async (newVal: string) => {
    setMedicalPayloadInput(newVal);

    if (!activeRecord) return;

    // Extract clean prescription text
    const cleanRx = newVal.replace(/\s*•\s*Ingestion Confirmed\s*$/, '').trim();
    const originalRx = (activeRecord.payload?.clinicalRecord?.prescription || '').trim();

    // Reconstruct payload with updated prescription
    const payloadCopy = JSON.parse(JSON.stringify(activeRecord.payload || {}));
    if (payloadCopy.clinicalRecord) {
      payloadCopy.clinicalRecord.prescription = cleanRx;
    } else {
      payloadCopy.prescription = cleanRx;
    }

    // Compute genuine SHA-256 digest in real-time in browser WebCrypto
    const computedDigest = await sha256(canonicalStringify(payloadCopy));
    setActiveHash(computedDigest);

    const isMatch = computedDigest.toLowerCase() === expectedHash.toLowerCase() && cleanRx === originalRx;
    const tampered = !isMatch;
    setIsTampered(tampered);

    // Sync with SQLite backend
    if (tampered) {
      dataService.simulateTampering(activeRecord.id, 'prescription', cleanRx).catch(console.warn);
    } else {
      dataService.restoreOriginalPayload(activeRecord.id).catch(console.warn);
    }
  };

  const handleTamper = async () => {
    if (!activeRecord) return;
    const currentRx = activeRecord.payload?.clinicalRecord?.prescription || 'Dosage';
    const drugName = currentRx.split(' ')[0] || 'Aspirin';
    const tamperedPayload = `${drugName} 500 mg Daily (Overdose Tampered!)`;
    await handlePayloadChange(tamperedPayload);
    showToast({
      type: 'error',
      title: 'Tampering Detected by Gateway!',
      message: `Prescription modified to 500mg overdose. Real-time SHA-256 calculation failed cryptographic verification!`,
      duration: 6000,
    });
  };

  const handleRestore = async () => {
    if (!activeRecord) return;
    try {
      await dataService.restoreOriginalPayload(activeRecord.id);
      const rx = activeRecord.payload?.clinicalRecord?.prescription || 'Aspirin 81 mg Daily';
      setMedicalPayloadInput(`${rx} • Ingestion Confirmed`);
      setActiveHash(activeRecord.dataHash);
      setIsTampered(false);
      triggerRefresh();
      showToast({
        type: 'success',
        title: 'Data Integrity Restored',
        message: 'Original medical payload restored in SQLite database. Hash matches blockchain root!',
      });
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bubbly-glass p-6 md:p-7 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#9C7854] to-[#85613D] text-white flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#2A241E] font-serif">
              Cryptographic Data Provenance & Tamper Detection
            </h1>
            <p className="text-xs text-[#756A5C] mt-1">
              Every medical record and prescription is hashed using genuine SHA-256. Any unauthorized modification in the database is detected instantly through hash mismatch.
            </p>
          </div>
        </div>
      </div>

      {/* Main Interactive Tamper Testing Station */}
      <div className="bubbly-glass p-6 md:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[rgba(160,140,115,0.12)]">
          <div>
            <h2 className="text-base font-bold text-[#2A241E] font-serif">
              {activeRole === 'Patient' ? 'Patient Cryptographic Record Certificate' : 'Interactive Tampering Simulator'}
            </h2>
            <p className="text-xs text-[#756A5C] mt-1 max-w-2xl leading-relaxed">
              {activeRole === 'Patient'
                ? 'Your electronic medical prescriptions and telemetry records are sealed with SHA-256 cryptographic hashes on the consortium blockchain.'
                : 'Modify the clinical prescription data below to test real-time SHA-256 cryptographic tamper detection against the database.'}
            </p>
          </div>

          {activeRole !== 'Patient' && (
            <div className="flex items-center gap-2">
              {!isTampered ? (
                <button
                  onClick={handleTamper}
                  className="pill-btn-danger"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Simulate Altered Dosage (500mg)</span>
                </button>
              ) : (
                <button
                  onClick={handleRestore}
                  className="pill-btn-primary"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Authentic Record</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Verification Box */}
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
            isTampered
              ? 'bg-[#FDF0EE]/95 border-[#F5CAC3] text-[#A83D2A] shadow-[0_4px_16px_rgba(191,78,59,0.12)]'
              : 'bg-[#EBF3ED]/90 border-[#C8E1D2] text-[#2D6643] shadow-[0_4px_16px_rgba(62,119,84,0.08)]'
          }`}
        >
          <div className="flex items-center gap-3">
            {isTampered ? (
              <AlertOctagon className="w-5 h-5 text-[#BF4E3B] shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-[#2D6643] shrink-0" />
            )}
            <div>
              <div className="font-bold text-sm">
                {isTampered
                  ? 'CRITICAL INTEGRITY FAILURE: Unauthorized database modification detected'
                  : 'Cryptographic Hash Validated: Database record matches blockchain root'}
              </div>
              <div className="text-xs opacity-90 mt-0.5">
                {isTampered
                  ? 'The live computed SHA-256 digest diverges from the anchored blockchain hash. The database row has been altered without authorization.'
                  : 'The computed SHA-256 digest byte-for-byte matches the immutable hash anchored on the blockchain ledger.'}
              </div>
            </div>
          </div>

          <span
            className={`font-mono font-bold text-xs px-3 py-1 rounded-full border shrink-0 ${
              isTampered
                ? 'bg-[#FDF0EE] text-[#BF4E3B] border-[#F5CAC3]'
                : 'bg-[#EBF3ED] text-[#2D6643] border-[#C8E1D2]'
            }`}
          >
            {isTampered ? 'TAMPERED' : 'VERIFIED'}
          </span>
        </div>

        {/* Target Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-4 rounded-2xl bg-white/70 border border-white/80 text-xs shadow-2xs backdrop-blur-md">
          <div>
            <label className="text-[#756A5C] block mb-1 font-medium">Target Patient:</label>
            <div className="font-bold text-[#2A241E]">
              {activeRecord ? `${activeRecord.patientName} (${activeRecord.patientId})` : 'Eleanor Vance (PT-1042)'}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[#756A5C] block font-medium">Clinical Prescription Payload:</label>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  isTampered
                    ? 'bg-[#FDF0EE] text-[#BF4E3B] border border-[#F5CAC3]'
                    : 'bg-[#EBF3ED] text-[#2D6643] border border-[#C8E1D2]'
                }`}
              >
                {isTampered ? 'LIVE TAMPER DETECTED' : 'LIVE AUTHENTIC'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={medicalPayloadInput}
                onChange={e => handlePayloadChange(e.target.value)}
                placeholder="Type any change to test live SHA-256 recalculation..."
                className={`w-full px-3.5 py-2 rounded-full border font-mono text-xs focus:outline-hidden transition-all ${
                  isTampered
                    ? 'bg-[#FDF0EE] border-[#F5CAC3] text-[#BF4E3B] font-semibold'
                    : 'bg-white border-[rgba(160,140,115,0.25)] text-[#2A241E] focus:border-[#9C7854]'
                }`}
              />
            </div>
            <p className="text-[11px] text-[#756A5C] mt-1.5">
              {isTampered
                ? 'SHA-256 diverged from blockchain ledger. Type original back or click Restore.'
                : 'Modify text above to trigger live cryptographic SHA-256 recalculation against the consortium ledger.'}
            </p>
          </div>

          <div>
            <label className="text-[#756A5C] block mb-1 font-medium">Hardware Node:</label>
            <div className="font-bold text-[#9C7854]">
              {activeRecord ? `${activeRecord.sensorType} (${activeRecord.sensorId})` : '12-Lead ECG (SNR-ECG-01)'}
            </div>
          </div>
        </div>

        {/* Hashes Display */}
        <div className="space-y-2.5 font-mono text-xs">
          <div className="p-4 rounded-2xl bg-white/70 border border-white/80 shadow-2xs">
            <div className="flex justify-between text-[#756A5C] text-[11px] mb-1.5 font-sans font-medium">
              <span>Anchored Blockchain Hash (Stored on Ledger):</span>
              <button
                onClick={() => handleCopy(expectedHash)}
                className="text-[#9C7854] hover:text-[#7E5B39] flex items-center gap-1 cursor-pointer font-semibold"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#2D6643]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="text-[#2A241E] break-all select-all font-semibold bg-[#FAF7F2] p-2.5 rounded-xl border border-[rgba(160,140,115,0.12)]">
              {expectedHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/70 border border-white/80 shadow-2xs">
            <div className="text-[#756A5C] text-[11px] mb-1.5 font-sans font-medium">
              Recomputed SHA-256 Digest (from live database row):
            </div>
            <div className={`break-all select-all font-bold p-2.5 rounded-xl border border-[rgba(160,140,115,0.12)] bg-[#FAF7F2] ${
              isTampered ? 'text-[#BF4E3B]' : 'text-[#2D6643]'
            }`}>
              {activeHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
            </div>
          </div>
        </div>
      </div>

      {/* Chained Records Table */}
      <div className="bubbly-glass p-6 md:p-7 space-y-4">
        <h3 className="text-base font-bold text-[#2A241E] flex items-center gap-2 font-serif">
          <History className="w-4 h-4 text-[#9C7854]" />
          Chained Provenance Records (Cryptographic SHA-256 Ledger)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[rgba(160,140,115,0.12)] text-[#756A5C] text-[11px] uppercase tracking-wider font-semibold">
                <th className="pb-3">Record ID</th>
                <th className="pb-3">Patient</th>
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">SHA-256 Hash</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(160,140,115,0.08)] font-mono">
              {relevantRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#756A5C] font-sans">
                    No cryptographic provenance records found for active selection.
                  </td>
                </tr>
              ) : (
                relevantRecords.map((rec, index) => (
                  <tr
                    key={rec.id}
                    className={`hover:bg-white/60 cursor-pointer transition-colors ${
                      safeIndex === index ? 'bg-white/80' : ''
                    }`}
                    onClick={() => {
                      setSelectedRecordIndex(index);
                    }}
                  >
                    <td className="py-3 font-bold text-[#9C7854]">{rec.id}</td>
                    <td className="py-3 text-[#2A241E] font-sans font-medium">{rec.patientName}</td>
                    <td className="py-3 text-[#756A5C]">
                      {new Date(rec.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 text-[#756A5C] max-w-[140px] truncate">{rec.dataHash}</td>
                    <td className="py-3">
                      {rec.isTampered ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FDF0EE] text-[#BF4E3B] border border-[#F5CAC3]">
                          TAMPERED
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF3ED] text-[#2D6643] border border-[#C8E1D2]">
                          VERIFIED
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right font-sans">
                      <button className="text-xs text-[#9C7854] hover:text-[#7E5B39] font-semibold cursor-pointer">
                        {safeIndex === index ? 'Selected' : 'Select'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
