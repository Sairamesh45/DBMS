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
      <div className="p-8 sm:p-12 rounded-2xl bg-white border border-[#e6dfd5] text-center max-w-lg mx-auto my-12 space-y-4 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-[#fdf3f3] text-[#9e2a2b] border border-[#f5cacc] flex items-center justify-center mx-auto shadow-2xs">
          <Lock className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#2c2623]">Access Restricted • MDTS Calculation Engine</h2>
          <p className="text-xs text-[#78716c] mt-2 leading-relaxed">
            The Medical Data Trust Score (MDTS) mathematical calculation simulator is reserved for clinical engineers, consortium auditors, and IT administrators.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-xl bg-[#8c6d46] hover:bg-[#745733] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
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
      <div className="p-5 rounded-2xl bg-white border border-[#e6dfd5] shadow-xs">
        <h1 className="text-lg font-bold text-[#2c2623] flex items-center gap-2">
          <Calculator className="w-5 h-5 text-[#8c6d46]" />
          Medical Data Trust Score (MDTS) Mathematical Engine & Calculator
        </h1>
        <p className="text-xs text-[#78716c] mt-1">
          The gateway evaluates every telemetry packet using this mathematical formula before storing, routing, or triggering consortium anchors.
        </p>

        {/* Formula Box */}
        <div className="mt-3 p-3.5 rounded-xl bg-[#faf7f2] border border-[#e6dfd5] font-mono text-xs text-[#2c2623]">
          <strong>MDTS Formula:</strong> MDTS = ({weights.dt} × DT) + ({weights.sq} × SQ) + ({weights.av} × AV) + ({weights.tc} × TC) + ({weights.ph} × PH)
        </div>
      </div>

      {/* Main Calculator & Radar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 Cols): 5 Parameter Sliders */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-white border border-[#e6dfd5] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#e6dfd5]">
            <h2 className="text-sm font-bold text-[#2c2623]">
              Interactive Trust Vector Parameters
            </h2>
            <button
              onClick={handleReset}
              className="text-xs text-[#8c6d46] hover:text-[#745733] flex items-center gap-1 cursor-pointer font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Values</span>
            </button>
          </div>

          {/* Slider 1: DT */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="font-semibold text-[#2c2623] flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#8c6d46]" /> 1. Device Trust (DT) • Weight {weights.dt}
              </span>
              <span className="font-mono text-[#8c6d46] font-bold">{dt} / 100</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={dt}
              onChange={e => setDt(parseInt(e.target.value, 10))}
              className="w-full accent-[#8c6d46] cursor-pointer"
            />
            <p className="text-[11px] text-[#78716c]">Verifies hardware PUF challenge-response token authentication.</p>
          </div>

          {/* Slider 2: SQ */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="font-semibold text-[#2c2623] flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-[#8c6d46]" /> 2. Signal Quality (SQ) • Weight {weights.sq}
              </span>
              <span className="font-mono text-[#8c6d46] font-bold">{sq} / 100</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={sq}
              onChange={e => setSq(parseInt(e.target.value, 10))}
              className="w-full accent-[#8c6d46] cursor-pointer"
            />
            <p className="text-[11px] text-[#78716c]">Electrode impedance and noise floor (&lt; 65% triggers reacquisition).</p>
          </div>

          {/* Slider 3: AV */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="font-semibold text-[#2c2623] flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-[#8c6d46]" /> 3. Clinical Data Plausibility (AV) • Weight {weights.av}
              </span>
              <span className="font-mono text-[#8c6d46] font-bold">{av} / 100</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={av}
              onChange={e => setAv(parseInt(e.target.value, 10))}
              className="w-full accent-[#8c6d46] cursor-pointer"
            />
            <p className="text-[11px] text-[#78716c]">Deviation from human physiological limits (&lt; 60% flags anomaly).</p>
          </div>

          {/* Slider 4: TC */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="font-semibold text-[#2c2623] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#8c6d46]" /> 4. Temporal Consistency (TC) • Weight {weights.tc}
              </span>
              <span className="font-mono text-[#8c6d46] font-bold">{tc} / 100</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={tc}
              onChange={e => setTc(parseInt(e.target.value, 10))}
              className="w-full accent-[#8c6d46] cursor-pointer"
            />
            <p className="text-[11px] text-[#78716c]">Rate-of-change velocity check across consecutive telemetry packets.</p>
          </div>

          {/* Slider 5: PH */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="font-semibold text-[#2c2623] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#8c6d46]" /> 5. Patient-History Consistency (PH) • Weight {weights.ph}
              </span>
              <span className="font-mono text-[#8c6d46] font-bold">{ph} / 100</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={ph}
              onChange={e => setPh(parseInt(e.target.value, 10))}
              className="w-full accent-[#8c6d46] cursor-pointer"
            />
            <p className="text-[11px] text-[#78716c]">Correlation with patient's chronic conditions in hospital EHR.</p>
          </div>
        </div>

        {/* Right (5 Cols): Real-time Verdict & Radar Visualization */}
        <div className="lg:col-span-5 space-y-4">
          {/* Trust Verdict Card */}
          <div className="p-5 rounded-2xl bg-white border border-[#e6dfd5] shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#78716c]">
              Real-Time Trust Verdict
            </h3>

            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold font-mono text-[#2c2623]">
                {mdts} <span className="text-sm font-normal text-[#78716c]">/ 100</span>
              </span>
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  alertLevel === 'success'
                    ? 'bg-[#f2f7f3] text-[#2d6e42] border border-[#c6dcce]'
                    : alertLevel === 'warning'
                    ? 'bg-[#fdf8f0] text-[#b58550] border border-[#f2dfbe]'
                    : 'bg-[#fdf3f3] text-[#9e2a2b] border border-[#f5cacc]'
                }`}
              >
                {alertLevel === 'success' ? 'HIGH TRUST' : alertLevel === 'warning' ? 'DEGRADED' : 'UNTRUSTED'}
              </span>
            </div>

            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                alertLevel === 'success'
                  ? 'bg-[#f2f7f3] border-[#c6dcce] text-[#2d6e42]'
                  : alertLevel === 'warning'
                  ? 'bg-[#fdf8f0] border-[#f2dfbe] text-[#b58550]'
                  : 'bg-[#fdf3f3] border-[#f5cacc] text-[#9e2a2b]'
              }`}
            >
              {alertLevel === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : alertLevel === 'warning' ? (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              ) : (
                <ShieldAlert className="w-4 h-4 shrink-0" />
              )}
              <span className="font-semibold">{decision}</span>
            </div>
          </div>

          {/* 5-Vector Radar Chart Container */}
          <div className="p-4 rounded-2xl bg-white border border-[#e6dfd5] shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#78716c] mb-2 text-center">
              5-Dimensional Trust Vector Profile
            </h3>
            <TrustRadarChart dt={dt} sq={sq} av={av} tc={tc} ph={ph} height={230} />
          </div>
        </div>
      </div>
    </div>
  );
};
