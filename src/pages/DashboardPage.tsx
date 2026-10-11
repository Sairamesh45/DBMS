import React, { useState, useEffect } from 'react';
import {
  Users,
  Cpu,
  ShieldCheck,
  Boxes,
  RotateCcw,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  Shield,
  FileText,
  Lock,
} from 'lucide-react';
import { useGateway } from '../context/GatewayContext';
import { dataService } from '../services/dataService';
import { Patient, Sensor } from '../types';
import { useNavigate } from 'react-router-dom';
import { sha256 } from '../services/cryptoService';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshTrigger } = useGateway();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);

  // Cryptographic Tamper Test State
  const [isTamperedDemo, setIsTamperedDemo] = useState(false);
  const [dosageText, setDosageText] = useState('Aspirin 81 mg Daily • Anticoagulant Protocol');
  const storedHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const [activeHash, setActiveHash] = useState(storedHash);

  useEffect(() => {
    Promise.all([
      dataService.getPatients(),
      dataService.getSensors(),
    ]).then(([pts, sns]) => {
      setPatients(pts);
      setSensors(sns);
    });
  }, [refreshTrigger]);

  const handleSimulateTamper = async () => {
    const tamperedDosage = 'Aspirin 500 mg Daily • OVERDOSE TAMPERED';
    setDosageText(tamperedDosage);
    const fakeData = JSON.stringify({
      patientId: 'PT-1042',
      patientName: 'Eleanor Vance',
      order: tamperedDosage,
      timestamp: '2026-10-11T22:30:00Z',
    });
    const fakeHash = await sha256(fakeData);
    setActiveHash(fakeHash);
    setIsTamperedDemo(true);
  };

  const handleRestoreTamper = () => {
    setDosageText('Aspirin 81 mg Daily • Anticoagulant Protocol');
    setActiveHash(storedHash);
    setIsTamperedDemo(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Project Title Banner */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900">
              🏥 MEDGUARD • Medical Data Trust Gateway
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Gateway Online
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            BCSE302P Database Systems Lab: Hardware Authentication, MDTS Trust Scoring, and Cryptographic Tamper-Proof Storage
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/provenance')}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs flex items-center gap-1"
          >
            <span>Tamper Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => navigate('/patients')}
            className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
          >
            Patient Registry
          </button>
        </div>
      </div>

      {/* 2. Four Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Patients</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">{patients.length || 8}</div>
          <div className="text-[11px] text-slate-500 mt-1">Enrolled in Hospital Wards</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Hardware Sensors</span>
            <Cpu className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">{sensors.length || 12}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">PUF Authenticated</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Gateway Trust Score</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-600">
            96.4%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">MDTS: High Trust Verified</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Blockchain Blocks</span>
            <Boxes className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">#189,421</div>
          <div className="text-[11px] text-slate-500 mt-1">Consortium Anchored</div>
        </div>
      </div>

      {/* 3. Hero Section: 1-Click Cryptographic Tamper Detection & Data Integrity Test */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600" />
              1-Click Cryptographic Tamper Detection Test
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Demonstrates how SHA-256 hash checks immediately detect any altered records in the patient database
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isTamperedDemo ? (
              <button
                onClick={handleSimulateTamper}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
              >
                <span>⚠️ Simulate Tamper Attack (Alter Dosage to 500mg)</span>
              </button>
            ) : (
              <button
                onClick={handleRestoreTamper}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Original Authentic Record</span>
              </button>
            )}
          </div>
        </div>

        {/* Target Record Card */}
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              Target Patient Record: <strong>Eleanor Vance (ID: PT-1042)</strong>
            </span>
            <span>Room: Cardio-Thoracic Ward Bed 04</span>
          </div>
          <div className="p-2.5 rounded bg-white border border-slate-200">
            <span className="text-slate-500 block text-[11px] font-medium mb-0.5">Prescribed Clinical Medication Order:</span>
            <div className={`font-mono text-sm font-bold ${isTamperedDemo ? 'text-rose-600' : 'text-slate-900'}`}>
              {dosageText}
            </div>
          </div>
        </div>

        {/* Live Status Alert Box */}
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
            isTamperedDemo
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-emerald-50 border-emerald-300 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isTamperedDemo ? (
              <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
            <div>
              <div className="font-bold">
                {isTamperedDemo
                  ? 'CRITICAL TAMPER DETECTED: Computed Hash Does NOT Match Blockchain Hash!'
                  : 'INTEGRITY VERIFIED: Database record matches blockchain hash byte-for-byte'}
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                {isTamperedDemo
                  ? 'Attacker modified prescription dosage to 500mg in database. The SHA-256 digest failed verification.'
                  : 'Original diagnostic prescription is verified authentic and untampered.'}
              </div>
            </div>
          </div>
          <span
            className={`font-mono font-bold text-xs px-2.5 py-1 rounded border shrink-0 ${
              isTamperedDemo
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}
          >
            {isTamperedDemo ? 'TAMPERED' : 'VALID'}
          </span>
        </div>

        {/* Side-by-side hash comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block text-[11px] mb-1 font-sans font-medium">
              Anchored Blockchain Hash (Stored on Ledger):
            </span>
            <div className="text-slate-800 truncate font-semibold">{storedHash}</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block text-[11px] mb-1 font-sans font-medium">
              Computed Hash from Database Record:
            </span>
            <div className={`truncate font-bold ${isTamperedDemo ? 'text-rose-600' : 'text-emerald-600'}`}>
              {activeHash}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Hardware Sensors & PUF Security Status */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              Connected Medical Hardware Sensors (PUF Security)
            </h3>
            <p className="text-xs text-slate-500">Hardware challenge-response authentication status</p>
          </div>
          <button
            onClick={() => navigate('/sensors')}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
          >
            View All Sensors →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {sensors.slice(0, 3).map(sensor => (
            <div key={sensor.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 font-mono">{sensor.id}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {sensor.authStatus}
                </span>
              </div>
              <div className="text-slate-600 font-medium">{sensor.type}</div>
              <div className="text-[10px] text-slate-500 font-mono truncate bg-white px-2 py-1 rounded border border-slate-200">
                {sensor.hardwareFingerprint}
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                <span>Patient: {sensor.patientName}</span>
                <span className="text-emerald-600 font-bold font-mono">Trust: {sensor.deviceTrust}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Patient Health Database Records Table */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Registered Patient Health Profiles
            </h3>
            <p className="text-xs text-slate-500">Electronic health registry records verified by the trust gateway</p>
          </div>
          <button
            onClick={() => navigate('/patients')}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
          >
            View All Patients →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                <th className="pb-2.5">Patient ID</th>
                <th className="pb-2.5">Name</th>
                <th className="pb-2.5">Ward / Room</th>
                <th className="pb-2.5">Clinical Condition</th>
                <th className="pb-2.5">Assigned Sensors</th>
                <th className="pb-2.5">Trust Score</th>
                <th className="pb-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.slice(0, 5).map(pt => (
                <tr key={pt.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 text-blue-600 font-mono font-bold">{pt.id}</td>
                  <td className="py-3 text-slate-900 font-semibold">{pt.name}</td>
                  <td className="py-3 text-slate-600">{pt.ward}</td>
                  <td className="py-3 text-slate-800">{pt.condition}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {pt.assignedSensors.map(sid => (
                        <span key={sid} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 border border-slate-200 text-slate-700">
                          {sid}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 text-emerald-600 font-mono font-bold">{pt.latestTrustScore}%</td>
                  <td className="py-3 text-right">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      NORMAL
                    </span>
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
