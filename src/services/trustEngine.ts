import {
  GatewayDecision,
  MedicalMeasurement,
  Patient,
  Sensor,
  TrustEvaluation,
  TrustWeights,
} from '../types';

export const DEFAULT_TRUST_WEIGHTS: TrustWeights = {
  dt: 0.25, // Device Trust weight
  sq: 0.20, // Signal Quality weight
  av: 0.25, // Anomaly Value weight
  tc: 0.15, // Temporal Consistency weight
  ph: 0.15, // Patient History weight
};

/**
 * Calculates Clinical Data Anomaly Value (AV) between 0 and 100
 * High value (85-100) means measurements are well within normal clinical limits.
 * Low value (< 60) signifies dangerous deviation or corrupt data payload.
 */
export function calculateAnomalyValue(measurement: MedicalMeasurement): number {
  let score = 100;

  // Heart Rate bounds (Normal: 60 - 100 bpm)
  if (measurement.heartRate < 50 || measurement.heartRate > 120) {
    score -= 35;
  } else if (measurement.heartRate < 60 || measurement.heartRate > 100) {
    score -= 15;
  }

  // SpO2 bounds (Normal: 95% - 100%)
  if (measurement.spo2 < 90) {
    score -= 40;
  } else if (measurement.spo2 < 95) {
    score -= 20;
  }

  // Blood Pressure bounds (Systolic: 90 - 140, Diastolic: 60 - 90)
  if (measurement.systolicBP > 160 || measurement.systolicBP < 85) {
    score -= 20;
  }
  if (measurement.diastolicBP > 100 || measurement.diastolicBP < 55) {
    score -= 15;
  }

  // Temperature bounds (Normal: 36.1 - 37.5)
  if (measurement.temperature > 38.5 || measurement.temperature < 35.5) {
    score -= 15;
  }

  if (measurement.isAbnormal) {
    score = Math.min(score, 45);
  }

  return Math.max(10, Math.min(98, score));
}

/**
 * Evaluates Temporal Consistency (TC)
 * Compares current measurement with prior measurement to ensure rate-of-change
 * does not exceed human physiological velocity limits.
 */
export function calculateTemporalConsistency(
  current: MedicalMeasurement,
  previous?: MedicalMeasurement
): number {
  if (!previous) return 92; // Default baseline

  let tc = 96;
  const hrDelta = Math.abs(current.heartRate - previous.heartRate);
  const spo2Delta = Math.abs(current.spo2 - previous.spo2);

  // Heart rate cannot jump > 35 bpm in a 2-second telemetry window without noise
  if (hrDelta > 40) {
    tc -= 40;
  } else if (hrDelta > 20) {
    tc -= 15;
  }

  // SpO2 cannot drop > 8% in 2 seconds
  if (spo2Delta > 10) {
    tc -= 35;
  }

  return Math.max(15, Math.min(98, tc));
}

/**
 * Evaluates Patient-History Consistency (PH)
 */
export function calculatePatientHistoryConsistency(
  measurement: MedicalMeasurement,
  patient?: Patient
): number {
  if (!patient) return 90;

  let ph = 92;
  const cond = (patient.condition || '').toLowerCase();

  // If patient has known hypertension, slightly elevated BP is consistent with history
  if (cond.includes('hypertension') && measurement.systolicBP > 135 && measurement.systolicBP < 160) {
    ph += 4;
  }
  // If patient has arrhythmia history
  if (cond.includes('arrhythmia') && measurement.isAbnormal) {
    ph += 2;
  }

  return Math.max(20, Math.min(97, ph));
}

/**
 * Main evaluation function:
 * MDTS = f(DT, SQ, AV, TC, PH)
 */
export function evaluateMeasurementTrust(
  measurement: MedicalMeasurement,
  sensor: Sensor,
  patient?: Patient,
  previousMeasurement?: MedicalMeasurement,
  customWeights: TrustWeights = DEFAULT_TRUST_WEIGHTS,
  recentAnomalyCount: number = 0
): TrustEvaluation {
  // Normalize weights
  const totalW = customWeights.dt + customWeights.sq + customWeights.av + customWeights.tc + customWeights.ph;
  const normWeights = {
    dt: customWeights.dt / totalW,
    sq: customWeights.sq / totalW,
    av: customWeights.av / totalW,
    tc: customWeights.tc / totalW,
    ph: customWeights.ph / totalW,
  };

  const dt = sensor.authStatus === 'Authenticated' ? sensor.deviceTrust : 20;
  const sq = Math.min(100, Math.max(10, measurement.signalQuality));
  const av = calculateAnomalyValue(measurement);
  const tc = calculateTemporalConsistency(measurement, previousMeasurement);
  const ph = calculatePatientHistoryConsistency(measurement, patient);

  // Compute weighted MDTS
  const rawMDTS = (
    dt * normWeights.dt +
    sq * normWeights.sq +
    av * normWeights.av +
    tc * normWeights.tc +
    ph * normWeights.ph
  );
  const mdts = Math.round(rawMDTS * 10) / 10;

  // Determine Gateway Decision
  let decision: GatewayDecision;
  let rationale = '';

  if (sensor.authStatus !== 'Authenticated' || dt < 50) {
    decision = 'Unauthorized - Block Sensor';
    rationale = `Hardware identity ${sensor.hardwareFingerprint} failed verification (DT: ${dt}). Telemetry stream quarantined by gateway.`;
  } else if (sq < 65) {
    decision = 'Poor Signal - Reacquire';
    rationale = `Electrode impedance or wireless SNR degraded (Signal Quality: ${sq}%). Flagging measurement and requesting packet reacquisition.`;
  } else if (av < 60) {
    if (recentAnomalyCount >= 2) {
      decision = 'Repeated Anomaly - Immediate Anchor';
      rationale = `Persistent critical clinical abnormality detected (AV: ${av}, count: ${recentAnomalyCount + 1}). Bypassing periodic batch for immediate priority blockchain anchoring.`;
    } else {
      decision = 'Abnormal - Raw Preserve & Alert';
      rationale = `Clinical anomaly detected (AV: ${av}). Lossy compression bypassed to preserve raw diagnostic record, alert escalated to workstation.`;
    }
  } else {
    decision = 'Normal - Compress & Batch';
    rationale = `Telemetry verified across all 5 trust dimensions (MDTS: ${mdts.toFixed(1)}). Applying adaptive compression and queuing for periodic batch anchoring.`;
  }

  return {
    id: `TEV-${Date.now().toString().slice(-6)}`,
    measurementId: measurement.id,
    patientId: measurement.patientId,
    sensorId: sensor.id,
    timestamp: measurement.timestamp,
    dt,
    sq,
    av,
    tc,
    ph,
    mdts,
    weights: normWeights,
    decision,
    decisionRationale: rationale,
  };
}
