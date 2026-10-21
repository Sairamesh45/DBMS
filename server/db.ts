import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  INITIAL_ACCESS_REQUESTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_BLOCKCHAIN_EVENTS,
  INITIAL_EMERGENCY_GRANTS,
  INITIAL_MEASUREMENTS,
  INITIAL_PATIENTS,
  INITIAL_PROVENANCE_RECORDS,
  INITIAL_SENSORS,
} from '../src/data/mockData';
import { canonicalStringify, sha256 } from './crypto';
import { DEFAULT_TRUST_WEIGHTS } from './trustEngine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DatabaseService {
  public db: DatabaseSync;

  constructor(dbPath?: string) {
    if (!dbPath) {
      const serverDir = path.resolve(__dirname);
      if (!fs.existsSync(serverDir)) {
        fs.mkdirSync(serverDir, { recursive: true });
      }
      dbPath = path.join(serverDir, 'medguard.db');
    }
    this.db = new DatabaseSync(dbPath);
    this.initTables();
    this.seedIfEmpty();
  }

  private initTables() {
    this.db.exec(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL,
        bloodGroup TEXT NOT NULL,
        condition TEXT NOT NULL,
        ward TEXT NOT NULL,
        assignedSensors TEXT NOT NULL, -- JSON array
        monitoringStatus TEXT NOT NULL,
        latestTrustScore REAL NOT NULL,
        latestMeasurementTime TEXT NOT NULL,
        notes TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sensors (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        patientId TEXT NOT NULL,
        patientName TEXT NOT NULL,
        hardwareFingerprint TEXT NOT NULL,
        authStatus TEXT NOT NULL,
        signalQuality REAL NOT NULL,
        deviceTrust REAL NOT NULL,
        batteryLevel REAL NOT NULL,
        firmwareVersion TEXT NOT NULL,
        lastCommunication TEXT NOT NULL,
        deviceState TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS medical_measurements (
        id TEXT PRIMARY KEY,
        patientId TEXT NOT NULL,
        sensorId TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        heartRate REAL NOT NULL,
        spo2 REAL NOT NULL,
        systolicBP REAL NOT NULL,
        diastolicBP REAL NOT NULL,
        respirationRate REAL NOT NULL,
        temperature REAL NOT NULL,
        signalQuality REAL NOT NULL,
        isAbnormal INTEGER NOT NULL,
        anomalyNotes TEXT,
        rawDataSummary TEXT
      );

      CREATE TABLE IF NOT EXISTS trust_evaluations (
        id TEXT PRIMARY KEY,
        measurementId TEXT NOT NULL,
        patientId TEXT NOT NULL,
        sensorId TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        dt REAL NOT NULL,
        sq REAL NOT NULL,
        av REAL NOT NULL,
        tc REAL NOT NULL,
        ph REAL NOT NULL,
        mdts REAL NOT NULL,
        weights TEXT NOT NULL, -- JSON
        decision TEXT NOT NULL,
        decisionRationale TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS provenance_records (
        id TEXT PRIMARY KEY,
        measurementId TEXT NOT NULL,
        patientId TEXT NOT NULL,
        patientName TEXT NOT NULL,
        sensorId TEXT NOT NULL,
        sensorType TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        trustScore REAL NOT NULL,
        signalQuality REAL NOT NULL,
        processingDecision TEXT NOT NULL,
        payload TEXT NOT NULL, -- JSON
        dataHash TEXT NOT NULL,
        prevHash TEXT NOT NULL,
        anchoringStatus TEXT NOT NULL,
        blockHeight INTEGER,
        transactionHash TEXT,
        isTampered INTEGER NOT NULL DEFAULT 0,
        tamperedPayload TEXT, -- JSON
        calculatedHash TEXT
      );

      CREATE TABLE IF NOT EXISTS blockchain_events (
        id TEXT PRIMARY KEY,
        blockHeight INTEGER NOT NULL,
        batchId TEXT NOT NULL,
        eventType TEXT NOT NULL,
        recordCount INTEGER NOT NULL,
        recordIds TEXT NOT NULL, -- JSON array
        merkleRoot TEXT NOT NULL,
        prevBlockHash TEXT NOT NULL,
        transactionHash TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        validatorConfirmations INTEGER NOT NULL,
        gasOverheadUnits INTEGER NOT NULL,
        status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS access_requests (
        id TEXT PRIMARY KEY,
        doctorId TEXT NOT NULL,
        doctorName TEXT NOT NULL,
        doctorSpecialty TEXT NOT NULL,
        patientId TEXT NOT NULL,
        patientName TEXT NOT NULL,
        categories TEXT NOT NULL, -- JSON array
        purpose TEXT NOT NULL,
        requestedDurationHours INTEGER NOT NULL,
        status TEXT NOT NULL,
        requestedAt TEXT NOT NULL,
        decidedAt TEXT,
        expiresAt TEXT
      );

      CREATE TABLE IF NOT EXISTS emergency_grants (
        id TEXT PRIMARY KEY,
        patientId TEXT NOT NULL,
        patientName TEXT NOT NULL,
        doctorId TEXT NOT NULL,
        doctorName TEXT NOT NULL,
        hospitalLocation TEXT NOT NULL,
        reason TEXT NOT NULL,
        dataScope TEXT NOT NULL, -- JSON array
        grantedAt TEXT NOT NULL,
        expiresAt TEXT NOT NULL,
        durationMinutes INTEGER NOT NULL,
        status TEXT NOT NULL,
        supervisorNotified TEXT NOT NULL,
        auditTxHash TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        actor TEXT NOT NULL,
        role TEXT NOT NULL,
        action TEXT NOT NULL,
        category TEXT NOT NULL,
        resource TEXT NOT NULL,
        outcome TEXT NOT NULL,
        severity TEXT NOT NULL,
        details TEXT NOT NULL,
        associatedRecordId TEXT
      );

      CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  public seedIfEmpty() {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM patients').get() as { count: number };
    if (row && Number(row.count) > 0) {
      return;
    }
    this.resetData();
  }

  public resetData() {
    this.db.exec(`
      DELETE FROM patients;
      DELETE FROM sensors;
      DELETE FROM medical_measurements;
      DELETE FROM trust_evaluations;
      DELETE FROM provenance_records;
      DELETE FROM blockchain_events;
      DELETE FROM access_requests;
      DELETE FROM emergency_grants;
      DELETE FROM audit_logs;
      DELETE FROM system_config;
    `);

    // 1. Patients
    const insertPatient = this.db.prepare(`
      INSERT INTO patients (id, name, age, gender, bloodGroup, condition, ward, assignedSensors, monitoringStatus, latestTrustScore, latestMeasurementTime, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const p of INITIAL_PATIENTS) {
      insertPatient.run(
        p.id,
        p.name,
        p.age,
        p.gender,
        p.bloodGroup,
        p.condition,
        p.ward,
        JSON.stringify(p.assignedSensors),
        p.monitoringStatus,
        p.latestTrustScore,
        p.latestMeasurementTime,
        p.notes
      );
    }

    // 2. Sensors
    const insertSensor = this.db.prepare(`
      INSERT INTO sensors (id, type, patientId, patientName, hardwareFingerprint, authStatus, signalQuality, deviceTrust, batteryLevel, firmwareVersion, lastCommunication, deviceState)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const s of INITIAL_SENSORS) {
      insertSensor.run(
        s.id,
        s.type,
        s.patientId,
        s.patientName,
        s.hardwareFingerprint,
        s.authStatus,
        s.signalQuality,
        s.deviceTrust,
        s.batteryLevel,
        s.firmwareVersion,
        s.lastCommunication,
        s.deviceState
      );
    }

    // 3. Measurements
    const insertMeas = this.db.prepare(`
      INSERT INTO medical_measurements (id, patientId, sensorId, timestamp, heartRate, spo2, systolicBP, diastolicBP, respirationRate, temperature, signalQuality, isAbnormal, anomalyNotes, rawDataSummary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const m of INITIAL_MEASUREMENTS) {
      insertMeas.run(
        m.id,
        m.patientId,
        m.sensorId,
        m.timestamp,
        m.heartRate,
        m.spo2,
        m.systolicBP,
        m.diastolicBP,
        m.respirationRate,
        m.temperature,
        m.signalQuality,
        m.isAbnormal ? 1 : 0,
        m.anomalyNotes || '',
        m.rawDataSummary || ''
      );
    }

    // 4. Provenance Records
    const insertProv = this.db.prepare(`
      INSERT INTO provenance_records (id, measurementId, patientId, patientName, sensorId, sensorType, timestamp, trustScore, signalQuality, processingDecision, payload, dataHash, prevHash, anchoringStatus, blockHeight, transactionHash, isTampered, tamperedPayload, calculatedHash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const pr of INITIAL_PROVENANCE_RECORDS) {
      insertProv.run(
        pr.id,
        pr.measurementId,
        pr.patientId,
        pr.patientName,
        pr.sensorId,
        pr.sensorType,
        pr.timestamp,
        pr.trustScore,
        pr.signalQuality,
        pr.processingDecision,
        JSON.stringify(pr.payload),
        pr.dataHash,
        pr.prevHash,
        pr.anchoringStatus,
        pr.blockHeight ?? null,
        pr.transactionHash ?? null,
        pr.isTampered ? 1 : 0,
        pr.tamperedPayload ? JSON.stringify(pr.tamperedPayload) : null,
        pr.calculatedHash ?? null
      );
    }

    // 5. Blockchain Events
    const insertEvent = this.db.prepare(`
      INSERT INTO blockchain_events (id, blockHeight, batchId, eventType, recordCount, recordIds, merkleRoot, prevBlockHash, transactionHash, timestamp, validatorConfirmations, gasOverheadUnits, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const ev of INITIAL_BLOCKCHAIN_EVENTS) {
      insertEvent.run(
        ev.id,
        ev.blockHeight,
        ev.batchId,
        ev.eventType,
        ev.recordCount,
        JSON.stringify(ev.recordIds),
        ev.merkleRoot,
        ev.prevBlockHash,
        ev.transactionHash,
        ev.timestamp,
        ev.validatorConfirmations,
        ev.gasOverheadUnits,
        ev.status
      );
    }

    // 6. Access Requests
    const insertAccess = this.db.prepare(`
      INSERT INTO access_requests (id, doctorId, doctorName, doctorSpecialty, patientId, patientName, categories, purpose, requestedDurationHours, status, requestedAt, decidedAt, expiresAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const ar of INITIAL_ACCESS_REQUESTS) {
      insertAccess.run(
        ar.id,
        ar.doctorId,
        ar.doctorName,
        ar.doctorSpecialty,
        ar.patientId,
        ar.patientName,
        JSON.stringify(ar.categories),
        ar.purpose,
        ar.requestedDurationHours,
        ar.status,
        ar.requestedAt,
        ar.decidedAt ?? null,
        ar.expiresAt ?? null
      );
    }

    // 7. Emergency Grants
    const insertEmg = this.db.prepare(`
      INSERT INTO emergency_grants (id, patientId, patientName, doctorId, doctorName, hospitalLocation, reason, dataScope, grantedAt, expiresAt, durationMinutes, status, supervisorNotified, auditTxHash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const eg of INITIAL_EMERGENCY_GRANTS) {
      insertEmg.run(
        eg.id,
        eg.patientId,
        eg.patientName,
        eg.doctorId,
        eg.doctorName,
        eg.hospitalLocation,
        eg.reason,
        JSON.stringify(eg.dataScope),
        eg.grantedAt,
        eg.expiresAt,
        eg.durationMinutes,
        eg.status,
        eg.supervisorNotified,
        eg.auditTxHash
      );
    }

    // 8. Audit Logs
    const insertLog = this.db.prepare(`
      INSERT INTO audit_logs (id, timestamp, actor, role, action, category, resource, outcome, severity, details, associatedRecordId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const al of INITIAL_AUDIT_LOGS) {
      insertLog.run(
        al.id,
        al.timestamp,
        al.actor,
        al.role,
        al.action,
        al.category,
        al.resource,
        al.outcome,
        al.severity,
        al.details,
        al.associatedRecordId ?? null
      );
    }

    // 9. System Config (Weights)
    const insertConfig = this.db.prepare(`
      INSERT INTO system_config (key, value) VALUES (?, ?)
    `);
    insertConfig.run('trust_weights', JSON.stringify(DEFAULT_TRUST_WEIGHTS));
    insertConfig.run('active_role', 'Doctor');
  }

  // --- Helper Methods ---

  public logAudit(entry: {
    actor: string;
    role: string;
    action: string;
    category: string;
    resource: string;
    outcome: string;
    severity: string;
    details: string;
    associatedRecordId?: string;
  }) {
    const id = `AUD-${Date.now().toString().slice(-6)}`;
    const timestamp = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO audit_logs (id, timestamp, actor, role, action, category, resource, outcome, severity, details, associatedRecordId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      timestamp,
      entry.actor,
      entry.role,
      entry.action,
      entry.category,
      entry.resource,
      entry.outcome,
      entry.severity,
      entry.details,
      entry.associatedRecordId ?? null
    );
  }
}

let instance: DatabaseService | null = null;
export function getDb(dbPath?: string): DatabaseService {
  if (dbPath) {
    return new DatabaseService(dbPath);
  }
  if (!instance) {
    instance = new DatabaseService();
  }
  return instance;
}
