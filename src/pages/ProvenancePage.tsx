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

    // Extract clean prescription text (remove decorative suffix if present)
    const cleanRx = newVal.replace(/\s*•\s*Ingestion Confirmed\s*$/, '').trim();
    const originalRx = (activeRecord.payload?.clinicalRecord?.prescription || '').trim();

    // Reconstruct payload with updated prescription
    const payloadCopy = JSON.parse(JSON.stringify(activeRecord.payload || {}));
    if (payloadCopy.clinicalRecord) {
      payloadCopy.clinicalRecord.prescription = cleanRx;
    } else {
      payloadCopy.prescription = cleanRx;
    }

    // Compute genuine SHA-256 digest in real-time right in browser WebCrypto
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
      <div className="p-5 rounded-2xl bg-white border border-[#e6dfd5] shadow-xs">
        <h1 className="text-lg font-bold text-[#2c2623] flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#8c6d46]" />
          Cryptographic Data Provenance & Tamper Detection
        </h1>
        <p className="text-xs text-[#78716c] mt-1">
          Every medical record and prescription is hashed using genuine SHA-256. Any unauthorized modification in the database is detected instantly through hash mismatch.
        </p>
      </div>

      {/* Main Interactive Tamper Testing Station */}
      <div className="p-5 rounded-2xl bg-white border border-[#e6dfd5] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e6dfd5]">
          <div>
            <h2 className="text-sm font-bold text-[#2c2623]">
              {activeRole === 'Patient' ? 'Patient Cryptographic Record Certificate' : 'Interactive Tampering Simulator'}
            </h2>
            <p className="text-xs text-[#78716c]">
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
                  className="px-3.5 py-1.5 rounded-xl bg-[#fdf3f3] hover:bg-[#fae4e5] text-[#9e2a2b] border border-[#f5cacc] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Simulate Altered Dosage (500mg)</span>
                </button>
              ) : (
                <button
                  onClick={handleRestore}
                  className="px-3.5 py-1.5 rounded-xl bg-[#f2f7f3] hover:bg-[#e2ede4] text-[#2d6e42] border border-[#c6dcce] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
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
          className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
            isTampered
              ? 'bg-[#fdf3f3] border-[#f5cacc] text-[#9e2a2b]'
              : 'bg-[#f2f7f3] border-[#c6dcce] text-[#2d6e42]'
          }`}
        >
          <div className="flex items-center gap-3">
            {isTampered ? (
              <AlertOctagon className="w-5 h-5 text-[#9e2a2b] shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-[#2d6e42] shrink-0" />
            )}
            <div>
              <div className="font-bold text-sm">
                {isTampered
                  ? 'CRITICAL INTEGRITY FAILURE: Unauthorized database modification detected'
                  : 'Cryptographic Hash Validated: Database record matches blockchain root'}
              </div>
              <div className="text-xs text-[#78716c] mt-0.5">
                {isTampered
                  ? 'The live computed SHA-256 digest diverges from the anchored blockchain hash. The database row has been altered without authorization.'
                  : 'The computed SHA-256 digest byte-for-byte matches the immutable hash anchored on the blockchain ledger.'}
              </div>
            </div>
          </div>

          <span
            className={`font-mono font-bold text-xs px-2.5 py-1 rounded-lg border shrink-0 ${
              isTampered
                ? 'bg-[#fdf3f3] text-[#9e2a2b] border-[#f5cacc]'
                : 'bg-[#f2f7f3] text-[#2d6e42] border-[#c6dcce]'
            }`}
          >
            {isTampered ? 'TAMPERED' : 'VERIFIED'}
          </span>
        </div>

        {/* Target Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#faf7f2] border border-[#e6dfd5] text-xs">
          <div>
            <label className="text-[#78716c] block mb-1 font-medium">Target Patient:</label>
            <div className="font-bold text-[#2c2623]">
              {activeRecord ? `${activeRecord.patientName} (${activeRecord.patientId})` : 'Eleanor Vance (PT-1042)'}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[#78716c] block font-medium">Clinical Prescription Payload:</label>
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  isTampered
                    ? 'bg-[#fdf3f3] text-[#9e2a2b] border border-[#f5cacc]'
                    : 'bg-[#f2f7f3] text-[#2d6e42] border border-[#c6dcce]'
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
                className={`w-full px-2.5 py-1.5 rounded-lg border font-mono text-xs focus:outline-hidden transition-colors ${
                  isTampered
                    ? 'bg-[#fdf3f3] border-[#f5cacc] text-[#9e2a2b] font-semibold'
                    : 'bg-white border-[#d8cfc2] text-[#2c2623]'
                }`}
              />
            </div>
            <p className="text-[11px] text-[#78716c] mt-1">
              {isTampered
                ? 'SHA-256 diverged from blockchain ledger. Type original back or click Restore.'
                : 'Modify text above to trigger live cryptographic SHA-256 recalculation against the consortium ledger.'}
            </p>
          </div>

          <div>
            <label className="text-[#78716c] block mb-1 font-medium">Hardware Node:</label>
            <div className="font-bold text-[#8c6d46]">
              {activeRecord ? `${activeRecord.sensorType} (${activeRecord.sensorId})` : '12-Lead ECG (SNR-ECG-01)'}
            </div>
          </div>
        </div>

        {/* Hashes Display */}
        <div className="space-y-2 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-[#faf7f2] border border-[#e6dfd5]">
            <div className="flex justify-between text-[#78716c] text-[11px] mb-1 font-sans font-medium">
              <span>Anchored Blockchain Hash (Stored on Ledger):</span>
              <button
                onClick={() => handleCopy(expectedHash)}
                className="text-[#8c6d46] hover:text-[#745733] flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-[#2d6e42]" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="text-[#2c2623] break-all select-all font-semibold">
              {expectedHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#faf7f2] border border-[#e6dfd5]">
            <div className="text-[#78716c] text-[11px] mb-1 font-sans font-medium">
              Recomputed SHA-256 Digest (from live database row):
            </div>
            <div className={`break-all select-all font-bold ${isTampered ? 'text-[#9e2a2b]' : 'text-[#2d6e42]'}`}>
              {activeHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
            </div>
          </div>
        </div>
      </div>

      {/* Chained Records Table */}
      <div className="p-5 rounded-2xl bg-white border border-[#e6dfd5] shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-[#2c2623] flex items-center gap-2">
          <History className="w-4 h-4 text-[#8c6d46]" />
          Chained Provenance Records (Cryptographic SHA-256 Ledger)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e6dfd5] text-[#78716c] text-[11px] uppercase tracking-wider font-semibold">
                <th className="pb-2.5">Record ID</th>
                <th className="pb-2.5">Patient</th>
                <th className="pb-2.5">Timestamp</th>
                <th className="pb-2.5">SHA-256 Hash</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5efeb] font-mono">
              {relevantRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#78716c] font-sans">
                    No cryptographic provenance records found for active selection.
                  </td>
                </tr>
              ) : (
                relevantRecords.map((rec, index) => (
                  <tr
                    key={rec.id}
                    className={`hover:bg-[#faf7f2] cursor-pointer transition-colors ${
                      safeIndex === index ? 'bg-[#f5efeb]' : ''
                    }`}
                    onClick={() => {
                      setSelectedRecordIndex(index);
                    }}
                  >
                    <td className="py-2.5 font-bold text-[#8c6d46]">{rec.id}</td>
                    <td className="py-2.5 text-[#2c2623] font-sans font-medium">{rec.patientName}</td>
                    <td className="py-2.5 text-[#78716c]">
                      {new Date(rec.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 text-[#78716c] max-w-[140px] truncate">{rec.dataHash}</td>
                    <td className="py-2.5">
                      {rec.isTampered ? (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#fdf3f3] text-[#9e2a2b] border border-[#f5cacc]">
                          TAMPERED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#f2f7f3] text-[#2d6e42] border border-[#c6dcce]">
                          VERIFIED
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-sans">
                      <button className="text-xs text-[#8c6d46] hover:text-[#745733] font-semibold cursor-pointer">
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
