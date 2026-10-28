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
    // Resilient independent fetches
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
    greeting: string;
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
      greeting: 'Welcome back, Dr. Sarah Jenkins',
      title: 'Attending Cardiologist',
      subtitle:
        'Clinical scope: Inpatient telemetry review, 12-lead ECG diagnostics, prescription auditing, and trauma break-glass privileges.',
      badge: 'Attending Physician',
      badgeClass: 'bg-[#EBF3ED] text-[#306B49] border-[#C8E1D2]',
      icon: Stethoscope,
      accentColor: 'text-[#306B49]',
      bgAccent: 'bg-[#EBF3ED]',
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
      greeting: 'Welcome back, IT Security Admin',
      title: 'Gateway Root Operator',
      subtitle:
        'Full administrative scope: Hardware IoT nodes, PUF challenge tokens, database integrity monitoring, and consortium rollup.',
      badge: 'Root Administrator',
      badgeClass: 'bg-[#FAF5EE] text-[#8C6642] border-[#E8DACB]',
      icon: ShieldAlert,
      accentColor: 'text-[#8C6642]',
      bgAccent: 'bg-[#FAF5EE]',
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
      greeting: 'Welcome back, Security Auditor',
      title: 'Consortium Forensic Inspector',
      subtitle:
        'Independent forensic scope: Read-only cryptographic verification, SHA-256 byte check, tamper detection, and audit trail export.',
      badge: 'Security Auditor',
      badgeClass: 'bg-[#FAF5EE] text-[#9A6424] border-[#F2DAC0]',
      icon: FileCheck2,
      accentColor: 'text-[#9A6424]',
      bgAccent: 'bg-[#FAF5EE]',
      actions: [
        { label: 'Verify Provenance', icon: ShieldCheck, onClick: () => navigate('/provenance'), primary: true },
        { label: 'Audit Trail Export', icon: ScrollText, onClick: () => navigate('/audit-logs') },
        { label: 'Inspect Merkle Root', icon: Boxes, onClick: () => navigate('/blockchain') },
      ],
      metrics: [
        { label: 'Provenance Records', value: stats ? stats.provenanceCount : provenanceRecords.length, sub: 'Cryptographically chained', icon: ShieldCheck },
        { label: 'Tamper Incidents', value: isTampered ? '1 DETECTED' : '0 Clean', sub: isTampered ? 'Divergent SHA-256 Digest' : '100% Hash Consistency', icon: AlertTriangle, alert: isTampered },
        { label: 'Consortium Blocks', value: stats?.blockCount || 3, sub: 'PoA Consensus Finalized', icon: Boxes },
        { label: 'Pending Authorizations', value: stats?.pendingAccessRequests || 2, sub: 'Requires Review', icon: KeyRound },
      ],
    },
    Patient: {
      greeting: 'Welcome back, Eleanor Vance',
      title: 'Patient Portal (Bed 04)',
      subtitle:
        'Patient view: Encrypted personal vitals, active bedside telemetry feeds, and informed consent authorization controls.',
      badge: 'Protected Inpatient',
      badgeClass: 'bg-[#EFF5FA] text-[#2C6288] border-[#CCE0EE]',
      icon: Heart,
      accentColor: 'text-[#2C6288]',
      bgAccent: 'bg-[#EFF5FA]',
      actions: [
        { label: 'View My Live ECG', icon: Activity, onClick: () => navigate('/monitoring'), primary: true },
        { label: 'My Privacy Consents', icon: KeyRound, onClick: () => navigate('/access-control') },
        { label: 'My Verified Records', icon: ShieldCheck, onClick: () => navigate('/provenance') },
      ],
      metrics: [
        { label: 'Monitoring Status', value: 'Active', sub: 'ICU Telemetry Synced', icon: Activity },
        { label: 'Assigned Sensors', value: '2 Devices', sub: '12-Lead ECG + SpO2', icon: Cpu },
        { label: 'Clinical Condition', value: 'Post-CABG', sub: 'Cardio Step-down Bed 04', icon: Heart },
        { label: 'Data Trust Rating', value: '96.4%', sub: 'Hardware PUF Verified', icon: ShieldCheck },
      ],
    },
  };

  const currentRoleConfig = roleConfig[activeRole] || roleConfig.Doctor;
  const RoleHeaderIcon = currentRoleConfig.icon;

  return (
    <div className="space-y-6">
      {/* 1. Glassy Role-Adaptive Executive Header */}
      <div className="bubbly-glass rounded-[28px] p-6 md:p-8 relative overflow-hidden">
        {/* Soft Ambient Light Glows inside Panel */}
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-gradient-to-br from-[#EAD7C0]/40 via-[#E4CDAE]/20 to-transparent blur-2xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 rounded-full bg-gradient-to-tr from-[#DFC3A3]/30 via-transparent to-transparent blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#8C6642] text-white flex items-center justify-center shadow-[0_4px_16px_rgba(140,102,66,0.22)] shrink-0 mt-0.5">
              <RoleHeaderIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold text-[#30291F] tracking-tight font-serif whitespace-normal">
                  {currentRoleConfig.greeting}
                </h1>
                <span className={`text-[11px] font-semibold px-3 py-1 rounded-full border shadow-2xs ${currentRoleConfig.badgeClass}`}>
                  {currentRoleConfig.badge}
                </span>
              </div>
              <p className="text-xs text-[#82776A] mt-1.5 leading-relaxed max-w-3xl">
                {currentRoleConfig.subtitle}
              </p>
            </div>
          </div>

          {/* Role-Specific Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {currentRoleConfig.actions.map(act => {
              const ActionIcon = act.icon;
              return (
                <button
                  key={act.label}
                  onClick={act.onClick}
                  className={act.primary ? 'pill-btn-primary' : 'pill-btn-secondary'}
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
            <div
              key={metric.label}
              className="bubbly-card rounded-[24px] p-5 space-y-2 relative overflow-hidden transition-all duration-200"
            >
              <div className="flex items-center justify-between text-[#82776A] text-xs font-medium">
                <span className="uppercase tracking-wider text-[11px] font-semibold">{metric.label}</span>
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                    metric.alert
                      ? 'bg-[#B85C4A]/10 text-[#B85C4A] border border-[#B85C4A]/20'
                      : 'bg-[#8C6642]/10 text-[#8C6642] border border-[#8C6642]/15'
                  }`}
                >
                  <MetricIcon className="w-4 h-4" />
                </div>
              </div>
              <div
                className={`text-2xl md:text-3xl font-bold font-serif ${
                  metric.alert ? 'text-[#B85C4A]' : metric.highlight ? 'text-[#8C6642]' : 'text-[#30291F]'
                }`}
              >
                {metric.value}
              </div>
              <div className="text-[11px] text-[#82776A] truncate">{metric.sub}</div>
            </div>
          );
        })}
      </div>

      {/* 3. PATIENT PERSPECTIVE VIEW: Personal Health & Consent Workstation */}
      {activeRole === 'Patient' ? (
        <div className="space-y-6">
          {/* Personal Health & Live Telemetry Card */}
          <div className="bubbly-glass p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[rgba(160,140,115,0.12)]">
              <div>
                <h2 className="text-base font-bold text-[#2A241E] flex items-center gap-2 font-serif">
                  <Activity className="w-4 h-4 text-[#9C7854]" />
                  My Personal Telemetry & Vitals Stream
                </h2>
                <p className="text-xs text-[#756A5C] mt-0.5">
                  Live encrypted telemetry stream ingested from your ICU bed monitors.
                </p>
              </div>
              <button
                onClick={() => navigate('/monitoring')}
                className="pill-btn-primary"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Open Live 500Hz ECG Oscilloscope</span>
              </button>
            </div>

            {/* Vitals Grid for Eleanor */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
              <div className="bubbly-card-tinted p-4 space-y-1">
                <span className="text-[#756A5C] text-[11px] block font-medium">Heart Rate</span>
                <div className="text-2xl font-bold font-serif text-[#2A241E]">72 bpm</div>
                <span className="text-[10px] text-[#2D6643] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3E7754]" /> Normal Sinus Rhythm
                </span>
              </div>
              <div className="bubbly-card-tinted p-4 space-y-1">
                <span className="text-[#756A5C] text-[11px] block font-medium">Pulse Oximetry (SpO2)</span>
                <div className="text-2xl font-bold font-serif text-[#2D6643]">98%</div>
                <span className="text-[10px] text-[#2D6643] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3E7754]" /> Optimal Oxygenation
                </span>
              </div>
              <div className="bubbly-card-tinted p-4 space-y-1">
                <span className="text-[#756A5C] text-[11px] block font-medium">Blood Pressure (NIBP)</span>
                <div className="text-2xl font-bold font-serif text-[#2A241E]">120/80</div>
                <span className="text-[10px] text-[#756A5C]">Normotensive mmHg</span>
              </div>
              <div className="bubbly-card-tinted p-4 space-y-1">
                <span className="text-[#756A5C] text-[11px] block font-medium">Gateway Trust Score</span>
                <div className="text-2xl font-bold font-serif text-[#9C7854]">96.4%</div>
                <span className="text-[10px] text-[#2D6643] font-semibold">High Confidence</span>
              </div>
            </div>
          </div>

          {/* Split Row: Bound Sensors & Inpatient Informed Consent Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left (6 Cols): My Bound Biometric Sensors */}
            <div className="lg:col-span-6 bubbly-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#2A241E] flex items-center gap-1.5 font-serif text-base">
                    <Cpu className="w-4 h-4 text-[#9C7854]" />
                    My Bound Biometric Sensors
                  </h3>
                  <p className="text-xs text-[#756A5C]">Hardware telemetry nodes attached to your profile</p>
                </div>
                <span className="text-xs font-mono font-semibold px-3 py-1 rounded-full bg-[#EBF3ED] text-[#2D6643] border border-[#C8E1D2]">
                  2 Connected
                </span>
              </div>

              <div className="space-y-2.5 pt-1">
                {patientSensors.map(sensor => (
                  <div key={sensor.id} className="p-3.5 rounded-2xl bg-white/70 border border-white/80 shadow-2xs text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[#2A241E]">{sensor.id}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#EBF3ED] text-[#2D6643] border border-[#C8E1D2]">
                        {sensor.authStatus}
                      </span>
                    </div>
                    <div className="text-[#756A5C] text-xs font-medium">{sensor.type}</div>
                    <div className="flex items-center justify-between text-[11px] text-[#756A5C] pt-1">
                      <span className="flex items-center gap-1">
                        <Wifi className="w-3.5 h-3.5 text-[#9C7854]" /> Signal: {sensor.signalQuality}%
                      </span>
                      <span className="flex items-center gap-1">
                        <Battery className="w-3.5 h-3.5 text-[#2D6643]" /> Battery: {sensor.batteryLevel}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right (6 Cols): Interactive Informed Consent Management */}
            <div className="lg:col-span-6 bubbly-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#2A241E] flex items-center gap-1.5 font-serif text-base">
                    <KeyRound className="w-4 h-4 text-[#9C7854]" />
                    Inpatient Informed Consent Management
                  </h3>
                  <p className="text-xs text-[#756A5C]">Control which physicians are authorized to access your data</p>
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                {/* Doctor 1 */}
                <div className="p-3.5 rounded-2xl bg-white/70 border border-white/80 shadow-2xs flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-[#2A241E]">Dr. Sarah Jenkins</div>
                    <div className="text-[11px] text-[#756A5C]">Chief of Cardiology (Attending)</div>
                  </div>
                  <button
                    onClick={() => toggleConsent('Dr. Sarah Jenkins', consentDoctorJenkins, setConsentDoctorJenkins)}
                    className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    {consentDoctorJenkins ? (
                      <span className="flex items-center gap-1.5 text-[#2D6643] px-3 py-1 rounded-full bg-[#EBF3ED] border border-[#C8E1D2]">
                        <ToggleRight className="w-4 h-4 text-[#2D6643]" />
                        <span>Granted</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[#BF4E3B] px-3 py-1 rounded-full bg-[#FDF0EE] border border-[#F5CAC3]">
                        <ToggleLeft className="w-4 h-4 text-[#BF4E3B]" />
                        <span>Revoked</span>
                      </span>
                    )}
                  </button>
                </div>

                {/* Doctor 2 */}
                <div className="p-3.5 rounded-2xl bg-white/70 border border-white/80 shadow-2xs flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-[#2A241E]">Dr. Robert House</div>
                    <div className="text-[11px] text-[#756A5C]">Trauma Resuscitation & Surgery</div>
                  </div>
                  <button
                    onClick={() => toggleConsent('Dr. Robert House', consentDoctorHouse, setConsentDoctorHouse)}
                    className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    {consentDoctorHouse ? (
                      <span className="flex items-center gap-1.5 text-[#2D6643] px-3 py-1 rounded-full bg-[#EBF3ED] border border-[#C8E1D2]">
                        <ToggleRight className="w-4 h-4 text-[#2D6643]" />
                        <span>Granted</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[#BF4E3B] px-3 py-1 rounded-full bg-[#FDF0EE] border border-[#F5CAC3]">
                        <ToggleLeft className="w-4 h-4 text-[#BF4E3B]" />
                        <span>Revoked</span>
                      </span>
                    )}
                  </button>
                </div>

                {/* Research Opt-In */}
                <div className="p-3.5 rounded-2xl bg-white/70 border border-white/80 shadow-2xs flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-[#2A241E]">Academic Cardiac Research</div>
                    <div className="text-[11px] text-[#756A5C]">Anonymized consortium research pool</div>
                  </div>
                  <button
                    onClick={() => toggleConsent('Clinical Research', consentResearch, setConsentResearch)}
                    className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    {consentResearch ? (
                      <span className="flex items-center gap-1.5 text-[#306B49] px-3 py-1 rounded-full bg-[#EBF3ED] border border-[#C8E1D2]">
                        <ToggleRight className="w-4 h-4 text-[#306B49]" />
                        <span>Opted In</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[#82776A] px-3 py-1 rounded-full bg-[#30291F]/5 border border-transparent">
                        <ToggleLeft className="w-4 h-4 text-[#82776A]" />
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

      {/* 4. Cryptographic Record Integrity Auditor */}
      <div className="bubbly-glass rounded-[28px] p-6 md:p-8 space-y-6 relative overflow-hidden">
        {/* Subtle Ambient Refraction Spot */}
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-gradient-to-br from-[#EAD7C0]/35 via-[#E4CDAE]/20 to-transparent blur-3xl pointer-events-none" />

        {/* Console Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[rgba(112,91,66,0.12)] relative z-10">
          <div>
            <h2 className="text-base md:text-lg font-bold text-[#30291F] flex items-center gap-2 font-serif">
              <Lock className="w-4 h-4 text-[#8C6642]" />
              {activeRole === 'Auditor'
                ? 'Forensic Record Integrity & SHA-256 Audit Console'
                : activeRole === 'Patient'
                ? 'My Cryptographic Health Record Protection'
                : 'Cryptographic Record Integrity Auditor'}
            </h2>
            <p className="text-xs text-[#82776A] mt-1 max-w-2xl leading-relaxed">
              {activeRole === 'Patient'
                ? 'Your clinical prescriptions are hashed with SHA-256 and anchored to the hospital blockchain to prevent unauthorized alteration.'
                : 'Live byte-level SHA-256 hash comparison between the database storage row and the anchored consortium Merkle root.'}
            </p>
          </div>

          {/* Scenario simulation controls */}
          {activeRole !== 'Patient' && (
            <div className="flex flex-wrap items-center gap-2">
              {!isTampered ? (
                <>
                  <button
                    onClick={handleSimulateOverdose}
                    className="pill-btn-danger"
                  >
                    Simulate Overdose (500mg)
                  </button>
                  <button
                    onClick={handleSimulateDrugChange}
                    className="pill-btn-secondary"
                  >
                    Simulate Drug Alteration
                  </button>
                </>
              ) : (
                <button
                  onClick={handleRestoreRecord}
                  className="pill-btn-primary"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Authentic Database Record</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Target Database Row Metadata Workspace */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFCF7]/65 border border-white/80 text-xs space-y-3.5 shadow-2xs backdrop-blur-md relative z-10">
          <div className="flex flex-wrap items-center justify-between text-[#82776A] font-medium gap-2">
            <span className="flex items-center gap-1.5 text-[#30291F]">
              <FileText className="w-3.5 h-3.5 text-[#8C6642]" />
              Database Record:{' '}
              <strong className="font-mono text-[#30291F] bg-[#FAF5EE] px-2.5 py-0.5 rounded-lg border border-[#E8DACB]">
                {targetRecord?.id || 'PRV-90410'}
              </strong>
            </span>
            <span>
              Patient:{' '}
              <strong className="text-[#30291F]">
                {targetRecord?.patientName || 'Eleanor Vance'} ({targetRecord?.patientId || 'PT-1042'})
              </strong>{' '}
              • Bed 04
            </span>
            <span>
              Attending: <strong className="text-[#30291F]">Dr. Sarah Jenkins</strong>
            </span>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#82776A] block mb-1.5">
              {activeRole === 'Patient'
                ? 'Your Official Verified Clinical Prescription:'
                : 'Live Prescription Payload (Editable for real-time SHA-256 recalculation):'}
            </label>
            <input
              type="text"
              value={dosageText}
              onChange={e => setDosageText(e.target.value)}
              disabled={activeRole === 'Patient'}
              className={`w-full px-4 py-2.5 rounded-full border font-mono text-xs transition-all focus:outline-hidden ${
                isTampered
                  ? 'bg-[#B85C4A]/10 border-[#B85C4A]/30 text-[#8B3424] font-bold shadow-xs'
                  : 'bg-white/80 border-[rgba(112,91,66,0.22)] text-[#30291F] focus:border-[#8C6642] focus:bg-white shadow-xs'
              }`}
            />
          </div>
        </div>

        {/* Live Integrity Verdict Banner */}
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-4 transition-all relative z-10 ${
            isTampered
              ? 'bg-[#B85C4A]/12 border-[#B85C4A]/30 text-[#8B3424] shadow-[0_4px_16px_rgba(184,92,74,0.12)]'
              : 'bg-[#47765B]/10 border-[#47765B]/25 text-[#2C523C] shadow-[0_4px_16px_rgba(71,118,91,0.08)]'
          }`}
        >
          <div className="flex items-center gap-3">
            {isTampered ? (
              <AlertTriangle className="w-5 h-5 text-[#B85C4A] shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-[#47765B] shrink-0" />
            )}
            <div>
              <div className="font-bold text-sm">
                {isTampered
                  ? 'CRITICAL INTEGRITY FAILURE: Database row has been tampered with!'
                  : 'Cryptographic Integrity Confirmed: Database record matches blockchain root'}
              </div>
              <div className="text-[11px] opacity-90 mt-0.5">
                {isTampered
                  ? 'The live computed SHA-256 digest deviates from the immutable Merkle root anchored on the consortium blockchain.'
                  : 'Byte-for-byte SHA-256 equality validated. The stored clinical prescription has not been modified.'}
              </div>
            </div>
          </div>
          <span
            className={`font-mono font-bold text-[11px] px-3 py-1 rounded-full border shrink-0 ${
              isTampered
                ? 'bg-[#B85C4A]/15 text-[#B85C4A] border-[#B85C4A]/30'
                : 'bg-[#47765B]/15 text-[#47765B] border-[#47765B]/30'
            }`}
          >
            {isTampered ? 'TAMPERED' : 'VERIFIED'}
          </span>
        </div>

        {/* Side-by-Side Cryptographic Hash Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs font-mono relative z-10">
          <div className="p-4 rounded-2xl bg-[#FFFCF7]/65 border border-white/80 space-y-1.5 shadow-2xs backdrop-blur-md">
            <div className="flex items-center justify-between text-[#82776A] text-[11px] font-sans font-medium">
              <span>Anchored Blockchain Hash (Block #{stats?.consortiumBlockHeight || 189422}):</span>
              <button
                onClick={() => handleCopyHash(storedHash)}
                className="text-[#8C6642] hover:text-[#72583F] flex items-center gap-1 cursor-pointer font-semibold"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-[#47765B]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="text-[#30291F] truncate font-semibold select-all font-mono text-[11px] bg-[#FAF5EE]/75 p-2.5 rounded-xl border border-[rgba(112,91,66,0.12)]">
              {storedHash || defaultHash}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FFFCF7]/65 border border-white/80 space-y-1.5 shadow-2xs backdrop-blur-md">
            <div className="text-[#82776A] text-[11px] font-sans font-medium">
              Live Computed SHA-256 Digest (Current Row):
            </div>
            <div
              className={`truncate font-bold select-all font-mono text-[11px] bg-[#FAF5EE]/75 p-2.5 rounded-xl border border-[rgba(112,91,66,0.12)] ${
                isTampered ? 'text-[#B85C4A]' : 'text-[#47765B]'
              }`}
            >
              {activeHash || defaultHash}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Split Workstation View: Patient Registry & Hardware Security */}
      {activeRole !== 'Patient' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left (7 Cols): Patient Database Table */}
          <div className="lg:col-span-7 bubbly-glass rounded-[28px] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#30291F] font-serif">
                  {activeRole === 'Doctor' ? 'My Assigned Inpatient Telemetry Feeds' : 'Inpatient Health Database'}
                </h3>
                <p className="text-xs text-[#82776A]">
                  {activeRole === 'Doctor'
                    ? 'ICU patients currently monitored under your clinical supervision'
                    : 'Live electronic patient records tracked by the gateway'}
                </p>
              </div>
              <button
                onClick={() => navigate('/patients')}
                className="text-xs text-[#8C6642] hover:text-[#72583F] font-semibold cursor-pointer flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[rgba(112,91,66,0.12)] text-[#82776A] text-[11px] uppercase tracking-wider font-semibold">
                    <th className="pb-3">ID</th>
                    <th className="pb-3">Patient Name</th>
                    <th className="pb-3">Ward</th>
                    <th className="pb-3">Clinical Condition</th>
                    <th className="pb-3">Trust Score</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(112,91,66,0.08)]">
                  {patients.slice(0, 5).map(pt => (
                    <tr key={pt.id} className="hover:bg-white/50 transition-colors">
                      <td className="py-3 font-mono font-bold text-[#8C6642]">{pt.id}</td>
                      <td className="py-3 text-[#30291F] font-medium">{pt.name}</td>
                      <td className="py-3 text-[#82776A]">{pt.ward}</td>
                      <td className="py-3 text-[#30291F] truncate max-w-44">{pt.condition}</td>
                      <td className="py-3 font-mono font-semibold text-[#306B49]">{pt.latestTrustScore}%</td>
                      <td className="py-3 text-right">
                        {activeRole === 'Doctor' ? (
                          <button
                            onClick={() => navigate('/monitoring')}
                            className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#FAF5EE] hover:bg-[#E8DACB] text-[#8C6642] border border-[#E8DACB] transition-all cursor-pointer"
                          >
                            ECG Stream
                          </button>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#EBF3ED] text-[#306B49] border border-[#C8E1D2]">
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
          <div className="lg:col-span-5 bubbly-glass rounded-[28px] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#30291F] font-serif">
                  {activeRole === 'Auditor' ? 'Hardware PUF Identity Ledger' : 'IoT Hardware Nodes (PUF)'}
                </h3>
                <p className="text-xs text-[#82776A]">Hardware challenge authentication status</p>
              </div>
              <button
                onClick={() => navigate('/sensors')}
                className="text-xs text-[#8C6642] hover:text-[#72583F] font-semibold cursor-pointer flex items-center gap-1"
              >
                <span>Manage</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {sensors.slice(0, 3).map(sensor => (
                <div key={sensor.id} className="p-3.5 rounded-2xl bg-[#FFFCF7]/65 border border-white/80 text-xs space-y-1.5 shadow-2xs backdrop-blur-md">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#30291F]">{sensor.id}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FAF5EE] text-[#8C6642] border border-[#E8DACB]">
                      {sensor.authStatus}
                    </span>
                  </div>
                  <div className="text-[#82776A] text-[11px] font-medium">{sensor.type}</div>
                  <div className="flex items-center justify-between pt-1 text-[11px] text-[#82776A] font-mono">
                    <span>Trust: {sensor.deviceTrust}/100</span>
                    <span className="truncate max-w-36 text-[10px] text-[#8C8275]">{sensor.hardwareFingerprint}</span>
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
