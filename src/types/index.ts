export type MonitoringStatus = 'Active' | 'Observation' | 'Critical' | 'Inactive';

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup: string;
  condition: string;
  ward: string;
  assignedSensors: string[];
  monitoringStatus: MonitoringStatus;
  latestTrustScore: number;
  latestMeasurementTime: string;
  notes: string;
}

export type SensorType = 
  | '12-Lead ECG'
  | 'Pulse Oximeter (SpO2)'
  | 'Continuous NIBP'
  | 'Temperature Sensor'
  | 'Capnography (EtCO2)';

export type AuthStatus = 'Authenticated' | 'Pending Challenge' | 'Failed Challenge' | 'Quarantined';
export type DeviceState = 'Online' | 'Streaming' | 'Standby' | 'Error' | 'Blocked';

export interface Sensor {
  id: string;
  type: SensorType;
  patientId: string;
  patientName: string;
  hardwareFingerprint: string; // Simulated PUF Identity
  authStatus: AuthStatus;
  signalQuality: number; // 0 - 100%
  deviceTrust: number; // 0 - 100
  batteryLevel: number; // 0 - 100%
  firmwareVersion: string;
  lastCommunication: string;
  deviceState: DeviceState;
}

export interface MedicalMeasurement {
  id: string;
  patientId: string;
  sensorId: string;
  timestamp: string;
  heartRate: number; // bpm
  spo2: number; // %
  systolicBP: number; // mmHg
  diastolicBP: number; // mmHg
  respirationRate: number; // breaths/min
  temperature: number; // °C
  signalQuality: number; // %
  isAbnormal: boolean;
  anomalyNotes?: string;
  rawDataSummary: string;
}

export type GatewayDecision = 
  | 'Normal - Compress & Batch'
  | 'Poor Signal - Reacquire'
  | 'Abnormal - Raw Preserve & Alert'
  | 'Unauthorized - Block Sensor'
  | 'Repeated Anomaly - Immediate Anchor';

export interface TrustWeights {
  dt: number; // Device Trust weight
  sq: number; // Signal Quality weight
  av: number; // Anomaly Value weight
  tc: number; // Temporal Consistency weight
  ph: number; // Patient History weight
}

export interface TrustEvaluation {
  id: string;
  measurementId: string;
  patientId: string;
  sensorId: string;
  timestamp: string;
  dt: number; // Device Trust
  sq: number; // Signal Quality
  av: number; // Anomaly Value (high = normal physiological range, low = severe deviation)
  tc: number; // Temporal Consistency
  ph: number; // Patient-History Consistency
  mdts: number; // Medical Data Trust Score (0-100)
  weights: TrustWeights;
  decision: GatewayDecision;
  decisionRationale: string;
}

export type AnchoringStatus = 'Pending Batch' | 'Anchored' | 'Priority Anchored';

export interface ProvenanceRecord {
  id: string;
  measurementId: string;
  patientId: string;
  patientName: string;
  sensorId: string;
  sensorType: SensorType;
  timestamp: string;
  trustScore: number;
  signalQuality: number;
  processingDecision: GatewayDecision;
  payload: Record<string, any>;
  dataHash: string; // Genuine SHA-256
  prevHash: string; // Chain linkage
  anchoringStatus: AnchoringStatus;
  blockHeight?: number;
  transactionHash?: string;
  isTampered?: boolean;
  tamperedPayload?: Record<string, any>;
  calculatedHash?: string;
}

export type AnchoringEventType = 'Periodic Rollup' | 'Emergency Priority Anchor' | 'Sensor Identity Registration';

export interface BlockchainAnchoringEvent {
  id: string;
  blockHeight: number;
  batchId: string;
  eventType: AnchoringEventType;
  recordCount: number;
  recordIds: string[];
  merkleRoot: string;
  prevBlockHash: string;
  transactionHash: string;
  timestamp: string;
  validatorConfirmations: number;
  gasOverheadUnits: number;
  status: 'Confirmed' | 'Pending Consensus';
}

export type AccessStatus = 'Pending' | 'Approved' | 'Rejected' | 'Revoked' | 'Expired';

export interface AccessRequest {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  patientId: string;
  patientName: string;
  categories: string[];
  purpose: string;
  requestedDurationHours: number;
  status: AccessStatus;
  requestedAt: string;
  decidedAt?: string;
  expiresAt?: string;
}

export interface EmergencyAccessGrant {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  hospitalLocation: string;
  reason: string;
  dataScope: string[];
  grantedAt: string;
  expiresAt: string;
  durationMinutes: number;
  status: 'Active' | 'Expired' | 'Revoked';
  supervisorNotified: string;
  auditTxHash: string;
}

export type AuditSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type AuditOutcome = 'SUCCESS' | 'WARNING' | 'ALERT' | 'BLOCKED';
export type ActorRole = 'System Gateway' | 'Doctor' | 'Admin' | 'Auditor' | 'Patient' | 'Hardware Sensor';

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  role: ActorRole;
  action: string;
  category: 'Authentication' | 'Telemetry' | 'Access Control' | 'Emergency' | 'Provenance' | 'Security Incident' | 'Blockchain';
  resource: string;
  outcome: AuditOutcome;
  severity: AuditSeverity;
  details: string;
  associatedRecordId?: string;
}
