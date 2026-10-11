import React, { useState } from 'react';
import {
  Calculator,
  Cpu,
  Wifi,
  Heart,
  Clock,
  User,
  RotateCcw,
} from 'lucide-react';

export const TrustAnalysisPage: React.FC = () => {
  // 5 parameters for MDTS
  const [dt, setDt] = useState<number>(95); // Device Trust
  const [sq, setSq] = useState<number>(98); // Signal Quality
  const [av, setAv] = useState<number>(92); // Anomaly Value
  const [tc, setTc] = useState<number>(94); // Temporal Consistency
  const [ph, setPh] = useState<number>(96); // Patient History

  // Weights (sum = 1.0)
  const w_dt = 0.25;
  const w_sq = 0.20;
  const w_av = 0.25;
  const w_tc = 0.15;
  const w_ph = 0.15;

  // Calculate final score
  const finalMDTS = Math.round((dt * w_dt + sq * w_sq + av * w_av + tc * w_tc + ph * w_ph) * 10) / 10;

  // Decision logic
  let decision = 'Normal Data - Compress & Anchor to Blockchain';
  let decisionColor = 'bg-emerald-50 text-emerald-800 border-emerald-300';

  if (dt < 50) {
    decision = 'Unauthorized Sensor - Block Transmission';
    decisionColor = 'bg-rose-50 text-rose-800 border-rose-300';
  } else if (sq < 65) {
    decision = 'Poor Signal Quality - Request Reacquisition';
    decisionColor = 'bg-amber-50 text-amber-800 border-amber-300';
  } else if (av < 60) {
    decision = 'Abnormal Reading - Preserve Raw Data & Alert Doctor';
    decisionColor = 'bg-rose-50 text-rose-800 border-rose-300';
  }

  const handleReset = () => {
    setDt(95);
    setSq(98);
    setAv(92);
    setTc(94);
    setPh(96);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-600" />
          Medical Data Trust Score (MDTS) Formula & Calculator
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          The gateway evaluates every telemetry packet using this mathematical formula before storing or alerting.
        </p>

        {/* Formula Box */}
        <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200 font-mono text-xs text-blue-900">
          <strong>Formula:</strong> MDTS = (0.25 × DT) + (0.20 × SQ) + (0.25 × AV) + (0.15 × TC) + (0.15 × PH)
        </div>
      </div>

      {/* Main Calculator & Decision */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: 5 Parameter Sliders */}
        <div className="md:col-span-2 p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900">
              Interactive Trust Vector Parameters
            </h2>
            <button
              onClick={handleReset}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Values</span>
            </button>
          </div>

          {/* Slider 1: DT */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-600" /> 1. Device Trust (DT) • Weight 0.25
              </span>
              <span className="font-mono text-blue-600 font-bold">{dt} / 100</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={dt}
              onChange={e => setDt(parseInt(e.target.value, 10))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">Verifies hardware PUF challenge-response token.</p>
          </div>

          {/* Slider 2: SQ */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-blue-600" /> 2. Signal Quality (SQ) • Weight 0.20
              </span>
              <span className="font-mono text-blue-600 font-bold">{sq} / 100</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={sq}
              onChange={e => setSq(parseInt(e.target.value, 10))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">Electrode impedance and noise floor (&lt; 65% is rejected).</p>
          </div>

          {/* Slider 3: AV */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-blue-600" /> 3. Clinical Data Plausibility (AV) • Weight 0.25
              </span>
              <span className="font-mono text-blue-600 font-bold">{av} / 100</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={av}
              onChange={e => setAv(parseInt(e.target.value, 10))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">Evaluates whether medical readings conform to established baseline limits.</p>
          </div>

          {/* Slider 4: TC */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" /> 4. Temporal Consistency (TC) • Weight 0.15
              </span>
              <span className="font-mono text-blue-600 font-bold">{tc} / 100</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={tc}
              onChange={e => setTc(parseInt(e.target.value, 10))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">Detects impossible sudden spikes between consecutive seconds.</p>
          </div>

          {/* Slider 5: PH */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" /> 5. Patient-History Consistency (PH) • Weight 0.15
              </span>
              <span className="font-mono text-blue-600 font-bold">{ph} / 100</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={ph}
              onChange={e => setPh(parseInt(e.target.value, 10))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">Cross-correlation with patient medical history and admission diagnosis.</p>
          </div>
        </div>

        {/* Right: Calculated Result & Decision */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Calculated Score</h2>
            <p className="text-xs text-slate-500 mt-0.5">Real-time weighted score</p>

            <div className="mt-5 text-center p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-5xl font-extrabold font-mono text-blue-600">
                {finalMDTS}%
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Score out of 100
              </div>
            </div>
          </div>

          {/* Resulting Gateway Decision */}
          <div className="space-y-2">
            <span className="text-xs text-slate-600 block font-semibold">Gateway Decision:</span>
            <div className={`p-3.5 rounded-lg border text-xs font-bold leading-relaxed ${decisionColor}`}>
              {decision}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
