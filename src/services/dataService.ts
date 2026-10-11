import {
  INITIAL_ACCESS_REQUESTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_BLOCKCHAIN_EVENTS,
  INITIAL_EMERGENCY_GRANTS,
  INITIAL_MEASUREMENTS,
  INITIAL_PATIENTS,
  INITIAL_PROVENANCE_RECORDS,
  INITIAL_SENSORS,
} from '../data/mockData';
import {
  AccessRequest,
  AuditLog,
  BlockchainAnchoringEvent,
  EmergencyAccessGrant,
  GatewayDecision,
  MedicalMeasurement,
  Patient,
  ProvenanceRecord,
  Sensor,
  TrustEvaluation,
  TrustWeights,
} from '../types';
import { canonicalStringify, sha256, simulatePUFChallengeResponse } from './cryptoService';
import { DEFAULT_TRUST_WEIGHTS, evaluateMeasurementTrust } from './trustEngine';

const STORAGE_KEYS = {
  PATIENTS: 'medguard_patients_v1',
  SENSORS: 'medguard_sensors_v1',
  MEASUREMENTS: 'medguard_measurements_v1',
  PROVENANCE: 'medguard_provenance_v1',
  BLOCKCHAIN: 'medguard_blockchain_v1',
  ACCESS: 'medguard_access_v1',
  EMERGENCY: 'medguard_emergency_v1',
  AUDIT: 'medguard_audit_v1',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`Failed reading ${key} from localStorage`, e);
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Failed saving ${key} to localStorage`, e);
  }
}

export class DataService {
  private patients: Patient[];
  private sensors: Sensor[];
  private measurements: MedicalMeasurement[];
  private provenance: ProvenanceRecord[];
  private blockchainEvents: BlockchainAnchoringEvent[];
  private accessRequests: AccessRequest[];
  private emergencyGrants: EmergencyAccessGrant[];
  private auditLogs: AuditLog[];
  private trustWeights: TrustWeights;

  constructor() {
    this.patients = loadFromStorage(STORAGE_KEYS.PATIENTS, INITIAL_PATIENTS);
    this.sensors = loadFromStorage(STORAGE_KEYS.SENSORS, INITIAL_SENSORS);
    this.measurements = loadFromStorage(STORAGE_KEYS.MEASUREMENTS, INITIAL_MEASUREMENTS);
    this.provenance = loadFromStorage(STORAGE_KEYS.PROVENANCE, INITIAL_PROVENANCE_RECORDS);
    this.blockchainEvents = loadFromStorage(STORAGE_KEYS.BLOCKCHAIN, INITIAL_BLOCKCHAIN_EVENTS);
    this.accessRequests = loadFromStorage(STORAGE_KEYS.ACCESS, INITIAL_ACCESS_REQUESTS);
    this.emergencyGrants = loadFromStorage(STORAGE_KEYS.EMERGENCY, INITIAL_EMERGENCY_GRANTS);
    this.auditLogs = loadFromStorage(STORAGE_KEYS.AUDIT, INITIAL_AUDIT_LOGS);
    this.trustWeights = DEFAULT_TRUST_WEIGHTS;
  }

  private persist() {
    saveToStorage(STORAGE_KEYS.PATIENTS, this.patients);
    saveToStorage(STORAGE_KEYS.SENSORS, this.sensors);
    saveToStorage(STORAGE_KEYS.MEASUREMENTS, this.measurements);
    saveToStorage(STORAGE_KEYS.PROVENANCE, this.provenance);
    saveToStorage(STORAGE_KEYS.BLOCKCHAIN, this.blockchainEvents);
    saveToStorage(STORAGE_KEYS.ACCESS, this.accessRequests);
    saveToStorage(STORAGE_KEYS.EMERGENCY, this.emergencyGrants);
    saveToStorage(STORAGE_KEYS.AUDIT, this.auditLogs);
  }

  // --- Patients API ---
  async getPatients(): Promise<Patient[]> {
    return [...this.patients];
  }

  async getPatientById(id: string): Promise<Patient | undefined> {
    return this.patients.find(p => p.id === id);
  }

  async createPatient(data: Omit<Patient, 'id' | 'latestTrustScore' | 'latestMeasurementTime'>): Promise<Patient> {
    const newId = `PT-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPatient: Patient = {
      ...data,
      id: newId,
      latestTrustScore: 95.0,
      latestMeasurementTime: new Date().toISOString(),
    };
    this.patients.unshift(newPatient);
    this.logAudit({
      actor: 'ADMIN-PORTAL',
      role: 'Admin',
      action: 'PATIENT_REGISTERED',
      category: 'Access Control',
      resource: newId,
      outcome: 'SUCCESS',
      severity: 'Low',
      details: `Enrolled patient ${newPatient.name} (${newId}) with assigned sensors: ${newPatient.assignedSensors.join(', ')}`,
      associatedRecordId: newId,
    });
    this.persist();
    return newPatient;
  }

  // --- Sensors API ---
  async getSensors(): Promise<Sensor[]> {
    return [...this.sensors];
  }

  async getSensorById(id: string): Promise<Sensor | undefined> {
    return this.sensors.find(s => s.id === id);
  }

  async createSensor(sensorData: Omit<Sensor, 'id'>): Promise<Sensor> {
    const typePrefix = sensorData.type.includes('ECG') ? 'ECG' : sensorData.type.includes('SpO2') ? 'SPO2' : 'SNR';
    const newId = `SNR-${typePrefix}-${Math.floor(10 + Math.random() * 90)}`;
    const newSensor: Sensor = {
      ...sensorData,
      id: newId,
    };
    this.sensors.unshift(newSensor);
    this.logAudit({
      actor: 'SYS-GATEWAY',
      role: 'System Gateway',
      action: 'SENSOR_PROVISIONED',
      category: 'Authentication',
      resource: newId,
      outcome: 'SUCCESS',
      severity: 'Low',
      details: `Provisioned sensor ${newId} with PUF token ${newSensor.hardwareFingerprint}`,
      associatedRecordId: newId,
    });
    this.persist();
    return newSensor;
  }

  async authenticateSensor(id: string): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const sensor = this.sensors.find(s => s.id === id);
    if (!sensor) throw new Error('Sensor not found');

    const nonce = `NONCE-0x${Math.floor(Math.random() * 0xffffffff).toString(16)}`;
    const result = await simulatePUFChallengeResponse(sensor.hardwareFingerprint, nonce);

    if (result.success) {
      sensor.authStatus = 'Authenticated';
      sensor.deviceState = 'Streaming';
      sensor.deviceTrust = Math.max(90, sensor.deviceTrust);
      this.logAudit({
        actor: 'GW-CRYPTO-ENGINE',
        role: 'System Gateway',
        action: 'PUF_CHALLENGE_VERIFIED',
        category: 'Authentication',
        resource: sensor.id,
        outcome: 'SUCCESS',
        severity: 'Low',
        details: `Hardware challenge response validated in ${result.latencyMs}ms. Token signature verified.`,
        associatedRecordId: sensor.id,
      });
    } else {
      sensor.authStatus = 'Failed Challenge';
      sensor.deviceState = 'Blocked';
      sensor.deviceTrust = 15;
      this.logAudit({
        actor: 'GW-FIREWALL',
        role: 'System Gateway',
        action: 'PUF_CHALLENGE_FAILED',
        category: 'Security Incident',
        resource: sensor.id,
        outcome: 'BLOCKED',
        severity: 'High',
        details: `PUF Challenge rejected: Signature mismatch on token ${sensor.hardwareFingerprint}. Device quarantined.`,
        associatedRecordId: sensor.id,
      });
    }

    this.persist();
    return {
      success: result.success,
      latencyMs: result.latencyMs,
      message: result.success ? 'Cryptographic hardware challenge succeeded' : 'Challenge failed - Hardware signature rejected',
    };
  }

  async quarantineSensor(id: string): Promise<void> {
    const sensor = this.sensors.find(s => s.id === id);
    if (!sensor) return;

    sensor.authStatus = 'Quarantined';
    sensor.deviceState = 'Blocked';
    sensor.deviceTrust = 10;
    this.logAudit({
      actor: 'SOC-OPERATOR',
      role: 'Admin',
      action: 'SENSOR_MANUALLY_QUARANTINED',
      category: 'Security Incident',
      resource: sensor.id,
      outcome: 'BLOCKED',
      severity: 'High',
      details: `Operator manually quarantined sensor ${sensor.id}. Incoming telemetry terminated.`,
      associatedRecordId: sensor.id,
    });
    this.persist();
  }

  // --- Telemetry & Measurements API ---
  async getMeasurements(patientId?: string): Promise<MedicalMeasurement[]> {
    if (!patientId) return [...this.measurements];
    return this.measurements.filter(m => m.patientId === patientId);
  }

  async recordMeasurement(data: Omit<MedicalMeasurement, 'id' | 'timestamp'>): Promise<{
    measurement: MedicalMeasurement;
    evaluation: TrustEvaluation;
    provenance: ProvenanceRecord;
  }> {
    const timestamp = new Date().toISOString();
    const newId = `MEAS-${Date.now().toString().slice(-6)}`;
    const measurement: MedicalMeasurement = {
      ...data,
      id: newId,
      timestamp,
    };
    this.measurements.unshift(measurement);

    // Get sensor and patient
    const sensor = this.sensors.find(s => s.id === measurement.sensorId) || {
      id: measurement.sensorId,
      type: '12-Lead ECG',
      patientId: measurement.patientId,
      patientName: 'Unknown',
      hardwareFingerprint: 'PUF-SIM-GENERIC',
      authStatus: 'Authenticated',
      signalQuality: measurement.signalQuality,
      deviceTrust: 95,
      batteryLevel: 90,
      firmwareVersion: 'v3.0.0',
      lastCommunication: timestamp,
      deviceState: 'Streaming',
    };

    const patient = this.patients.find(p => p.id === measurement.patientId);
    const prevMeasurement = this.measurements[1];

    // Evaluate Trust
    const evaluation = evaluateMeasurementTrust(
      measurement,
      sensor,
      patient,
      prevMeasurement,
      this.trustWeights
    );

    // Update patient latest stats
    if (patient) {
      patient.latestTrustScore = evaluation.mdts;
      patient.latestMeasurementTime = timestamp;
      if (measurement.isAbnormal) {
        patient.monitoringStatus = 'Critical';
      }
    }

    // Build Provenance Record
    const prevHash = this.provenance[0] ? this.provenance[0].dataHash : '0000000000000000000000000000000000000000000000000000000000000000';
    const payload = {
      measurementId: newId,
      patientId: measurement.patientId,
      sensorId: measurement.sensorId,
      timestamp,
      clinicalRecord: {
        diagnosticObservation: 'Electronic Health Ingestion',
        readingType: 'Verified IoT Telemetry',
      },
      trustScore: evaluation.mdts,
      signalQuality: measurement.signalQuality,
      decision: evaluation.decision,
      pufSignature: `SIG_${sensor.hardwareFingerprint.slice(0, 12)}_VALID`,
    };

    const rawCanonical = canonicalStringify(payload);
    const dataHash = await sha256(rawCanonical);

    const isPriority = evaluation.decision === 'Repeated Anomaly - Immediate Anchor' || evaluation.decision === 'Abnormal - Raw Preserve & Alert';

    const provRecord: ProvenanceRecord = {
      id: `PRV-${Date.now().toString().slice(-6)}`,
      measurementId: newId,
      patientId: measurement.patientId,
      patientName: patient ? patient.name : 'Unknown',
      sensorId: measurement.sensorId,
      sensorType: sensor.type,
      timestamp,
      trustScore: evaluation.mdts,
      signalQuality: measurement.signalQuality,
      processingDecision: evaluation.decision,
      payload,
      dataHash,
      prevHash,
      anchoringStatus: isPriority ? 'Priority Anchored' : 'Pending Batch',
      blockHeight: isPriority ? 189422 : undefined,
      transactionHash: isPriority ? `0x${dataHash.slice(0, 32)}` : undefined,
      isTampered: false,
    };

    this.provenance.unshift(provRecord);

    // If priority, generate an anchoring event
    if (isPriority) {
      this.blockchainEvents.unshift({
        id: `BCH-EVT-${Date.now().toString().slice(-4)}`,
        blockHeight: 189422,
        batchId: `PRIORITY-${newId}`,
        eventType: 'Emergency Priority Anchor',
        recordCount: 1,
        recordIds: [provRecord.id],
        merkleRoot: dataHash,
        prevBlockHash: this.blockchainEvents[0]?.merkleRoot || '0x000',
        transactionHash: `0x${dataHash.slice(0, 32)}`,
        timestamp,
        validatorConfirmations: 5,
        gasOverheadUnits: 36000,
        status: 'Confirmed',
      });
    }

    this.logAudit({
      actor: sensor.id,
      role: 'Hardware Sensor',
      action: isPriority ? 'CRITICAL_MEASUREMENT_ANCHORED' : 'MEASUREMENT_RECORDED',
      category: isPriority ? 'Emergency' : 'Telemetry',
      resource: newId,
      outcome: isPriority ? 'ALERT' : 'SUCCESS',
      severity: isPriority ? 'High' : 'Low',
      details: `${isPriority ? 'Abnormal reading flagged.' : 'Standard telemetry processed.'} MDTS: ${evaluation.mdts}/100. Hash: ${dataHash.slice(0, 16)}...`,
      associatedRecordId: provRecord.id,
    });

    this.persist();
    return { measurement, evaluation, provenance: provRecord };
  }

  // --- Provenance & Tampering Demo API ---
  async getProvenanceRecords(): Promise<ProvenanceRecord[]> {
    return [...this.provenance];
  }

  async verifyProvenance(recordId: string): Promise<{
    isValid: boolean;
    computedHash: string;
    expectedHash: string;
    isTampered: boolean;
  }> {
    const record = this.provenance.find(r => r.id === recordId);
    if (!record) throw new Error('Provenance record not found');

    const payloadToHash = record.isTampered && record.tamperedPayload ? record.tamperedPayload : record.payload;
    const computedHash = await sha256(canonicalStringify(payloadToHash));
    const isValid = computedHash === record.dataHash;

    return {
      isValid,
      computedHash,
      expectedHash: record.dataHash,
      isTampered: !!record.isTampered,
    };
  }

  async simulateTampering(recordId: string, tamperedField: string, fakeValue: any): Promise<{
    record: ProvenanceRecord;
    computedHash: string;
  }> {
    const record = this.provenance.find(r => r.id === recordId);
    if (!record) throw new Error('Provenance record not found');

    // Deep clone payload
    const tamperedPayload = JSON.parse(JSON.stringify(record.payload));

    // Inject fake value
    if (tamperedPayload.clinicalRecord && tamperedField in tamperedPayload.clinicalRecord) {
      tamperedPayload.clinicalRecord[tamperedField] = fakeValue;
    } else {
      tamperedPayload[tamperedField] = fakeValue;
    }

    record.isTampered = true;
    record.tamperedPayload = tamperedPayload;
    const computedHash = await sha256(canonicalStringify(tamperedPayload));
    record.calculatedHash = computedHash;

    this.logAudit({
      actor: 'SECURITY-AUDIT-TESTER',
      role: 'Auditor',
      action: 'DATA_TAMPERING_SIMULATED',
      category: 'Security Incident',
      resource: record.id,
      outcome: 'ALERT',
      severity: 'Critical',
      details: `Simulated unauthorized modification on ${record.id} (${tamperedField} changed to ${fakeValue}). Cryptographic verification will fail!`,
      associatedRecordId: record.id,
    });

    this.persist();
    return { record, computedHash };
  }

  async restoreOriginalPayload(recordId: string): Promise<ProvenanceRecord> {
    const record = this.provenance.find(r => r.id === recordId);
    if (!record) throw new Error('Provenance record not found');

    record.isTampered = false;
    delete record.tamperedPayload;
    delete record.calculatedHash;

    this.logAudit({
      actor: 'SECURITY-AUDIT-TESTER',
      role: 'Auditor',
      action: 'DATA_INTEGRITY_RESTORED',
      category: 'Security Incident',
      resource: record.id,
      outcome: 'SUCCESS',
      severity: 'Low',
      details: `Restored original authentic payload for ${record.id}. Hash matching confirmed.`,
      associatedRecordId: record.id,
    });

    this.persist();
    return record;
  }

  // --- Blockchain Anchoring API ---
  async getBlockchainEvents(): Promise<BlockchainAnchoringEvent[]> {
    return [...this.blockchainEvents];
  }

  async anchorPendingBatch(): Promise<BlockchainAnchoringEvent> {
    const pending = this.provenance.filter(p => p.anchoringStatus === 'Pending Batch');
    const hashes = pending.map(p => p.dataHash);

    // If no pending, anchor recent 4 records for demo effect
    const demoHashes = hashes.length > 0 ? hashes : this.provenance.slice(0, 4).map(p => p.dataHash);
    const combinedString = demoHashes.join('');
    const merkleRoot = await sha256(combinedString);

    const latestBlock = this.blockchainEvents[0]?.blockHeight || 189422;
    const nextBlock = latestBlock + 1;
    const batchId = `BATCH-${new Date().toISOString().slice(0, 10)}-${Math.floor(100 + Math.random() * 900)}`;
    const txHash = `0x${merkleRoot.slice(0, 32)}`;

    const event: BlockchainAnchoringEvent = {
      id: `BCH-EVT-${Date.now().toString().slice(-4)}`,
      blockHeight: nextBlock,
      batchId,
      eventType: 'Periodic Rollup',
      recordCount: demoHashes.length,
      recordIds: pending.map(p => p.id),
      merkleRoot,
      prevBlockHash: this.blockchainEvents[0]?.merkleRoot || '0x000',
      transactionHash: txHash,
      timestamp: new Date().toISOString(),
      validatorConfirmations: 5,
      gasOverheadUnits: 62000,
      status: 'Confirmed',
    };

    // Mark pending records as anchored
    for (const p of pending) {
      p.anchoringStatus = 'Anchored';
      p.blockHeight = nextBlock;
      p.transactionHash = txHash;
    }

    this.blockchainEvents.unshift(event);

    this.logAudit({
      actor: 'GW-ANCHORING-WORKER',
      role: 'System Gateway',
      action: 'BATCH_MERKLE_ROOT_ANCHORED',
      category: 'Blockchain',
      resource: `BLOCK #${nextBlock}`,
      outcome: 'SUCCESS',
      severity: 'Low',
      details: `Anchored batch ${batchId} (${demoHashes.length} records) to Block #${nextBlock}. Merkle Root: ${merkleRoot.slice(0, 16)}...`,
      associatedRecordId: event.id,
    });

    this.persist();
    return event;
  }

  // --- Access Control API ---
  async getAccessRequests(): Promise<AccessRequest[]> {
    return [...this.accessRequests];
  }

  async createAccessRequest(data: Omit<AccessRequest, 'id' | 'status' | 'requestedAt'>): Promise<AccessRequest> {
    const newId = `REQ-${Math.floor(4000 + Math.random() * 1000)}`;
    const req: AccessRequest = {
      ...data,
      id: newId,
      status: 'Pending',
      requestedAt: new Date().toISOString(),
    };
    this.accessRequests.unshift(req);

    this.logAudit({
      actor: req.doctorId,
      role: 'Doctor',
      action: 'ACCESS_REQUEST_FILED',
      category: 'Access Control',
      resource: req.id,
      outcome: 'SUCCESS',
      severity: 'Low',
      details: `${req.doctorName} requested ${req.requestedDurationHours}h access to ${req.patientName}'s telemetry. Purpose: ${req.purpose}`,
      associatedRecordId: req.id,
    });

    this.persist();
    return req;
  }

  async approveAccessRequest(id: string): Promise<AccessRequest> {
    const req = this.accessRequests.find(r => r.id === id);
    if (!req) throw new Error('Request not found');

    req.status = 'Approved';
    req.decidedAt = new Date().toISOString();
    const expires = new Date(Date.now() + req.requestedDurationHours * 3600 * 1000);
    req.expiresAt = expires.toISOString();

    this.logAudit({
      actor: 'ADMIN-CONSENT-DESK',
      role: 'Admin',
      action: 'ACCESS_REQUEST_APPROVED',
      category: 'Access Control',
      resource: req.id,
      outcome: 'SUCCESS',
      severity: 'Low',
      details: `Approved telemetry access for ${req.doctorName} until ${expires.toLocaleTimeString()}`,
      associatedRecordId: req.id,
    });

    this.persist();
    return req;
  }

  async rejectAccessRequest(id: string): Promise<AccessRequest> {
    const req = this.accessRequests.find(r => r.id === id);
    if (!req) throw new Error('Request not found');

    req.status = 'Rejected';
    req.decidedAt = new Date().toISOString();

    this.logAudit({
      actor: 'ADMIN-CONSENT-DESK',
      role: 'Admin',
      action: 'ACCESS_REQUEST_REJECTED',
      category: 'Access Control',
      resource: req.id,
      outcome: 'WARNING',
      severity: 'Medium',
      details: `Rejected access request ${req.id} filed by ${req.doctorName}`,
      associatedRecordId: req.id,
    });

    this.persist();
    return req;
  }

  async revokeAccess(id: string): Promise<AccessRequest> {
    const req = this.accessRequests.find(r => r.id === id);
    if (!req) throw new Error('Request not found');

    req.status = 'Revoked';

    this.logAudit({
      actor: 'ADMIN-CONSENT-DESK',
      role: 'Admin',
      action: 'ACCESS_PERMISSION_REVOKED',
      category: 'Access Control',
      resource: req.id,
      outcome: 'WARNING',
      severity: 'Medium',
      details: `Revoked active access grant for ${req.doctorName}`,
      associatedRecordId: req.id,
    });

    this.persist();
    return req;
  }

  // --- Emergency Access (Break-Glass) API ---
  async getEmergencyGrants(): Promise<EmergencyAccessGrant[]> {
    return [...this.emergencyGrants];
  }

  async createEmergencyAccess(data: {
    patientId: string;
    patientName: string;
    doctorId: string;
    doctorName: string;
    hospitalLocation: string;
    reason: string;
    dataScope: string[];
    durationMinutes: number;
    supervisorNotified: string;
  }): Promise<EmergencyAccessGrant> {
    const newId = `EMG-${Math.floor(8800 + Math.random() * 1000)}`;
    const grantedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + data.durationMinutes * 60 * 1000).toISOString();
    const auditTxHash = await sha256(`${newId}:${data.patientId}:${data.doctorId}:${grantedAt}:BREAK_GLASS`);

    const grant: EmergencyAccessGrant = {
      id: newId,
      ...data,
      grantedAt,
      expiresAt,
      status: 'Active',
      auditTxHash: `0x${auditTxHash.slice(0, 32)}`,
    };

    this.emergencyGrants.unshift(grant);

    // Audit log
    this.logAudit({
      actor: `${data.doctorId} ${data.doctorName}`,
      role: 'Doctor',
      action: 'EMERGENCY_BREAK_GLASS_TRIGGERED',
      category: 'Emergency',
      resource: `${data.patientId} Gateway`,
      outcome: 'ALERT',
      severity: 'Critical',
      details: `CRITICAL BREAK-GLASS ACCESS GRANTED for ${data.durationMinutes} min. Clinical justification: "${data.reason}". Supervisor notified: ${data.supervisorNotified}. Hash: ${grant.auditTxHash}`,
      associatedRecordId: newId,
    });

    this.persist();
    return grant;
  }

  async revokeEmergencyAccess(id: string): Promise<EmergencyAccessGrant> {
    const grant = this.emergencyGrants.find(g => g.id === id);
    if (!grant) throw new Error('Grant not found');

    grant.status = 'Revoked';

    this.logAudit({
      actor: 'SOC-CHIEF-ADMIN',
      role: 'Admin',
      action: 'EMERGENCY_ACCESS_TERMINATED',
      category: 'Emergency',
      resource: grant.id,
      outcome: 'WARNING',
      severity: 'High',
      details: `Terminated emergency access session ${grant.id} for ${grant.doctorName}. Access channels closed.`,
      associatedRecordId: grant.id,
    });

    this.persist();
    return grant;
  }

  // --- Audit Logs API ---
  async getAuditLogs(): Promise<AuditLog[]> {
    return [...this.auditLogs];
  }

  logAudit(entry: Omit<AuditLog, 'id' | 'timestamp'>): void {
    const newLog: AuditLog = {
      ...entry,
      id: `AUD-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.unshift(newLog);
    // Keep max 200 logs
    if (this.auditLogs.length > 200) {
      this.auditLogs = this.auditLogs.slice(0, 200);
    }
  }

  // --- Weights & Config ---
  getTrustWeights(): TrustWeights {
    return { ...this.trustWeights };
  }

  setTrustWeights(weights: TrustWeights): void {
    this.trustWeights = { ...weights };
  }

  resetDemoData(): void {
    localStorage.removeItem(STORAGE_KEYS.PATIENTS);
    localStorage.removeItem(STORAGE_KEYS.SENSORS);
    localStorage.removeItem(STORAGE_KEYS.MEASUREMENTS);
    localStorage.removeItem(STORAGE_KEYS.PROVENANCE);
    localStorage.removeItem(STORAGE_KEYS.BLOCKCHAIN);
    localStorage.removeItem(STORAGE_KEYS.ACCESS);
    localStorage.removeItem(STORAGE_KEYS.EMERGENCY);
    localStorage.removeItem(STORAGE_KEYS.AUDIT);

    this.patients = [...INITIAL_PATIENTS];
    this.sensors = [...INITIAL_SENSORS];
    this.measurements = [...INITIAL_MEASUREMENTS];
    this.provenance = [...INITIAL_PROVENANCE_RECORDS];
    this.blockchainEvents = [...INITIAL_BLOCKCHAIN_EVENTS];
    this.accessRequests = [...INITIAL_ACCESS_REQUESTS];
    this.emergencyGrants = [...INITIAL_EMERGENCY_GRANTS];
    this.auditLogs = [...INITIAL_AUDIT_LOGS];
    this.trustWeights = DEFAULT_TRUST_WEIGHTS;

    this.persist();
  }
}

// Central singleton instance
export const dataService = new DataService();
