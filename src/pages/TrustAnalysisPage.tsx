import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Cpu,
  Wifi,
  Heart,
  Clock,
  User,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Lock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../services/dataService';
import { TrustRadarChart } from '../components/charts/TrustRadarChart';
import { TrustWeights } from '../types';
import { useGateway } from '../context/GatewayContext';

export const TrustAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeRole } = useGateway();

  // 5 parameters for MDTS
  const [dt, setDt] = useState<number>(95); // Device Trust
  const [sq, setSq] = useState<number>(98); // Signal Quality
  const [av, setAv] = useState<number>(92); // Anomaly Value
  const [tc, setTc] = useState<number>(94); // Temporal Consistency
  const [ph, setPh] = useState<number>(96); // Patient History

  const [weights, setWeights] = useState<TrustWeights>({
    dt: 0.25,
    sq: 0.20,
    av: 0.25,
    tc: 0.15,
    ph: 0.15,
  });

  const [mdts, setMdts] = useState<number>(95.0);
  const [decision, setDecision] = useState<string>('Normal Data - Compress & Anchor to Blockchain');
  const [alertLevel, setAlertLevel] = useState<string>('success');

  useEffect(() => {
    dataService.getTrustWeights().then(setWeights).catch(console.warn);
  }, []);

  useEffect(() => {
    dataService.calculateTrust({ dt, sq, av, tc, ph }).then(res => {
      setMdts(res.mdts);
      setDecision(res.decision);
      setAlertLevel(res.alertLevel);
    }).catch(() => {
      // Local fallback calculation
      const score = Math.round((dt * weights.dt + sq * weights.sq + av * weights.av + tc * weights.tc + ph * weights.ph) * 10) / 10;
      setMdts(score);
    });
  }, [dt, sq, av, tc, ph, weights]);

  const handleReset = () => {
    setDt(95);
    setSq(98);
    setAv(92);
    setTc(94);
    setPh(96);
  };

  // RBAC Access Guard: Patient cannot access telemetry scoring calculation engine
  if (activeRole === 'Patient') {
    return (
      <div className="p-8 sm:p-12 bubbly-glass text-center max-w-lg mx-auto my-12 space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#FDF0EE] text-[#BF4E3B] border border-[#F5CAC3] flex items-center justify-center mx-auto shadow-xs">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#2A241E] font-serif">Access Restricted • MDTS Calculation Engine</h2>
          <p className="text-xs text-[#756A5C] mt-2 leading-relaxed">
            The Medical Data Trust Score (MDTS) mathematical calculation simulator is reserved for clinical engineers, consortium auditors, and IT administrators.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="pill-btn-primary"
          >
            Return to My Health Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bubbly-glass p-6 md:p-7 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#9C7854] to-[#85613D] text-white flex items-center justify-center shadow-xs">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#2A241E] font-serif">
              Medical Data Trust Score (MDTS) Mathematical Engine & Calculator
            </h1>
            <p className="text-xs text-[#756A5C] mt-1">
              The gateway evaluates every telemetry packet using this mathematical formula before storing, routing, or triggering consortium anchors.
            </p>
          </div>
        </div>

        {/* Formula Box */}
        <div className="mt-2 p-4 rounded-2xl bg-white/70 border border-white/80 font-mono text-xs text-[#2A241E] shadow-2xs backdrop-blur-md">
          <strong className="text-[#9C7854] font-sans">MDTS Formula:</strong> MDTS = ({weights.dt} × DT) + ({weights.sq} × SQ) + ({weights.av} × AV) + ({weights.tc} × TC) + ({weights.ph} × PH)
        </div>
      </div>

      {/* Main Calculator & Radar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 Cols): 5 Parameter Sliders */}
        <div className="lg:col-span-7 bubbly-glass p-6 md:p-7 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[rgba(160,140,115,0.12)]">
            <h2 className="text-base font-bold text-[#2A241E] font-serif">
              Interactive Trust Vector Parameters
            </h2>
            <button
              onClick={handleReset}
              className="pill-btn-secondary text-xs py-1.5 px-3"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Values</span>
            </button>
          </div>

          {/* Slider 1: DT */}
          <div className="p-3.5 rounded-2xl bg-white/60 border border-white/80 space-y-1.5 text-xs shadow-2xs">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-[#2A241E] flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#9C7854]" /> 1. Device Trust (DT) • Weight {weights.dt}
              </span>
              <span className="font-mono text-[#9C7854] font-bold px-2.5 py-0.5 rounded-full bg-[#F8F2EA] border border-[#EADAC7]">{dt} / 100</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={dt}
              onChange={e => setDt(parseInt(e.target.value, 10))}
              className="w-full accent-[#9C7854] cursor-pointer"
            />
            <p className="text-[11px] text-[#756A5C]">Verifies hardware PUF challenge-response token authentication.</p>
          </div>

          {/* Slider 2: SQ */}
          <div className="p-3.5 rounded-2xl bg-white/60 border border-white/80 space-y-1.5 text-xs shadow-2xs">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-[#2A241E] flex items-center gap-2">
                <Wifi className="w-4 h-4 text-[#9C7854]" /> 2. Signal Quality (SQ) • Weight {weights.sq}
              </span>
              <span className="font-mono text-[#9C7854] font-bold px-2.5 py-0.5 rounded-full bg-[#F8F2EA] border border-[#EADAC7]">{sq} / 100</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={sq}
              onChange={e => setSq(parseInt(e.target.value, 10))}
              className="w-full accent-[#9C7854] cursor-pointer"
            />
            <p className="text-[11px] text-[#756A5C]">Electrode impedance and noise floor (&lt; 65% triggers reacquisition).</p>
          </div>

          {/* Slider 3: AV */}
          <div className="p-3.5 rounded-2xl bg-white/60 border border-white/80 space-y-1.5 text-xs shadow-2xs">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-[#2A241E] flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#9C7854]" /> 3. Clinical Data Plausibility (AV) • Weight {weights.av}
              </span>
              <span className="font-mono text-[#9C7854] font-bold px-2.5 py-0.5 rounded-full bg-[#F8F2EA] border border-[#EADAC7]">{av} / 100</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={av}
              onChange={e => setAv(parseInt(e.target.value, 10))}
              className="w-full accent-[#9C7854] cursor-pointer"
            />
            <p className="text-[11px] text-[#756A5C]">Deviation from human physiological limits (&lt; 60% flags anomaly).</p>
          </div>

          {/* Slider 4: TC */}
          <div className="p-3.5 rounded-2xl bg-white/60 border border-white/80 space-y-1.5 text-xs shadow-2xs">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-[#2A241E] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#9C7854]" /> 4. Temporal Consistency (TC) • Weight {weights.tc}
              </span>
              <span className="font-mono text-[#9C7854] font-bold px-2.5 py-0.5 rounded-full bg-[#F8F2EA] border border-[#EADAC7]">{tc} / 100</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={tc}
              onChange={e => setTc(parseInt(e.target.value, 10))}
              className="w-full accent-[#9C7854] cursor-pointer"
            />
            <p className="text-[11px] text-[#756A5C]">Rate-of-change velocity check across consecutive telemetry packets.</p>
          </div>

          {/* Slider 5: PH */}
          <div className="p-3.5 rounded-2xl bg-white/60 border border-white/80 space-y-1.5 text-xs shadow-2xs">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-[#2A241E] flex items-center gap-2">
                <User className="w-4 h-4 text-[#9C7854]" /> 5. Patient-History Consistency (PH) • Weight {weights.ph}
              </span>
              <span className="font-mono text-[#9C7854] font-bold px-2.5 py-0.5 rounded-full bg-[#F8F2EA] border border-[#EADAC7]">{ph} / 100</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={ph}
              onChange={e => setPh(parseInt(e.target.value, 10))}
              className="w-full accent-[#9C7854] cursor-pointer"
            />
            <p className="text-[11px] text-[#756A5C]">Correlation with patient's chronic conditions in hospital EHR.</p>
          </div>
        </div>

        {/* Right (5 Cols): Real-time Verdict & Radar Visualization */}
        <div className="lg:col-span-5 space-y-4">
          {/* Trust Verdict Card */}
          <div className="bubbly-card p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#9E9486] font-mono">
              Real-Time Trust Verdict
            </h3>

            <div className="flex items-baseline justify-between">
              <span className="text-4xl font-bold font-serif text-[#2A241E]">
                {mdts} <span className="text-sm font-normal text-[#756A5C] font-sans">/ 100</span>
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${
                  alertLevel === 'success'
                    ? 'bg-[#EBF3ED] text-[#2D6643] border-[#C8E1D2]'
                    : alertLevel === 'warning'
                    ? 'bg-[#FCF4E9] text-[#9A6424] border-[#F2DAC0]'
                    : 'bg-[#FDF0EE] text-[#BF4E3B] border-[#F5CAC3]'
                }`}
              >
                {alertLevel === 'success' ? 'HIGH TRUST' : alertLevel === 'warning' ? 'DEGRADED' : 'UNTRUSTED'}
              </span>
            </div>

            <div
              className={`p-4 rounded-2xl border text-xs flex items-center gap-3 transition-all ${
                alertLevel === 'success'
                  ? 'bg-[#EBF3ED]/90 border-[#C8E1D2] text-[#2D6643]'
                  : alertLevel === 'warning'
                  ? 'bg-[#FCF4E9]/90 border-[#F2DAC0] text-[#9A6424]'
                  : 'bg-[#FDF0EE]/90 border-[#F5CAC3] text-[#BF4E3B]'
              }`}
            >
              {alertLevel === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : alertLevel === 'warning' ? (
                <AlertTriangle className="w-5 h-5 shrink-0" />
              ) : (
                <ShieldAlert className="w-5 h-5 shrink-0" />
              )}
              <span className="font-semibold leading-relaxed">{decision}</span>
            </div>
          </div>

          {/* 5-Vector Radar Chart Container */}
          <div className="bubbly-card p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#756A5C] mb-2 text-center font-serif">
              5-Dimensional Trust Vector Profile
            </h3>
            <TrustRadarChart dt={dt} sq={sq} av={av} tc={tc} ph={ph} height={230} />
          </div>
        </div>
      </div>
    </div>
  );
};
