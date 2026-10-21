import React, { useState, useEffect } from 'react';
import {
  Users,
  Cpu,
  ShieldCheck,
  Boxes,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileText,
  Lock,
  Copy,
  Check,
  Activity,
  Stethoscope,
  ShieldAlert,
  FileCheck2,
  Heart,
  KeyRound,
  AlertOctagon,
  ScrollText,
  Shield,
  Clock,
  Wifi,
  Battery,
  UserCheck,
  ToggleLeft,
  ToggleRight,
  Sparkles,
} from 'lucide-react';
import { useGateway } from '../context/GatewayContext';
import { dataService, SystemStats } from '../services/dataService';
import { Patient, Sensor, ProvenanceRecord } from '../types';
import { useNavigate } from 'react-router-dom';
import { sha256, canonicalStringify } from '../services/cryptoService';
import { useToast } from '../context/ToastContext';
import { INITIAL_PROVENANCE_RECORDS } from '../data/mockData';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { activeRole, refreshTrigger, triggerRefresh } = useGateway();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [provenanceRecords, setProvenanceRecords] = useState<ProvenanceRecord[]>(INITIAL_PROVENANCE_RECORDS);

  // Fallback target record and baseline hash so it NEVER gets stuck on "Computing..."
  const defaultTarget = INITIAL_PROVENANCE_RECORDS[0];
  const defaultHash = defaultTarget?.dataHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  const defaultPrescription = 'Aspirin 81 mg Daily • Anticoagulant Protocol';
  const [dosageText, setDosageText] = useState(defaultPrescription);
  const [targetRecord, setTargetRecord] = useState<ProvenanceRecord | null>(defaultTarget || null);
  const [storedHash, setStoredHash] = useState<string>(defaultHash);
  const [activeHash, setActiveHash] = useState<string>(defaultHash);
  const [isCopied, setIsCopied] = useState(false);

  // Patient Consent Mock Toggles (for Patient Portal Perspective)
  const [consentDoctorJenkins, setConsentDoctorJenkins] = useState(true);
  const [consentDoctorHouse, setConsentDoctorHouse] = useState(true);
  const [consentResearch, setConsentResearch] = useState(false);

  useEffect(() => {
    // Resilient independent fetches so one slow/failing call doesn't block the rest
    dataService.getPatients().then(setPatients).catch(err => console.warn('Patients fetch:', err));
    dataService.getSensors().then(setSensors).catch(err => console.warn('Sensors fetch:', err));
    dataService.getStats().then(setStats).catch(err => console.warn('Stats fetch:', err));
    dataService
      .getProvenanceRecords()
      .then(prv => {
        if (prv && prv.length > 0) {
          setProvenanceRecords(prv);
          setTargetRecord(prv[0]);
          setStoredHash(prv[0].dataHash);
          setActiveHash(prv[0].dataHash);
        }
      })
      .catch(err => {
        console.warn('Provenance fetch:', err);
      });
  }, [refreshTrigger]);

  // Dynamically compute SHA-256 whenever dosageText changes
  useEffect(() => {
    async function updateDigest() {
      if (!targetRecord) return;

      if (dosageText === defaultPrescription && !targetRecord.isTampered) {
        setActiveHash(targetRecord.dataHash);
      } else {
        const payload = {
          ...targetRecord.payload,
          clinicalRecord: {
            ...targetRecord.payload?.clinicalRecord,
            prescription: dosageText,
          },
        };
        try {
          const digest = await sha256(canonicalStringify(payload));
          setActiveHash(digest);
        } catch (e) {
          console.error('SHA-256 computation error:', e);
        }
      }
    }
    updateDigest();
  }, [dosageText, targetRecord]);

  const isTampered = activeHash !== storedHash && storedHash !== '';

  const handleSimulateOverdose = async () => {
    const altered = 'Aspirin 500 mg Daily • OVERDOSE MODIFICATION';
    setDosageText(altered);
    if (targetRecord) {
      try {
        await dataService.simulateTampering(targetRecord.id, 'prescription', altered);
        triggerRefresh();
        showToast({
          type: 'error',
          title: 'Tampering Detected by Gateway',
          message: 'Clinical prescription modified to 500mg. Real-time SHA-256 deviates from anchored hash!',
        });
      } catch (e: any) {
        console.error(e);
      }
    }
  };

  const handleSimulateDrugChange = async () => {
    const altered = 'Warfarin 10 mg Daily • UNAUTHORIZED SUBSTITUTION';
    setDosageText(altered);
    if (targetRecord) {
      try {
        await dataService.simulateTampering(targetRecord.id, 'prescription', altered);
        triggerRefresh();
        showToast({
          type: 'error',
          title: 'Tampering Detected by Gateway',
          message: 'Medication substituted with Warfarin. SHA-256 hash mismatch flagged!',
        });
      } catch (e: any) {
        console.error(e);
      }
    }
  };

  const handleRestoreRecord = async () => {
    setDosageText(defaultPrescription);
    if (targetRecord) {
      try {
        await dataService.restoreOriginalPayload(targetRecord.id);
        setActiveHash(storedHash);
        triggerRefresh();
        showToast({
          type: 'success',
          title: 'Database Record Restored',
          message: 'Original prescription restored. SHA-256 digest matches anchored blockchain ledger.',
        });
      } catch (e: any) {
        console.error(e);
      }
    }
  };

  const handleCopyHash = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const toggleConsent = (physician: string, current: boolean, setter: (val: boolean) => void) => {
    setter(!current);
    showToast({
      type: !current ? 'success' : 'warning',
      title: !current ? 'Consent Granted' : 'Consent Revoked',
      message: `${physician} data access policy updated to ${!current ? 'PERMITTED' : 'BLOCKED'}.`,
    });
  };

  // Eleanor Vance's patient record (for Patient Portal perspective)
  const patientProfile = patients.find(p => p.id === 'PT-1042') || patients[0];
  const patientSensors = sensors.filter(s => patientProfile?.assignedSensors?.includes(s.id));

  // Role Meta Definition
  interface RoleMeta {
    title: string;
    subtitle: string;
    badge: string;
    badgeClass: string;
    icon: any;
    accentColor: string;
    bgAccent: string;
    actions: Array<{ label: string; icon: any; onClick: () => void; primary?: boolean }>;
    metrics: Array<{ label: string; value: string | number; sub: string; icon: any; alert?: boolean; highlight?: boolean }>;
  }

  const roleConfig: Record<string, RoleMeta> = {
    Doctor: {
      title: 'Physician Perspective • Dr. Sarah Jenkins (Cardiology)',
      subtitle:
        'Clinical scope: Inpatient telemetry review, 12-lead ECG diagnostics, prescription auditing, and trauma break-glass privileges.',
      badge: 'Attending Physician',
      badgeClass: 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]',
      icon: Stethoscope,
      accentColor: 'text-[#2d6e42]',
      bgAccent: 'bg-[#f2f7f3]',
      actions: [
        { label: 'Live ECG Workstation', icon: Activity, onClick: () => navigate('/monitoring'), primary: true },
        { label: 'Patient Registry', icon: Users, onClick: () => navigate('/patients') },
        { label: 'Emergency Break-Glass', icon: AlertOctagon, onClick: () => navigate('/emergency-access') },
      ],
      metrics: [
        { label: 'Assigned Inpatients', value: '4 Patients', sub: 'Cardio ICU & Step-down', icon: Users },
        { label: 'Active ECG Feeds', value: '6 Live Feeds', sub: '500Hz Lead II streaming', icon: Activity },
        { label: 'Clinical Anomalies', value: '1 Flagged', sub: 'Arrhythmia in Bed 12', icon: AlertTriangle, highlight: true },
        { label: 'Emergency Override', value: 'Trauma Ready', sub: '15-min Break-Glass Standby', icon: AlertOctagon },
      ],
    },
    Admin: {
      title: 'System Operations Perspective • IT & Infrastructure Root',
      subtitle:
        'Full administrative scope: Hardware IoT nodes, PUF challenge tokens, database integrity monitoring, and consortium rollup.',
      badge: 'Root Administrator',
      badgeClass: 'bg-[#f5efeb] text-[#8c6d46] border-[#d8cfc2]',
      icon: ShieldAlert,
      accentColor: 'text-[#8c6d46]',
      bgAccent: 'bg-[#f5efeb]',
      actions: [
        { label: 'Provision Sensors', icon: Cpu, onClick: () => navigate('/sensors'), primary: true },
        { label: 'Consortium Blockchain', icon: Boxes, onClick: () => navigate('/blockchain') },
        { label: 'Access Governance', icon: KeyRound, onClick: () => navigate('/access-control') },
        { label: 'Tune MDTS Weights', icon: Shield, onClick: () => navigate('/trust-analysis') },
      ],
      metrics: [
        { label: 'Total Inpatients', value: stats ? stats.patientCount : patients.length, sub: 'Enrolled across 4 wards', icon: Users },
        { label: 'IoT Hardware Fleet', value: stats ? stats.sensorCount : sensors.length, sub: `${stats?.activeSensors || 6} Streaming PUF Nodes`, icon: Cpu },
        { label: 'Database Integrity', value: isTampered ? '92.5%' : `${stats?.databaseIntegrityPercentage || 100}%`, sub: isTampered ? '1 storage mismatch' : '0 mismatches (ACID Valid)', icon: ShieldCheck, alert: isTampered },
        { label: 'Consortium Height', value: `#${stats?.consortiumBlockHeight || 189422}`, sub: '5 hospital nodes synced', icon: Boxes },
      ],
    },
    Auditor: {
      title: 'Consortium Auditor Perspective • Zero-Trust Compliance',
      subtitle:
        'Independent forensic scope: Read-only cryptographic verification, SHA-256 byte check, tamper detection, and audit trail export.',
      badge: 'Security Auditor',
      badgeClass: 'bg-[#fefce8] text-[#854d0e] border-[#fef08a]',
      icon: FileCheck2,
      accentColor: 'text-[#854d0e]',
      bgAccent: 'bg-[#fefce8]',
      actions: [
        { label: 'Inspect Provenance Ledger', icon: ShieldCheck, onClick: () => navigate('/provenance'), primary: true },
        { label: 'Verify Merkle Proofs', icon: Boxes, onClick: () => navigate('/blockchain') },
        { label: 'Forensic Audit Logs', icon: ScrollText, onClick: () => navigate('/audit-logs') },
      ],
      metrics: [
        { label: 'Anchored Provenance', value: `${stats?.provenanceCount || 8} Records`, sub: 'SHA-256 hashed on ingest', icon: ShieldCheck },
        { label: 'Storage Divergences', value: isTampered ? '1 Compromised' : '0 Compromised', sub: isTampered ? 'Hash mismatch active' : '100% Bit-level match', icon: AlertTriangle, alert: isTampered },
        { label: 'Consortium Blocks', value: `#${stats?.consortiumBlockHeight || 189422}`, sub: 'Layer-2 Merkle Rollup', icon: Boxes },
        { label: 'Forensic Audit Trail', value: '12 Events', sub: 'Cryptographic ledger active', icon: ScrollText },
      ],
    },
    Patient: {
      title: 'Patient Portal Perspective • Eleanor Vance (Bed 04)',
      subtitle:
        'Personal health portal: Real-time telemetry monitoring, bound biometric sensors, informed consent permissions, and tamper protection.',
      badge: 'Patient Portal',
      badgeClass: 'bg-[#eff6ff] text-[#1e40af] border-[#bfdbfe]',
      icon: Heart,
      accentColor: 'text-[#1e40af]',
      bgAccent: 'bg-[#eff6ff]',
      actions: [
        { label: 'View My Live Telemetry', icon: Activity, onClick: () => navigate('/monitoring'), primary: true },
        { label: 'My Consent & Permissions', icon: KeyRound, onClick: () => navigate('/access-control') },
        { label: 'My Medical Provenance', icon: ShieldCheck, onClick: () => navigate('/provenance') },
      ],
      metrics: [
        { label: 'Hospital Location', value: 'Cardio ICU', sub: 'Bed 04 • Post-CABG Recovery', icon: Users },
        { label: 'Bound Medical Sensors', value: '2 Sensors', sub: 'Lead II ECG + SpO2 Oximeter', icon: Cpu },
        { label: 'Health Trust Score', value: `${patientProfile?.latestTrustScore || 96.4}%`, sub: 'Optimal Telemetry Verified', icon: ShieldCheck },
        { label: 'Consented Physicians', value: '2 Approved', sub: 'Cardiology & Trauma Surgery', icon: UserCheck },
      ],
    },
  };

  const currentRoleConfig: RoleMeta = roleConfig[activeRole] || roleConfig.Doctor;
  const RoleIcon = currentRoleConfig.icon;

  return (
    <div className="space-y-6">
      {/* 1. Dynamic Role Perspective Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#e6dfd5] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`w-11 h-11 rounded-2xl ${currentRoleConfig.bgAccent} border border-[#d8cfc2] flex items-center justify-center shrink-0 shadow-2xs`}>
              <RoleIcon className={`w-5 h-5 ${currentRoleConfig.accentColor}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-[#2c2623] tracking-tight">
                  {currentRoleConfig.title}
                </h1>
                <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${currentRoleConfig.badgeClass}`}>
                  {currentRoleConfig.badge}
                </span>
              </div>
              <p className="text-xs text-[#78716c] mt-1 leading-relaxed">
                {currentRoleConfig.subtitle}
              </p>
            </div>
          </div>

          {/* Role-Specific Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {currentRoleConfig.actions.map(act => {
              const ActionIcon = act.icon;
              return (
                <button
                  key={act.label}
                  onClick={act.onClick}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    act.primary
                      ? 'bg-[#8c6d46] hover:bg-[#745733] text-white shadow-xs'
                      : 'bg-white hover:bg-[#faf7f2] text-[#2c2623] border border-[#d8cfc2] shadow-2xs'
                  }`}
                >
                  <ActionIcon className="w-3.5 h-3.5" />
                  <span>{act.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Role-Tailored KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {currentRoleConfig.metrics.map(metric => {
          const MetricIcon = metric.icon;
          return (
            <div key={metric.label} className="p-4 rounded-2xl bg-white border border-[#e6dfd5] shadow-xs">
              <div className="flex items-center justify-between text-[#78716c] text-xs font-medium">
                <span>{metric.label}</span>
                <MetricIcon className={`w-4 h-4 ${metric.alert ? 'text-[#9e2a2b]' : 'text-[#8c6d46]'}`} />
              </div>
              <div
                className={`mt-2 text-2xl font-bold font-mono ${
                  metric.alert ? 'text-[#9e2a2b]' : metric.highlight ? 'text-[#b58550]' : 'text-[#2c2623]'
                }`}
              >
                {metric.value}
              </div>
              <div className="text-[11px] text-[#78716c] mt-0.5 truncate">{metric.sub}</div>
            </div>
          );
        })}
      </div>

      {/* 3. PATIENT PERSPECTIVE VIEW: Personal Health & Consent Workstation */}
      {activeRole === 'Patient' ? (
        <div className="space-y-6">
          {/* Personal Health & Live Telemetry Card */}
          <div className="p-5 rounded-2xl bg-white border border-[#e6dfd5] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e6dfd5]">
              <div>
                <h2 className="text-sm font-bold text-[#2c2623] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#8c6d46]" />
                  My Personal Telemetry & Vitals Stream
                </h2>
                <p className="text-xs text-[#78716c] mt-0.5">
                  Live encrypted telemetry stream ingested from your ICU bed monitors.
                </p>
              </div>
              <button
                onClick={() => navigate('/monitoring')}
                className="px-3.5 py-1.5 rounded-xl bg-[#8c6d46] hover:bg-[#745733] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Open Live 500Hz ECG Oscilloscope</span>
              </button>
            </div>

            {/* Vitals Grid for Eleanor */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#faf7f2] border border-[#e6dfd5]">
                <span className="text-[#78716c] text-[11px] block">Heart Rate</span>
                <div className="text-xl font-bold font-mono text-[#2c2623] mt-1">72 bpm</div>
                <span className="text-[10px] text-[#2d6e42] font-semibold">Normal Sinus Rhythm</span>
              </div>
              <div className="p-3 rounded-xl bg-[#faf7f2] border border-[#e6dfd5]">
                <span className="text-[#78716c] text-[11px] block">Pulse Oximetry (SpO2)</span>
                <div className="text-xl font-bold font-mono text-[#2d6e42] mt-1">98%</div>
                <span className="text-[10px] text-[#2d6e42] font-semibold">Optimal Oxygenation</span>
              </div>
              <div className="p-3 rounded-xl bg-[#faf7f2] border border-[#e6dfd5]">
                <span className="text-[#78716c] text-[11px] block">Blood Pressure (NIBP)</span>
                <div className="text-xl font-bold font-mono text-[#2c2623] mt-1">120/80</div>
                <span className="text-[10px] text-[#78716c]">Normotensive mmHg</span>
              </div>
              <div className="p-3 rounded-xl bg-[#faf7f2] border border-[#e6dfd5]">
                <span className="text-[#78716c] text-[11px] block">Gateway Trust Score</span>
                <div className="text-xl font-bold font-mono text-[#8c6d46] mt-1">96.4%</div>
                <span className="text-[10px] text-[#2d6e42] font-semibold">High Confidence</span>
              </div>
            </div>
          </div>

          {/* Split Row: Bound Sensors & Inpatient Informed Consent Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left (6 Cols): My Bound Biometric Sensors */}
            <div className="lg:col-span-6 p-5 rounded-2xl bg-white border border-[#e6dfd5] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#2c2623] flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-[#8c6d46]" />
                    My Bound Biometric Sensors
                  </h3>
                  <p className="text-xs text-[#78716c]">Hardware telemetry nodes attached to your profile</p>
                </div>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-lg bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]">
                  2 Connected
                </span>
              </div>

              <div className="space-y-2 pt-1">
                {patientSensors.map(sensor => (
                  <div key={sensor.id} className="p-3 rounded-xl bg-[#faf7f2] border border-[#e6dfd5] text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[#2c2623]">{sensor.id}</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]">
                        {sensor.authStatus}
                      </span>
                    </div>
                    <div className="text-[#78716c] text-xs font-medium">{sensor.type}</div>
                    <div className="flex items-center justify-between text-[11px] text-[#78716c] pt-1">
                      <span className="flex items-center gap-1">
                        <Wifi className="w-3 h-3 text-[#8c6d46]" /> Signal: {sensor.signalQuality}%
                      </span>
                      <span className="flex items-center gap-1">
                        <Battery className="w-3 h-3 text-[#2d6e42]" /> Battery: {sensor.batteryLevel}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right (6 Cols): Interactive Informed Consent Management */}
            <div className="lg:col-span-6 p-5 rounded-2xl bg-white border border-[#e6dfd5] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#2c2623] flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-[#8c6d46]" />
                    Inpatient Informed Consent Management
                  </h3>
                  <p className="text-xs text-[#78716c]">Control which physicians are authorized to access your data</p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                {/* Doctor 1: Dr. Sarah Jenkins */}
                <div className="p-3 rounded-xl bg-[#faf7f2] border border-[#e6dfd5] flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-[#2c2623]">Dr. Sarah Jenkins</div>
                    <div className="text-[11px] text-[#78716c]">Chief of Cardiology (Attending)</div>
                  </div>
                  <button
                    onClick={() => toggleConsent('Dr. Sarah Jenkins', consentDoctorJenkins, setConsentDoctorJenkins)}
                    className="flex items-center gap-1 text-xs font-semibold cursor-pointer"
                  >
                    {consentDoctorJenkins ? (
                      <span className="flex items-center gap-1 text-[#2d6e42]">
                        <ToggleRight className="w-6 h-6 text-[#2d6e42]" />
                        <span>Granted</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[#9e2a2b]">
                        <ToggleLeft className="w-6 h-6 text-[#78716c]" />
                        <span>Revoked</span>
                      </span>
                    )}
                  </button>
                </div>

                {/* Doctor 2: Dr. Robert House */}
                <div className="p-3 rounded-xl bg-[#faf7f2] border border-[#e6dfd5] flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-[#2c2623]">Dr. Robert House</div>
                    <div className="text-[11px] text-[#78716c]">Trauma Resuscitation & Surgery</div>
                  </div>
                  <button
                    onClick={() => toggleConsent('Dr. Robert House', consentDoctorHouse, setConsentDoctorHouse)}
                    className="flex items-center gap-1 text-xs font-semibold cursor-pointer"
                  >
                    {consentDoctorHouse ? (
                      <span className="flex items-center gap-1 text-[#2d6e42]">
                        <ToggleRight className="w-6 h-6 text-[#2d6e42]" />
                        <span>Granted</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[#9e2a2b]">
                        <ToggleLeft className="w-6 h-6 text-[#78716c]" />
                        <span>Revoked</span>
                      </span>
                    )}
                  </button>
                </div>

                {/* Research Opt-In */}
                <div className="p-3 rounded-xl bg-[#faf7f2] border border-[#e6dfd5] flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-[#2c2623]">Academic Cardiac Research</div>
                    <div className="text-[11px] text-[#78716c]">Anonymized consortium research pool</div>
                  </div>
                  <button
                    onClick={() => toggleConsent('Clinical Research', consentResearch, setConsentResearch)}
                    className="flex items-center gap-1 text-xs font-semibold cursor-pointer"
                  >
                    {consentResearch ? (
                      <span className="flex items-center gap-1 text-[#2d6e42]">
                        <ToggleRight className="w-6 h-6 text-[#2d6e42]" />
                        <span>Opted In</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[#78716c]">
                        <ToggleLeft className="w-6 h-6 text-[#78716c]" />
                        <span>Opted Out</span>
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 4. Cryptographic Record Integrity Auditor (Available across Admin, Doctor & Auditor perspectives) */}
      <div className="p-5 rounded-2xl bg-white border border-[#e6dfd5] shadow-xs space-y-4">
        {/* Console Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e6dfd5]">
          <div>
            <h2 className="text-sm font-bold text-[#2c2623] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#8c6d46]" />
              {activeRole === 'Auditor'
                ? 'Forensic Record Integrity & SHA-256 Audit Console'
                : activeRole === 'Patient'
                ? 'My Cryptographic Health Record Protection'
                : 'Cryptographic Record Integrity Auditor'}
            </h2>
            <p className="text-xs text-[#78716c] mt-0.5">
              {activeRole === 'Patient'
                ? 'Your clinical prescriptions are hashed with SHA-256 and anchored to the hospital blockchain to prevent unauthorized alteration.'
                : 'Live byte-level SHA-256 hash comparison between the database storage row and the anchored consortium Merkle root.'}
            </p>
          </div>

          {/* Scenario simulation controls (Enabled for Admin, Doctor, Auditor) */}
          {activeRole !== 'Patient' && (
            <div className="flex flex-wrap items-center gap-2">
              {!isTampered ? (
                <>
                  <button
                    onClick={handleSimulateOverdose}
                    className="px-3 py-1.5 rounded-xl bg-[#fdf3f3] hover:bg-[#fae4e5] text-[#9e2a2b] text-xs font-bold border border-[#f5cacc] cursor-pointer transition-colors shadow-2xs"
                  >
                    Simulate Overdose (500mg)
                  </button>
                  <button
                    onClick={handleSimulateDrugChange}
                    className="px-3 py-1.5 rounded-xl bg-[#fdf8f0] hover:bg-[#fbf1e2] text-[#b58550] text-xs font-bold border border-[#f2dfbe] cursor-pointer transition-colors shadow-2xs"
                  >
                    Simulate Drug Alteration
                  </button>
                </>
              ) : (
                <button
                  onClick={handleRestoreRecord}
                  className="px-3.5 py-1.5 rounded-xl bg-[#f2f7f3] hover:bg-[#e2ede4] text-[#2d6e42] border border-[#c6dcce] text-xs font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Authentic Database Record</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Target Database Row Metadata */}
        <div className="p-3.5 rounded-xl bg-[#faf7f2] border border-[#e6dfd5] text-xs space-y-2">
          <div className="flex flex-wrap items-center justify-between text-[#78716c] font-medium gap-2">
            <span className="flex items-center gap-1.5 text-[#2c2623]">
              <FileText className="w-3.5 h-3.5 text-[#8c6d46]" />
              Database Record: <strong className="font-mono text-[#2c2623]">{targetRecord?.id || 'PRV-90410'}</strong>
            </span>
            <span>
              Patient: <strong>{targetRecord?.patientName || 'Eleanor Vance'} ({targetRecord?.patientId || 'PT-1042'})</strong> • Bed 04
            </span>
            <span>
              Attending: <strong>Dr. Sarah Jenkins</strong>
            </span>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#78716c] block mb-1">
              {activeRole === 'Patient'
                ? 'Your Official Verified Clinical Prescription:'
                : 'Live Prescription Payload (Editable for testing):'}
            </label>
            <input
              type="text"
              value={dosageText}
              onChange={e => setDosageText(e.target.value)}
              disabled={activeRole === 'Patient'}
              className={`w-full px-3 py-2 rounded-xl border font-mono text-xs transition-colors focus:outline-hidden ${
                isTampered
                  ? 'bg-[#fdf3f3] border-[#f5cacc] text-[#9e2a2b] font-bold'
                  : 'bg-white border-[#d8cfc2] text-[#2c2623]'
              }`}
            />
          </div>
        </div>

        {/* Live Integrity Verdict Banner */}
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            isTampered ? 'bg-[#fdf3f3] border-[#f5cacc] text-[#9e2a2b]' : 'bg-[#f2f7f3] border-[#c6dcce] text-[#2d6e42]'
          }`}
        >
          <div className="flex items-center gap-3">
            {isTampered ? (
              <AlertTriangle className="w-5 h-5 text-[#9e2a2b] shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-[#2d6e42] shrink-0" />
            )}
            <div>
              <div className="font-bold">
                {isTampered
                  ? 'CRITICAL INTEGRITY FAILURE: Database row has been tampered with!'
                  : 'Cryptographic Integrity Confirmed: Database record matches blockchain root'}
              </div>
              <div className="text-[11px] text-[#78716c] mt-0.5">
                {isTampered
                  ? 'The live computed SHA-256 digest deviates from the immutable Merkle root anchored on the consortium blockchain.'
                  : 'Byte-for-byte SHA-256 equality validated. The stored clinical prescription has not been modified.'}
              </div>
            </div>
          </div>
          <span
            className={`font-mono font-bold text-[11px] px-2.5 py-1 rounded-lg border shrink-0 ${
              isTampered
                ? 'bg-[#fdf3f3] text-[#9e2a2b] border-[#f5cacc]'
                : 'bg-[#f2f7f3] text-[#2d6e42] border-[#c6dcce]'
            }`}
          >
            {isTampered ? 'TAMPERED' : 'VERIFIED'}
          </span>
        </div>

        {/* Side-by-Side Cryptographic Hash Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-[#faf7f2] border border-[#e6dfd5] space-y-1">
            <div className="flex items-center justify-between text-[#78716c] text-[11px] font-sans font-medium">
              <span>Anchored Blockchain Hash (Block #{stats?.consortiumBlockHeight || 189422}):</span>
              <button
                onClick={() => handleCopyHash(storedHash)}
                className="text-[#8c6d46] hover:text-[#745733] flex items-center gap-1 cursor-pointer"
              >
                {isCopied ? <Check className="w-3 h-3 text-[#2d6e42]" /> : <Copy className="w-3 h-3 text-[#8c6d46]" />}
                <span>{isCopied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="text-[#2c2623] truncate font-semibold select-all font-mono">
              {storedHash || defaultHash}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#faf7f2] border border-[#e6dfd5] space-y-1">
            <div className="text-[#78716c] text-[11px] font-sans font-medium">
              Live Computed SHA-256 Digest (Current Row):
            </div>
            <div className={`truncate font-bold select-all font-mono ${isTampered ? 'text-[#9e2a2b]' : 'text-[#2d6e42]'}`}>
              {activeHash || defaultHash}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Split Workstation View: Patient Registry & Hardware Security (Rendered for Doctor, Admin, Auditor) */}
      {activeRole !== 'Patient' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left (7 Cols): Patient Database Table */}
          <div className="lg:col-span-7 p-5 rounded-2xl bg-white border border-[#e6dfd5] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#2c2623]">
                  {activeRole === 'Doctor' ? 'My Assigned Inpatient Telemetry Feeds' : 'Inpatient Health Database'}
                </h3>
                <p className="text-xs text-[#78716c]">
                  {activeRole === 'Doctor'
                    ? 'ICU patients currently monitored under your clinical supervision'
                    : 'Live electronic patient records tracked by the gateway'}
                </p>
              </div>
              <button
                onClick={() => navigate('/patients')}
                className="text-xs text-[#8c6d46] hover:text-[#745733] font-semibold cursor-pointer flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e6dfd5] text-[#78716c] text-[11px] uppercase tracking-wider font-semibold">
                    <th className="pb-2.5">ID</th>
                    <th className="pb-2.5">Patient Name</th>
                    <th className="pb-2.5">Ward</th>
                    <th className="pb-2.5">Clinical Condition</th>
                    <th className="pb-2.5">Trust Score</th>
                    <th className="pb-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f5efeb]">
                  {patients.slice(0, 5).map(pt => (
                    <tr key={pt.id} className="hover:bg-[#faf7f2] transition-colors">
                      <td className="py-2.5 font-mono font-bold text-[#8c6d46]">{pt.id}</td>
                      <td className="py-2.5 text-[#2c2623] font-medium">{pt.name}</td>
                      <td className="py-2.5 text-[#78716c]">{pt.ward}</td>
                      <td className="py-2.5 text-[#2c2623] truncate max-w-44">{pt.condition}</td>
                      <td className="py-2.5 font-mono font-semibold text-[#2d6e42]">{pt.latestTrustScore}%</td>
                      <td className="py-2.5 text-right">
                        {activeRole === 'Doctor' ? (
                          <button
                            onClick={() => navigate('/monitoring')}
                            className="px-2 py-1 rounded-md text-[10px] font-semibold bg-[#f5efeb] hover:bg-[#e6dfd5] text-[#8c6d46] border border-[#d8cfc2] transition-colors cursor-pointer"
                          >
                            ECG Stream
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-[#f2f7f3] text-[#2d6e42] border border-[#c6dcce]">
                            VERIFIED
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right (5 Cols): Hardware IoT Nodes & PUF Security */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-white border border-[#e6dfd5] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#2c2623]">
                  {activeRole === 'Auditor' ? 'Hardware PUF Identity Ledger' : 'IoT Hardware Nodes (PUF)'}
                </h3>
                <p className="text-xs text-[#78716c]">Hardware challenge authentication status</p>
              </div>
              <button
                onClick={() => navigate('/sensors')}
                className="text-xs text-[#8c6d46] hover:text-[#745733] font-semibold cursor-pointer flex items-center gap-1"
              >
                <span>Manage</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {sensors.slice(0, 3).map(sensor => (
                <div key={sensor.id} className="p-3 rounded-xl bg-[#faf7f2] border border-[#e6dfd5] text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#2c2623]">{sensor.id}</span>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-[#f5efeb] text-[#8c6d46] border border-[#d8cfc2]">
                      {sensor.authStatus}
                    </span>
                  </div>
                  <div className="text-[#78716c] text-[11px] font-medium">{sensor.type}</div>
                  <div className="flex items-center justify-between pt-1 text-[11px] text-[#78716c] font-mono">
                    <span>Trust: {sensor.deviceTrust}/100</span>
                    <span className="truncate max-w-36 text-[10px] text-[#78716c]">{sensor.hardwareFingerprint}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
