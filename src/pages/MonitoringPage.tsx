import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Heart,
  Wind,
  Thermometer,
  Wifi,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  Radio,
  ShieldCheck,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { useGateway } from '../context/GatewayContext';
import { dataService } from '../services/dataService';
import { Patient, Sensor } from '../types';
import { useToast } from '../context/ToastContext';

export const MonitoringPage: React.FC = () => {
  const { showToast } = useToast();
  const { selectedPatientId, setSelectedPatientId, refreshTrigger, triggerRefresh } = useGateway();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [isStreaming, setIsStreaming] = useState(true);

  // Vitals State
  const [heartRate, setHeartRate] = useState(74);
  const [spo2, setSpo2] = useState(98);
  const [systolicBP, setSystolicBP] = useState(122);
  const [diastolicBP, setDiastolicBP] = useState(78);
  const [temperature, setTemperature] = useState(36.8);
  const [signalQuality, setSignalQuality] = useState(98);
  const [isAbnormal, setIsAbnormal] = useState(false);
  const [isNoisy, setIsNoisy] = useState(false);
  const [recentPacketHash, setRecentPacketHash] = useState<string>('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  const [latestMDTS, setLatestMDTS] = useState<number>(96.4);
  const [latestDecision, setLatestDecision] = useState<string>('Normal - Compress & Batch');

  // Canvas Ref for ECG Oscilloscope
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const sweepX = useRef<number>(0);
  const phase = useRef<number>(0);

  useEffect(() => {
    Promise.all([dataService.getPatients(), dataService.getSensors()]).then(([pts, sns]) => {
      setPatients(pts);
      setSensors(sns);
    });
  }, [refreshTrigger]);

  const activePatient = patients.find(p => p.id === selectedPatientId) || patients[0];
  const activeSensor = sensors.find(s => s.patientId === activePatient?.id) || sensors[0];

  // Canvas ECG Oscilloscope rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const midY = height / 2;

    // Draw background grid once
    const drawGrid = () => {
      ctx.fillStyle = '#FAF7F2';
      ctx.fillRect(0, 0, width, height);

      // Fine millimeter grid
      ctx.strokeStyle = '#F0E7D9';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < width; x += 10) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 10) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Major grid
      ctx.strokeStyle = '#E2D4BE';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    };

    drawGrid();

    // Synthesis of ECG wave (P - Q - R - S - T)
    const getECGValue = (t: number, abnormal: boolean, noise: boolean) => {
      const beatFreq = abnormal ? (150 / 60) : (74 / 60);
      const cycle = (t * beatFreq) % 1;

      let val = 0;
      if (abnormal) {
        // Ventricular Tachycardia: wide sinusoidal QRS complexes
        val = Math.sin(cycle * Math.PI * 2) * 55 + Math.sin(cycle * Math.PI * 6) * 20;
      } else {
        // Normal Sinus Rhythm P-Q-R-S-T
        if (cycle > 0.1 && cycle < 0.2) {
          // P Wave
          val = Math.sin((cycle - 0.1) * 10 * Math.PI) * 12;
        } else if (cycle > 0.32 && cycle < 0.35) {
          // Q Dip
          val = -10;
        } else if (cycle >= 0.35 && cycle < 0.42) {
          // R Spike
          const rel = (cycle - 0.35) / 0.07;
          val = rel < 0.5 ? rel * 2 * 90 : (1 - rel) * 2 * 90;
        } else if (cycle >= 0.42 && cycle < 0.46) {
          // S Dip
          val = -22;
        } else if (cycle > 0.55 && cycle < 0.72) {
          // T Wave
          val = Math.sin((cycle - 0.55) / 0.17 * Math.PI) * 24;
        }
      }

      if (noise) {
        val += (Math.random() - 0.5) * 35 + Math.sin(t * 1.5) * 15;
      }

      return val;
    };

    let prevY = midY;

    const render = () => {
      if (!isStreaming) {
        animFrameId.current = requestAnimationFrame(render);
        return;
      }

      const step = 2.5;
      const x = sweepX.current;
      const nextX = (x + step) % width;

      // Erase trailing vertical scan line
      ctx.fillStyle = '#FAF7F2';
      ctx.fillRect(nextX, 0, 20, height);

      // Re-draw grid under the clearing beam
      ctx.strokeStyle = '#F0E7D9';
      ctx.lineWidth = 0.5;
      for (let gx = Math.floor(nextX / 10) * 10; gx <= nextX + 20; gx += 10) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
        ctx.stroke();
      }

      phase.current += 0.016;
      const ecgVal = getECGValue(phase.current, isAbnormal, isNoisy);
      const currY = midY - ecgVal;

      // Draw ECG stroke with warm charcoal / dark brown trace
      ctx.strokeStyle = isAbnormal ? '#BF4E3B' : isNoisy ? '#B87B32' : '#2A241E';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      if (x < nextX) {
        ctx.moveTo(x, prevY);
        ctx.lineTo(nextX, currY);
      } else {
        ctx.moveTo(0, currY);
      }
      ctx.stroke();

      sweepX.current = nextX;
      prevY = currY;

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [isStreaming, isAbnormal, isNoisy]);

  // Periodic real-time backend measurement ingestion
  useEffect(() => {
    if (!activePatient || !activeSensor) return;

    const interval = setInterval(async () => {
      if (!isStreaming) return;

      try {
        const res = await dataService.recordMeasurement({
          patientId: activePatient.id,
          sensorId: activeSensor.id,
          heartRate,
          spo2,
          systolicBP,
          diastolicBP,
          respirationRate: 16,
          temperature,
          signalQuality,
          isAbnormal,
          anomalyNotes: isAbnormal ? 'Acute ventricular tachycardia and hypoxia' : undefined,
          rawDataSummary: `Live 500Hz telemetry ingestion verified via PUF ${activeSensor.hardwareFingerprint}`,
        });

        setRecentPacketHash(res.provenance.dataHash);
        setLatestMDTS(res.evaluation.mdts);
        setLatestDecision(res.evaluation.decision);
      } catch (e) {
        console.warn('Real-time ingestion sync', e);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [activePatient, activeSensor, isStreaming, heartRate, spo2, systolicBP, diastolicBP, temperature, signalQuality, isAbnormal]);

  // Demonstration Simulation Handlers
  const handleSimulateAbnormal = () => {
    setIsAbnormal(true);
    setIsNoisy(false);
    setHeartRate(154);
    setSpo2(85);
    setSystolicBP(168);
    setDiastolicBP(106);
    setSignalQuality(96);
    showToast({
      type: 'error',
      title: 'ACUTE ANOMALY SIMULATED',
      message: 'Ventricular tachycardia (154 bpm) & desaturation (85%). Anomaly Value dropped. Gateway triggered Emergency Priority Rollup!',
      duration: 6000,
    });
  };

  const handleSimulateNoise = () => {
    setIsNoisy(true);
    setIsAbnormal(false);
    setHeartRate(78);
    setSpo2(97);
    setSignalQuality(52);
    showToast({
      type: 'warning',
      title: 'SIGNAL NOISE & IMPEDANCE DROP',
      message: 'Signal Quality dropped to 52% (< 65% threshold). Gateway triggered reacquisition challenge.',
      duration: 5000,
    });
  };

  const handleResetBaseline = () => {
    setIsAbnormal(false);
    setIsNoisy(false);
    setHeartRate(74);
    setSpo2(98);
    setSystolicBP(122);
    setDiastolicBP(78);
    setTemperature(36.8);
    setSignalQuality(98);
    showToast({
      type: 'success',
      title: 'Normal Sinus Rhythm Restored',
      message: 'Baseline physiological telemetry restored. MDTS evaluated at >95%.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Workstation Header & Patient Selector */}
      <div className="bubbly-glass p-6 md:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#9C7854] to-[#85613D] text-white flex items-center justify-center shadow-xs">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-[#2A241E] tracking-tight font-serif">
              Live Clinical Telemetry & Hardware Trust Workstation
            </h1>
          </div>
          <p className="text-xs text-[#756A5C] mt-1.5 max-w-2xl leading-relaxed">
            Real-time continuous 12-lead ECG sweep, hardware PUF stream authentication, and dynamic MDTS scoring.
          </p>
        </div>

        {/* Patient Selection Dropdown */}
        <div className="flex items-center gap-3 bg-white/70 border border-white/80 px-4 py-2 rounded-full shadow-2xs backdrop-blur-md">
          <label className="text-xs font-semibold text-[#756A5C]">Monitored Inpatient:</label>
          <select
            value={selectedPatientId}
            onChange={e => setSelectedPatientId(e.target.value)}
            className="bg-transparent text-xs font-bold text-[#2A241E] focus:outline-hidden cursor-pointer py-0.5"
          >
            {patients.map(p => (
              <option key={p.id} value={p.id} className="bg-[#FAF7F2] text-[#2A241E]">
                {p.name} ({p.id}) • {p.ward}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Patient Status Strip */}
      {activePatient && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 p-4 rounded-2xl bg-white/70 border border-white/80 shadow-2xs text-xs text-[#2A241E] backdrop-blur-md">
          <div>
            <span className="text-[#756A5C] text-[11px] block font-medium">Condition:</span>
            <span className="font-semibold truncate block mt-0.5">{activePatient.condition}</span>
          </div>
          <div>
            <span className="text-[#756A5C] text-[11px] block font-medium">Active Hardware Node:</span>
            <span className="font-mono font-bold text-[#9C7854] truncate block mt-0.5">{activeSensor?.id || 'SNR-ECG-01'}</span>
          </div>
          <div>
            <span className="text-[#756A5C] text-[11px] block font-medium">PUF Token Identity:</span>
            <span className="font-mono text-[11px] text-[#756A5C] truncate block mt-0.5">{activeSensor?.hardwareFingerprint || 'PUF-VALID-0x89A'}</span>
          </div>
          <div>
            <span className="text-[#756A5C] text-[11px] block font-medium">Calculated MDTS:</span>
            <span className="font-serif font-bold text-[#2D6643] text-base mt-0.5 block">{latestMDTS} / 100</span>
          </div>
          <div>
            <span className="text-[#756A5C] text-[11px] block font-medium">Gateway Action:</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block mt-0.5 ${
              isAbnormal ? 'bg-[#FDF0EE] text-[#BF4E3B] border border-[#F5CAC3]' : 'bg-[#EBF3ED] text-[#2D6643] border border-[#C8E1D2]'
            }`}>
              {latestDecision}
            </span>
          </div>
        </div>
      )}

      {/* Main Interactive Oscilloscope Canvas Container */}
      <div className="bubbly-glass p-6 md:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[rgba(160,140,115,0.12)]">
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-[#9C7854]" />
            <h2 className="text-base font-bold text-[#2A241E] font-serif">
              Continuous Lead II Electrocardiogram (500Hz Medical Oscilloscope)
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-[#F8F2EA] text-[#8C6642] border border-[#EADAC7]">
              25 mm/s • 10 mm/mV
            </span>
          </div>

          {/* Interactive Simulation Action Buttons for Teacher Demo */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsStreaming(!isStreaming)}
              className="pill-btn-secondary"
            >
              {isStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isStreaming ? 'Pause Sweep' : 'Resume'}</span>
            </button>

            <button
              onClick={handleSimulateAbnormal}
              className="pill-btn-danger"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Simulate Ventricular Tachycardia</span>
            </button>

            <button
              onClick={handleSimulateNoise}
              className="pill-btn-secondary"
            >
              <Zap className="w-3.5 h-3.5 text-[#B87B32]" />
              <span>Simulate Lead Noise</span>
            </button>

            <button
              onClick={handleResetBaseline}
              className="pill-btn-primary"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Baseline</span>
            </button>
          </div>
        </div>

        {/* HTML5 Canvas in Bubbly Rounded Frame */}
        <div className="relative rounded-[22px] border border-[rgba(160,140,115,0.2)] overflow-hidden bg-[#FAF7F2] shadow-inner">
          <canvas
            ref={canvasRef}
            width={960}
            height={260}
            className="w-full h-56 sm:h-64 block"
          />

          {/* Real-time Overlay HUD */}
          <div className="absolute top-3.5 left-3.5 bg-white/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/90 text-[11px] font-mono text-[#2A241E] flex items-center gap-2 shadow-xs">
            <span className={`w-2 h-2 rounded-full ${isAbnormal ? 'bg-[#BF4E3B] animate-ping' : 'bg-[#2D6643]'}`} />
            <span>Telemetry: {isAbnormal ? 'ACUTE ANOMALY DETECTED' : isNoisy ? 'SIGNAL IMPEDANCE HIGH' : 'SINUS RHYTHM'}</span>
          </div>

          <div className="absolute bottom-3.5 right-3.5 bg-white/85 backdrop-blur-md px-3 py-1 rounded-full border border-white/90 text-[10px] font-mono text-[#756A5C] shadow-xs">
            Calibrated Hardware Rate: 500 S/s
          </div>
        </div>

        {/* Live Vitals Gauge Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 pt-2">
          {/* Heart Rate */}
          <div className="bubbly-card p-4 space-y-1">
            <div className="flex items-center justify-between text-[#756A5C] text-xs font-medium">
              <span>Heart Rate</span>
              <Heart className={`w-4 h-4 ${isAbnormal ? 'text-[#BF4E3B] animate-bounce' : 'text-[#9C7854]'}`} />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-2xl md:text-3xl font-bold font-serif ${isAbnormal ? 'text-[#BF4E3B]' : 'text-[#2A241E]'}`}>
                {heartRate}
              </span>
              <span className="text-xs text-[#756A5C]">BPM</span>
            </div>
          </div>

          {/* SpO2 */}
          <div className="bubbly-card p-4 space-y-1">
            <div className="flex items-center justify-between text-[#756A5C] text-xs font-medium">
              <span>Oxygen (SpO2)</span>
              <Wind className="w-4 h-4 text-[#9C7854]" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-2xl md:text-3xl font-bold font-serif ${spo2 < 90 ? 'text-[#BF4E3B]' : 'text-[#2D6643]'}`}>
                {spo2}%
              </span>
            </div>
          </div>

          {/* Blood Pressure */}
          <div className="bubbly-card p-4 space-y-1">
            <div className="flex items-center justify-between text-[#756A5C] text-xs font-medium">
              <span>NIBP (Sys/Dia)</span>
              <Activity className="w-4 h-4 text-[#9C7854]" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl md:text-3xl font-bold font-serif text-[#2A241E]">
                {systolicBP}/{diastolicBP}
              </span>
              <span className="text-xs text-[#756A5C]">mmHg</span>
            </div>
          </div>

          {/* Core Temperature */}
          <div className="bubbly-card p-4 space-y-1">
            <div className="flex items-center justify-between text-[#756A5C] text-xs font-medium">
              <span>Body Temp</span>
              <Thermometer className="w-4 h-4 text-[#9C7854]" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl md:text-3xl font-bold font-serif text-[#2A241E]">
                {temperature}
              </span>
              <span className="text-xs text-[#756A5C]">°C</span>
            </div>
          </div>

          {/* Signal Quality */}
          <div className="bubbly-card p-4 space-y-1">
            <div className="flex items-center justify-between text-[#756A5C] text-xs font-medium">
              <span>Signal Quality</span>
              <Wifi className="w-4 h-4 text-[#9C7854]" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-2xl md:text-3xl font-bold font-serif ${signalQuality < 65 ? 'text-[#B87B32]' : 'text-[#2D6643]'}`}>
                {signalQuality}%
              </span>
            </div>
          </div>
        </div>

        {/* Cryptographic Telemetry Ingestion Ledger Link */}
        <div className="p-4 rounded-2xl bg-white/70 border border-white/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#EBF3ED] text-[#2D6643] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="font-mono text-[#2A241E]">
              <span className="text-[#756A5C] font-sans">Latest Ingested SHA-256 Digest: </span>
              <strong className="text-[#2A241E] bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-[rgba(160,140,115,0.15)]">{recentPacketHash.slice(0, 24)}...</strong>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-[#2D6643] px-3 py-1 rounded-full bg-[#EBF3ED] border border-[#C8E1D2]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Cryptographic Chain Link Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
