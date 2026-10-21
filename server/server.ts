import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { DatabaseService, getDb } from './db';
import { canonicalStringify, sha256, buildMerkleTree, simulatePUFChallengeResponse } from './crypto';
import {
  evaluateMeasurementTrust,
  DEFAULT_TRUST_WEIGHTS,
  TrustWeights,
} from './trustEngine';

export function createServer(customDb?: DatabaseService) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const dbService = customDb || getDb();
  const db = dbService.db;

  // --- Health & System Stats ---
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'MEDGUARD Trust Gateway Engine',
      database: 'SQLite (ACID Relational Storage)',
      version: '2.4.0',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/stats', (req: Request, res: Response) => {
    const patientsRow = db.prepare('SELECT COUNT(*) as count FROM patients').get() as { count: number };
    const sensorsRow = db.prepare('SELECT COUNT(*) as count FROM sensors').get() as { count: number };
    const streamingSensorsRow = db.prepare("SELECT COUNT(*) as count FROM sensors WHERE deviceState = 'Streaming'").get() as { count: number };
    const measurementsRow = db.prepare('SELECT COUNT(*) as count FROM medical_measurements').get() as { count: number };
    const provenanceRow = db.prepare('SELECT COUNT(*) as count FROM provenance_records').get() as { count: number };
    const tamperedRow = db.prepare('SELECT COUNT(*) as count FROM provenance_records WHERE isTampered = 1').get() as { count: number };
    const blocksRow = db.prepare('SELECT MAX(blockHeight) as maxHeight, COUNT(*) as blockCount FROM blockchain_events').get() as { maxHeight: number; blockCount: number };
    const emergencyRow = db.prepare("SELECT COUNT(*) as count FROM emergency_grants WHERE status = 'Active'").get() as { count: number };
    const accessPendingRow = db.prepare("SELECT COUNT(*) as count FROM access_requests WHERE status = 'Pending'").get() as { count: number };
    const abnormalRow = db.prepare('SELECT COUNT(*) as count FROM medical_measurements WHERE isAbnormal = 1').get() as { count: number };

    const totalProv = Number(provenanceRow?.count || 0);
    const tampered = Number(tamperedRow?.count || 0);
    const integrityPercentage = totalProv > 0 ? Math.round(((totalProv - tampered) / totalProv) * 1000) / 10 : 100;

    res.json({
      patientCount: Number(patientsRow?.count || 0),
      sensorCount: Number(sensorsRow?.count || 0),
      activeSensors: Number(streamingSensorsRow?.count || 0),
      measurementCount: Number(measurementsRow?.count || 0),
      provenanceCount: totalProv,
      tamperedCount: tampered,
      databaseIntegrityPercentage: integrityPercentage,
      consortiumBlockHeight: Number(blocksRow?.maxHeight || 189422),
      blockCount: Number(blocksRow?.blockCount || 0),
      activeEmergencySessions: Number(emergencyRow?.count || 0),
      pendingAccessRequests: Number(accessPendingRow?.count || 0),
      abnormalReadingsCount: Number(abnormalRow?.count || 0),
      storageMismatches: tampered,
    });
  });

  // --- Patients API ---
  app.get('/api/patients', (req: Request, res: Response) => {
    const rows = db.prepare('SELECT * FROM patients ORDER BY id ASC').all() as any[];
    const patients = rows.map(r => ({
      ...r,
      assignedSensors: JSON.parse(r.assignedSensors || '[]'),
    }));
    res.json(patients);
  });

  app.get('/api/patients/:id', (req: Request, res: Response) => {
    const row = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id) as any;
    if (!row) {
      return res.status(404).json({ error: `Patient ${req.params.id} not found` });
    }
    res.json({
      ...row,
      assignedSensors: JSON.parse(row.assignedSensors || '[]'),
    });
  });

  app.post('/api/patients', (req: Request, res: Response) => {
    const { name, age, gender, bloodGroup, condition, ward, assignedSensors, notes } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Patient name is required' });
    }
    const ageNum = Number(age);
    if (!age || isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
      return res.status(400).json({ error: 'Age must be a valid number between 1 and 120' });
    }
    if (!condition || !condition.trim()) {
      return res.status(400).json({ error: 'Clinical condition is required' });
    }
    if (!ward || !ward.trim()) {
      return res.status(400).json({ error: 'Hospital ward is required' });
    }

    const newId = `PT-${Math.floor(1000 + Math.random() * 9000)}`;
    const timestamp = new Date().toISOString();
    const sensorsList = Array.isArray(assignedSensors) ? assignedSensors : [];

    db.prepare(`
      INSERT INTO patients (id, name, age, gender, bloodGroup, condition, ward, assignedSensors, monitoringStatus, latestTrustScore, latestMeasurementTime, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId,
      name.trim(),
      ageNum,
      gender || 'Male',
      bloodGroup || 'O+',
      condition.trim(),
      ward.trim(),
      JSON.stringify(sensorsList),
      'Active',
      95.0,
      timestamp,
      notes || 'Admitted for gateway telemetry monitoring.'
    );

    dbService.logAudit({
      actor: 'ADMIN-PORTAL',
      role: 'Admin',
      action: 'PATIENT_REGISTERED',
      category: 'Access Control',
      resource: newId,
      outcome: 'SUCCESS',
      severity: 'Low',
      details: `Enrolled patient ${name} (${newId}) into ${ward}`,
      associatedRecordId: newId,
    });

    const created = db.prepare('SELECT * FROM patients WHERE id = ?').get(newId) as any;
    res.status(201).json({
      ...created,
      assignedSensors: JSON.parse(created.assignedSensors),
    });
  });

  app.put('/api/patients/:id', (req: Request, res: Response) => {
    const existing = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id) as any;
    if (!existing) {
      return res.status(404).json({ error: `Patient ${req.params.id} not found` });
    }

    const { name, age, gender, bloodGroup, condition, ward, assignedSensors, monitoringStatus, notes } = req.body;
    db.prepare(`
      UPDATE patients
      SET name = COALESCE(?, name),
          age = COALESCE(?, age),
          gender = COALESCE(?, gender),
          bloodGroup = COALESCE(?, bloodGroup),
          condition = COALESCE(?, condition),
          ward = COALESCE(?, ward),
          assignedSensors = COALESCE(?, assignedSensors),
          monitoringStatus = COALESCE(?, monitoringStatus),
          notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(
      name,
      age ? Number(age) : null,
      gender,
      bloodGroup,
      condition,
      ward,
      assignedSensors ? JSON.stringify(assignedSensors) : null,
      monitoringStatus,
      notes,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id) as any;
    res.json({
      ...updated,
      assignedSensors: JSON.parse(updated.assignedSensors),
    });
  });

  app.delete('/api/patients/:id', (req: Request, res: Response) => {
    const existing = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: `Patient ${req.params.id} not found` });
    }
    db.prepare('DELETE FROM patients WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: `Patient ${req.params.id} removed` });
  });

  // --- Sensors API ---
  app.get('/api/sensors', (req: Request, res: Response) => {
    const rows = db.prepare('SELECT * FROM sensors ORDER BY id ASC').all();
    res.json(rows);
  });

  app.get('/api/sensors/:id', (req: Request, res: Response) => {
    const row = db.prepare('SELECT * FROM sensors WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ error: `Sensor ${req.params.id} not found` });
    }
    res.json(row);
  });

  app.post('/api/sensors', (req: Request, res: Response) => {
    const { type, patientId, patientName, hardwareFingerprint } = req.body;
    if (!type) {
      return res.status(400).json({ error: 'Sensor type is required' });
    }

    const typePrefix = type.includes('ECG') ? 'ECG' : type.includes('SpO2') ? 'SPO2' : type.includes('TEMP') ? 'TEMP' : 'SNR';
    const newId = `SNR-${typePrefix}-${Math.floor(10 + Math.random() * 90)}`;
    const timestamp = new Date().toISOString();
    const pufToken = hardwareFingerprint || `PUF-${typePrefix}-0x${Math.floor(Math.random() * 0xffffff).toString(16).toUpperCase()}`;

    db.prepare(`
      INSERT INTO sensors (id, type, patientId, patientName, hardwareFingerprint, authStatus, signalQuality, deviceTrust, batteryLevel, firmwareVersion, lastCommunication, deviceState)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId,
      type,
      patientId || 'PT-1042',
      patientName || 'Eleanor Vance',
      pufToken,
      'Authenticated',
      98,
      95,
      94,
      'v3.0.4',
      timestamp,
      'Streaming'
    );

    dbService.logAudit({
      actor: 'SYS-GATEWAY',
      role: 'System Gateway',
      action: 'SENSOR_PROVISIONED',
      category: 'Authentication',
      resource: newId,
      outcome: 'SUCCESS',
      severity: 'Low',
      details: `Provisioned hardware sensor ${newId} (${type}) with PUF token ${pufToken}`,
      associatedRecordId: newId,
    });

    const created = db.prepare('SELECT * FROM sensors WHERE id = ?').get(newId);
    res.status(201).json(created);
  });

  app.post('/api/sensors/:id/authenticate', async (req: Request, res: Response) => {
    const sensor = db.prepare('SELECT * FROM sensors WHERE id = ?').get(req.params.id) as any;
    if (!sensor) {
      return res.status(404).json({ error: `Sensor ${req.params.id} not found` });
    }

    const nonce = `NONCE-0x${Math.floor(Math.random() * 0xffffffff).toString(16)}`;
    const result = await simulatePUFChallengeResponse(sensor.hardwareFingerprint, nonce);

    if (result.success) {
      db.prepare(`
        UPDATE sensors
        SET authStatus = 'Authenticated',
            deviceState = 'Streaming',
            deviceTrust = MAX(90, deviceTrust),
            lastCommunication = ?
        WHERE id = ?
      `).run(new Date().toISOString(), sensor.id);

      dbService.logAudit({
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
      db.prepare(`
        UPDATE sensors
        SET authStatus = 'Failed Challenge',
            deviceState = 'Blocked',
            deviceTrust = 15,
            lastCommunication = ?
        WHERE id = ?
      `).run(new Date().toISOString(), sensor.id);

      dbService.logAudit({
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

    const updated = db.prepare('SELECT * FROM sensors WHERE id = ?').get(sensor.id);
    res.json({
      success: result.success,
      latencyMs: result.latencyMs,
      message: result.success ? 'Cryptographic hardware challenge succeeded' : 'Challenge failed - Hardware signature rejected',
      sensor: updated,
    });
  });

  app.post('/api/sensors/:id/quarantine', (req: Request, res: Response) => {
    const sensor = db.prepare('SELECT * FROM sensors WHERE id = ?').get(req.params.id) as any;
    if (!sensor) {
      return res.status(404).json({ error: `Sensor ${req.params.id} not found` });
    }

    db.prepare(`
      UPDATE sensors
      SET authStatus = 'Quarantined',
          deviceState = 'Blocked',
          deviceTrust = 10,
          lastCommunication = ?
      WHERE id = ?
    `).run(new Date().toISOString(), sensor.id);

    dbService.logAudit({
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

    const updated = db.prepare('SELECT * FROM sensors WHERE id = ?').get(sensor.id);
    res.json({ success: true, sensor: updated });
  });

  // --- Telemetry & Measurements API ---
  app.get('/api/measurements', (req: Request, res: Response) => {
    const { patientId, limit } = req.query;
    let query = 'SELECT * FROM medical_measurements';
    const params: any[] = [];
    if (patientId) {
      query += ' WHERE patientId = ?';
      params.push(patientId);
    }
    query += ' ORDER BY timestamp DESC';
    if (limit) {
      query += ' LIMIT ?';
      params.push(Number(limit));
    }
    const rows = db.prepare(query).all(...params);
    res.json(rows.map((r: any) => ({ ...r, isAbnormal: Boolean(r.isAbnormal) })));
  });

  app.post('/api/measurements', async (req: Request, res: Response) => {
    const {
      patientId,
      sensorId,
      heartRate,
      spo2,
      systolicBP,
      diastolicBP,
      respirationRate,
      temperature,
      signalQuality,
      isAbnormal,
      anomalyNotes,
      rawDataSummary,
    } = req.body;

    if (!patientId || !sensorId) {
      return res.status(400).json({ error: 'patientId and sensorId are required' });
    }

    const timestamp = new Date().toISOString();
    const newMeasId = `MEAS-${Date.now().toString().slice(-6)}`;

    // Get sensor & patient
    let sensor = db.prepare('SELECT * FROM sensors WHERE id = ?').get(sensorId) as any;
    if (!sensor) {
      sensor = {
        id: sensorId,
        type: '12-Lead ECG',
        hardwareFingerprint: 'PUF-SIM-DYNAMIC',
        authStatus: 'Authenticated',
        deviceTrust: 95,
        signalQuality: signalQuality || 95,
      };
    }
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId) as any;
    const prevMeas = db.prepare('SELECT * FROM medical_measurements WHERE patientId = ? ORDER BY timestamp DESC LIMIT 1').get(patientId) as any;

    // Get current trust weights from config
    const weightsRow = db.prepare("SELECT value FROM system_config WHERE key = 'trust_weights'").get() as any;
    const customWeights: TrustWeights = weightsRow ? JSON.parse(weightsRow.value) : DEFAULT_TRUST_WEIGHTS;

    // Count recent anomalies for this patient
    const recentAnomalies = db.prepare(`
      SELECT COUNT(*) as count FROM medical_measurements
      WHERE patientId = ? AND isAbnormal = 1 AND timestamp > datetime('now', '-5 minutes')
    `).get(patientId) as { count: number };

    const measurementInput = {
      id: newMeasId,
      patientId,
      sensorId,
      timestamp,
      heartRate: Number(heartRate || 72),
      spo2: Number(spo2 || 98),
      systolicBP: Number(systolicBP || 120),
      diastolicBP: Number(diastolicBP || 80),
      respirationRate: Number(respirationRate || 16),
      temperature: Number(temperature || 36.8),
      signalQuality: Number(signalQuality !== undefined ? signalQuality : 95),
      isAbnormal: Boolean(isAbnormal),
      anomalyNotes: anomalyNotes || '',
      rawDataSummary: rawDataSummary || `Telemetry packet verified by ${sensorId}`,
    };

    // Trust evaluation
    const evalResult = evaluateMeasurementTrust(
      measurementInput,
      sensor,
      patient,
      prevMeas,
      customWeights,
      Number(recentAnomalies?.count || 0)
    );

    // Insert measurement
    db.prepare(`
      INSERT INTO medical_measurements (id, patientId, sensorId, timestamp, heartRate, spo2, systolicBP, diastolicBP, respirationRate, temperature, signalQuality, isAbnormal, anomalyNotes, rawDataSummary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newMeasId,
      patientId,
      sensorId,
      timestamp,
      measurementInput.heartRate,
      measurementInput.spo2,
      measurementInput.systolicBP,
      measurementInput.diastolicBP,
      measurementInput.respirationRate,
      measurementInput.temperature,
      measurementInput.signalQuality,
      measurementInput.isAbnormal ? 1 : 0,
      measurementInput.anomalyNotes,
      measurementInput.rawDataSummary
    );

    // Insert trust evaluation
    const tevId = `TEV-${Date.now().toString().slice(-6)}`;
    db.prepare(`
      INSERT INTO trust_evaluations (id, measurementId, patientId, sensorId, timestamp, dt, sq, av, tc, ph, mdts, weights, decision, decisionRationale)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tevId,
      newMeasId,
      patientId,
      sensorId,
      timestamp,
      evalResult.dt,
      evalResult.sq,
      evalResult.av,
      evalResult.tc,
      evalResult.ph,
      evalResult.mdts,
      JSON.stringify(evalResult.weights),
      evalResult.decision,
      evalResult.decisionRationale
    );

    // Update patient
    if (patient) {
      const newStatus = measurementInput.isAbnormal ? 'Critical' : patient.monitoringStatus;
      db.prepare(`
        UPDATE patients
        SET latestTrustScore = ?,
            latestMeasurementTime = ?,
            monitoringStatus = ?
        WHERE id = ?
      `).run(evalResult.mdts, timestamp, newStatus, patientId);
    }

    // Build Provenance Record with real SHA-256
    const latestProv = db.prepare('SELECT dataHash FROM provenance_records ORDER BY timestamp DESC LIMIT 1').get() as { dataHash: string } | undefined;
    const prevHash = latestProv?.dataHash || '0000000000000000000000000000000000000000000000000000000000000000';

    const payload = {
      measurementId: newMeasId,
      patientId,
      sensorId,
      timestamp,
      clinicalRecord: {
        diagnosticObservation: measurementInput.isAbnormal ? 'Acute Anomaly Flagged' : 'Electronic Health Ingestion',
        readingType: 'Verified IoT Telemetry',
        vitals: {
          heartRate: measurementInput.heartRate,
          spo2: measurementInput.spo2,
          bp: `${measurementInput.systolicBP}/${measurementInput.diastolicBP}`,
        },
      },
      trustScore: evalResult.mdts,
      signalQuality: measurementInput.signalQuality,
      decision: evalResult.decision,
      pufSignature: `SIG_${(sensor.hardwareFingerprint || 'GENERIC').slice(0, 12)}_VALID`,
    };

    const rawCanonical = canonicalStringify(payload);
    const dataHash = sha256(rawCanonical);

    const isPriority = evalResult.decision === 'Repeated Anomaly - Immediate Anchor' || evalResult.decision === 'Abnormal - Raw Preserve & Alert';
    const provId = `PRV-${Date.now().toString().slice(-6)}`;

    const maxBlockRow = db.prepare('SELECT MAX(blockHeight) as maxHeight FROM blockchain_events').get() as { maxHeight: number };
    const currentHeight = Number(maxBlockRow?.maxHeight || 189422);
    const assignedBlockHeight = isPriority ? currentHeight + 1 : null;
    const assignedTxHash = isPriority ? `0x${dataHash.slice(0, 32)}` : null;

    db.prepare(`
      INSERT INTO provenance_records (id, measurementId, patientId, patientName, sensorId, sensorType, timestamp, trustScore, signalQuality, processingDecision, payload, dataHash, prevHash, anchoringStatus, blockHeight, transactionHash, isTampered)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      provId,
      newMeasId,
      patientId,
      patient ? patient.name : 'Unknown',
      sensorId,
      sensor.type,
      timestamp,
      evalResult.mdts,
      measurementInput.signalQuality,
      evalResult.decision,
      JSON.stringify(payload),
      dataHash,
      prevHash,
      isPriority ? 'Priority Anchored' : 'Pending Batch',
      assignedBlockHeight,
      assignedTxHash
    );

    let priorityBlock = null;
    if (isPriority) {
      const bchId = `BCH-EVT-${Date.now().toString().slice(-4)}`;
      db.prepare(`
        INSERT INTO blockchain_events (id, blockHeight, batchId, eventType, recordCount, recordIds, merkleRoot, prevBlockHash, transactionHash, timestamp, validatorConfirmations, gasOverheadUnits, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        bchId,
        assignedBlockHeight,
        `PRIORITY-${newMeasId}`,
        'Emergency Priority Anchor',
        1,
        JSON.stringify([provId]),
        dataHash,
        latestProv?.dataHash || '0x000',
        assignedTxHash,
        timestamp,
        5,
        36000,
        'Confirmed'
      );
      priorityBlock = db.prepare('SELECT * FROM blockchain_events WHERE id = ?').get(bchId);
    }

    dbService.logAudit({
      actor: sensorId,
      role: 'Hardware Sensor',
      action: isPriority ? 'CRITICAL_MEASUREMENT_ANCHORED' : 'MEASUREMENT_RECORDED',
      category: isPriority ? 'Emergency' : 'Telemetry',
      resource: newMeasId,
      outcome: isPriority ? 'ALERT' : 'SUCCESS',
      severity: isPriority ? 'High' : 'Low',
      details: `${isPriority ? 'Abnormal reading flagged.' : 'Standard telemetry processed.'} MDTS: ${evalResult.mdts}/100. Hash: ${dataHash.slice(0, 16)}...`,
      associatedRecordId: provId,
    });

    res.status(201).json({
      measurement: measurementInput,
      evaluation: { id: tevId, ...evalResult },
      provenance: {
        id: provId,
        measurementId: newMeasId,
        patientId,
        patientName: patient?.name || 'Unknown',
        sensorId,
        sensorType: sensor.type,
        timestamp,
        trustScore: evalResult.mdts,
        signalQuality: measurementInput.signalQuality,
        processingDecision: evalResult.decision,
        payload,
        dataHash,
        prevHash,
        anchoringStatus: isPriority ? 'Priority Anchored' : 'Pending Batch',
        blockHeight: assignedBlockHeight,
        transactionHash: assignedTxHash,
      },
      priorityBlock,
    });
  });

  // --- Provenance & Tamper Demonstration API ---
  app.get('/api/provenance', (req: Request, res: Response) => {
    const rows = db.prepare('SELECT * FROM provenance_records ORDER BY timestamp DESC').all() as any[];
    const records = rows.map(r => ({
      ...r,
      isTampered: Boolean(r.isTampered),
      payload: JSON.parse(r.payload || '{}'),
      tamperedPayload: r.tamperedPayload ? JSON.parse(r.tamperedPayload) : undefined,
    }));
    res.json(records);
  });

  app.get('/api/provenance/:id', (req: Request, res: Response) => {
    const row = db.prepare('SELECT * FROM provenance_records WHERE id = ?').get(req.params.id) as any;
    if (!row) {
      return res.status(404).json({ error: `Provenance record ${req.params.id} not found` });
    }
    res.json({
      ...row,
      isTampered: Boolean(row.isTampered),
      payload: JSON.parse(row.payload || '{}'),
      tamperedPayload: row.tamperedPayload ? JSON.parse(row.tamperedPayload) : undefined,
    });
  });

  app.post('/api/provenance/:id/verify', (req: Request, res: Response) => {
    const row = db.prepare('SELECT * FROM provenance_records WHERE id = ?').get(req.params.id) as any;
    if (!row) {
      return res.status(404).json({ error: `Provenance record ${req.params.id} not found` });
    }

    const payloadObj = row.isTampered && row.tamperedPayload ? JSON.parse(row.tamperedPayload) : JSON.parse(row.payload);
    const computedHash = sha256(canonicalStringify(payloadObj));
    const isValid = computedHash === row.dataHash;

    res.json({
      isValid,
      computedHash,
      expectedHash: row.dataHash,
      isTampered: Boolean(row.isTampered),
    });
  });

  app.post('/api/provenance/:id/tamper', (req: Request, res: Response) => {
    const row = db.prepare('SELECT * FROM provenance_records WHERE id = ?').get(req.params.id) as any;
    if (!row) {
      return res.status(404).json({ error: `Provenance record ${req.params.id} not found` });
    }

    const { field = 'prescription', value = 'Aspirin 500 mg Daily (Overdose Tampered!)' } = req.body;
    const payload = JSON.parse(row.payload);
    const tamperedPayload = JSON.parse(JSON.stringify(payload));

    if (tamperedPayload.clinicalRecord) {
      tamperedPayload.clinicalRecord[field] = value;
    } else {
      tamperedPayload[field] = value;
    }

    const computedHash = sha256(canonicalStringify(tamperedPayload));

    db.prepare(`
      UPDATE provenance_records
      SET isTampered = 1,
          tamperedPayload = ?,
          calculatedHash = ?
      WHERE id = ?
    `).run(JSON.stringify(tamperedPayload), computedHash, row.id);

    dbService.logAudit({
      actor: 'SECURITY-AUDIT-TESTER',
      role: 'Auditor',
      action: 'DATA_TAMPERING_SIMULATED',
      category: 'Security Incident',
      resource: row.id,
      outcome: 'ALERT',
      severity: 'Critical',
      details: `Simulated unauthorized modification on ${row.id} (${field} altered). Cryptographic verification fails!`,
      associatedRecordId: row.id,
    });

    const updated = db.prepare('SELECT * FROM provenance_records WHERE id = ?').get(row.id) as any;
    res.json({
      record: {
        ...updated,
        isTampered: true,
        payload: JSON.parse(updated.payload),
        tamperedPayload,
      },
      computedHash,
    });
  });

  app.post('/api/provenance/:id/restore', (req: Request, res: Response) => {
    const row = db.prepare('SELECT * FROM provenance_records WHERE id = ?').get(req.params.id) as any;
    if (!row) {
      return res.status(404).json({ error: `Provenance record ${req.params.id} not found` });
    }

    db.prepare(`
      UPDATE provenance_records
      SET isTampered = 0,
          tamperedPayload = NULL,
          calculatedHash = NULL
      WHERE id = ?
    `).run(row.id);

    dbService.logAudit({
      actor: 'SECURITY-AUDIT-TESTER',
      role: 'Auditor',
      action: 'DATA_INTEGRITY_RESTORED',
      category: 'Security Incident',
      resource: row.id,
      outcome: 'SUCCESS',
      severity: 'Low',
      details: `Restored authentic payload for ${row.id}. Hash matching confirmed.`,
      associatedRecordId: row.id,
    });

    const updated = db.prepare('SELECT * FROM provenance_records WHERE id = ?').get(row.id) as any;
    res.json({
      record: {
        ...updated,
        isTampered: false,
        payload: JSON.parse(updated.payload),
        tamperedPayload: undefined,
      },
      originalHash: updated.dataHash,
    });
  });

  // --- Blockchain & Merkle Tree API ---
  app.get('/api/blockchain', (req: Request, res: Response) => {
    const rows = db.prepare('SELECT * FROM blockchain_events ORDER BY blockHeight DESC').all() as any[];
    res.json(rows.map(r => ({
      ...r,
      recordIds: JSON.parse(r.recordIds || '[]'),
    })));
  });

  app.get('/api/blockchain/blocks', (req: Request, res: Response) => {
    const rows = db.prepare('SELECT * FROM blockchain_events ORDER BY blockHeight DESC').all() as any[];
    res.json(rows.map(r => ({
      ...r,
      recordIds: JSON.parse(r.recordIds || '[]'),
    })));
  });

  app.post('/api/blockchain/anchor', (req: Request, res: Response) => {
    const pendingRows = db.prepare("SELECT * FROM provenance_records WHERE anchoringStatus = 'Pending Batch'").all() as any[];
    let targetRecords = pendingRows;
    if (targetRecords.length === 0) {
      targetRecords = db.prepare('SELECT * FROM provenance_records ORDER BY timestamp DESC LIMIT 4').all() as any[];
    }

    const hashes = targetRecords.map(r => r.dataHash);
    const merkleResult = buildMerkleTree(hashes);

    const latestRow = db.prepare('SELECT MAX(blockHeight) as maxHeight, merkleRoot FROM blockchain_events').get() as any;
    const nextBlock = (Number(latestRow?.maxHeight) || 189422) + 1;
    const batchId = `BATCH-${new Date().toISOString().slice(0, 10)}-${Math.floor(100 + Math.random() * 900)}`;
    const txHash = `0x${merkleResult.root.slice(0, 32)}`;
    const eventId = `BCH-EVT-${Date.now().toString().slice(-4)}`;
    const timestamp = new Date().toISOString();

    db.prepare(`
      INSERT INTO blockchain_events (id, blockHeight, batchId, eventType, recordCount, recordIds, merkleRoot, prevBlockHash, transactionHash, timestamp, validatorConfirmations, gasOverheadUnits, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventId,
      nextBlock,
      batchId,
      'Periodic Rollup',
      hashes.length,
      JSON.stringify(targetRecords.map(r => r.id)),
      merkleResult.root,
      latestRow?.merkleRoot || '0x000',
      txHash,
      timestamp,
      5,
      62000,
      'Confirmed'
    );

    // Update pending records
    for (const r of targetRecords) {
      db.prepare(`
        UPDATE provenance_records
        SET anchoringStatus = 'Anchored',
            blockHeight = ?,
            transactionHash = ?
        WHERE id = ?
      `).run(nextBlock, txHash, r.id);
    }

    dbService.logAudit({
      actor: 'GW-ANCHORING-WORKER',
      role: 'System Gateway',
      action: 'BATCH_MERKLE_ROOT_ANCHORED',
      category: 'Blockchain',
      resource: `BLOCK #${nextBlock}`,
      outcome: 'SUCCESS',
      severity: 'Low',
      details: `Anchored batch ${batchId} (${hashes.length} records) to Block #${nextBlock}. Merkle Root: ${merkleResult.root.slice(0, 16)}...`,
      associatedRecordId: eventId,
    });

    const createdEvent = db.prepare('SELECT * FROM blockchain_events WHERE id = ?').get(eventId) as any;
    res.status(201).json({
      block: {
        ...createdEvent,
        recordIds: JSON.parse(createdEvent.recordIds),
      },
      merkleTree: merkleResult,
    });
  });

  app.get('/api/blockchain/merkle-tree', (req: Request, res: Response) => {
    const records = db.prepare('SELECT id, dataHash, patientName, sensorType FROM provenance_records ORDER BY timestamp DESC LIMIT 4').all() as any[];
    const hashes = records.map(r => r.dataHash);
    const tree = buildMerkleTree(hashes);
    res.json({
      tree,
      leaves: records.map(r => ({
        id: r.id,
        label: `${r.sensorType} Telemetry (${r.patientName})`,
        hash: r.dataHash,
      })),
    });
  });

  // --- Trust Engine Config & Calculation API ---
  app.get('/api/trust/weights', (req: Request, res: Response) => {
    const row = db.prepare("SELECT value FROM system_config WHERE key = 'trust_weights'").get() as any;
    res.json(row ? JSON.parse(row.value) : DEFAULT_TRUST_WEIGHTS);
  });

  app.put('/api/trust/weights', (req: Request, res: Response) => {
    const { dt, sq, av, tc, ph } = req.body;
    if ([dt, sq, av, tc, ph].some(v => typeof v !== 'number' || v < 0)) {
      return res.status(400).json({ error: 'All 5 weights (dt, sq, av, tc, ph) must be non-negative numbers' });
    }

    const total = dt + sq + av + tc + ph;
    if (Math.abs(total - 1.0) > 0.05) {
      return res.status(400).json({ error: `Weights must sum to 1.0 (current sum: ${total.toFixed(2)})` });
    }

    const newWeights: TrustWeights = { dt, sq, av, tc, ph };
    db.prepare("INSERT OR REPLACE INTO system_config (key, value) VALUES ('trust_weights', ?)").run(JSON.stringify(newWeights));

    dbService.logAudit({
      actor: 'ADMIN-SECURITY',
      role: 'Admin',
      action: 'TRUST_WEIGHTS_UPDATED',
      category: 'Authentication',
      resource: 'MDTS_WEIGHTS',
      outcome: 'SUCCESS',
      severity: 'Medium',
      details: `Updated trust scoring weights: DT=${dt}, SQ=${sq}, AV=${av}, TC=${tc}, PH=${ph}`,
    });

    res.json(newWeights);
  });

  app.post('/api/trust/calculate', (req: Request, res: Response) => {
    const { dt, sq, av, tc, ph } = req.body;
    const weightsRow = db.prepare("SELECT value FROM system_config WHERE key = 'trust_weights'").get() as any;
    const weights: TrustWeights = weightsRow ? JSON.parse(weightsRow.value) : DEFAULT_TRUST_WEIGHTS;

    const v_dt = Number(dt ?? 95);
    const v_sq = Number(sq ?? 98);
    const v_av = Number(av ?? 92);
    const v_tc = Number(tc ?? 94);
    const v_ph = Number(ph ?? 96);

    const finalMDTS = Math.round((v_dt * weights.dt + v_sq * weights.sq + v_av * weights.av + v_tc * weights.tc + v_ph * weights.ph) * 10) / 10;

    let decision = 'Normal Data - Compress & Anchor to Blockchain';
    let alertLevel = 'success';

    if (v_dt < 50) {
      decision = 'Unauthorized Sensor - Block Transmission';
      alertLevel = 'danger';
    } else if (v_sq < 65) {
      decision = 'Poor Signal Quality - Request Reacquisition';
      alertLevel = 'warning';
    } else if (v_av < 60) {
      decision = 'Abnormal Reading - Preserve Raw Data & Alert Doctor';
      alertLevel = 'danger';
    }

    res.json({
      mdts: finalMDTS,
      decision,
      alertLevel,
      weights,
      parameters: { dt: v_dt, sq: v_sq, av: v_av, tc: v_tc, ph: v_ph },
    });
  });

  // --- Access Control API ---
  app.get('/api/access-requests', (req: Request, res: Response) => {
    const rows = db.prepare('SELECT * FROM access_requests ORDER BY requestedAt DESC').all() as any[];
    res.json(rows.map(r => ({
      ...r,
      categories: JSON.parse(r.categories || '[]'),
    })));
  });

  app.post('/api/access-requests', (req: Request, res: Response) => {
    const { doctorId, doctorName, doctorSpecialty, patientId, patientName, categories, purpose, requestedDurationHours } = req.body;
    if (!doctorId || !doctorName) {
      return res.status(400).json({ error: 'doctorId and doctorName are required' });
    }
    if (!patientId) {
      return res.status(400).json({ error: 'patientId is required' });
    }
    if (!purpose || !purpose.trim()) {
      return res.status(400).json({ error: 'Clinical purpose justification is required' });
    }

    const newId = `REQ-${Math.floor(4000 + Math.random() * 1000)}`;
    const requestedAt = new Date().toISOString();
    const duration = Number(requestedDurationHours || 24);
    const cats = Array.isArray(categories) && categories.length > 0 ? categories : ['Clinical Prescription Ledger'];

    db.prepare(`
      INSERT INTO access_requests (id, doctorId, doctorName, doctorSpecialty, patientId, patientName, categories, purpose, requestedDurationHours, status, requestedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId,
      doctorId,
      doctorName,
      doctorSpecialty || 'Attending Physician',
      patientId,
      patientName || 'Eleanor Vance',
      JSON.stringify(cats),
      purpose.trim(),
      duration,
      'Pending',
      requestedAt
    );

    dbService.logAudit({
      actor: doctorId,
      role: 'Doctor',
      action: 'ACCESS_REQUEST_FILED',
      category: 'Access Control',
      resource: newId,
      outcome: 'SUCCESS',
      severity: 'Low',
      details: `${doctorName} requested ${duration}h access to ${patientName}'s telemetry. Purpose: ${purpose}`,
      associatedRecordId: newId,
    });

    const created = db.prepare('SELECT * FROM access_requests WHERE id = ?').get(newId) as any;
    res.status(201).json({
      ...created,
      categories: JSON.parse(created.categories),
    });
  });

  app.put('/api/access-requests/:id/approve', (req: Request, res: Response) => {
    const row = db.prepare('SELECT * FROM access_requests WHERE id = ?').get(req.params.id) as any;
    if (!row) {
      return res.status(404).json({ error: `Access request ${req.params.id} not found` });
    }

    const now = new Date();
    const expires = new Date(now.getTime() + (row.requestedDurationHours || 24) * 3600 * 1000);

    db.prepare(`
      UPDATE access_requests
      SET status = 'Approved',
          decidedAt = ?,
          expiresAt = ?
      WHERE id = ?
    `).run(now.toISOString(), expires.toISOString(), row.id);

    dbService.logAudit({
      actor: 'ADMIN-CONSENT-DESK',
      role: 'Admin',
      action: 'ACCESS_REQUEST_APPROVED',
      category: 'Access Control',
      resource: row.id,
      outcome: 'SUCCESS',
      severity: 'Low',
      details: `Approved telemetry access for ${row.doctorName} until ${expires.toLocaleTimeString()}`,
      associatedRecordId: row.id,
    });

    const updated = db.prepare('SELECT * FROM access_requests WHERE id = ?').get(row.id) as any;
    res.json({
      ...updated,
      categories: JSON.parse(updated.categories),
    });
  });

  app.put('/api/access-requests/:id/reject', (req: Request, res: Response) => {
    const row = db.prepare('SELECT * FROM access_requests WHERE id = ?').get(req.params.id) as any;
    if (!row) {
      return res.status(404).json({ error: `Access request ${req.params.id} not found` });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE access_requests
      SET status = 'Rejected',
          decidedAt = ?
      WHERE id = ?
    `).run(now, row.id);

    dbService.logAudit({
      actor: 'ADMIN-CONSENT-DESK',
      role: 'Admin',
      action: 'ACCESS_REQUEST_REJECTED',
      category: 'Access Control',
      resource: row.id,
      outcome: 'WARNING',
      severity: 'Medium',
      details: `Rejected access request ${row.id} filed by ${row.doctorName}`,
      associatedRecordId: row.id,
    });

    const updated = db.prepare('SELECT * FROM access_requests WHERE id = ?').get(row.id) as any;
    res.json({
      ...updated,
      categories: JSON.parse(updated.categories),
    });
  });

  app.patch('/api/access-requests/:id', (req: Request, res: Response) => {
    const row = db.prepare('SELECT * FROM access_requests WHERE id = ?').get(req.params.id) as any;
    if (!row) {
      return res.status(404).json({ error: `Access request ${req.params.id} not found` });
    }

    const { status = 'Approved', reviewNotes } = req.body;
    const now = new Date();
    const expires = status === 'Approved' ? new Date(now.getTime() + (row.requestedDurationHours || 24) * 3600 * 1000).toISOString() : row.expiresAt;

    db.prepare(`
      UPDATE access_requests
      SET status = ?,
          decidedAt = ?,
          expiresAt = ?
      WHERE id = ?
    `).run(status, now.toISOString(), expires, row.id);

    dbService.logAudit({
      actor: 'ADMIN-CONSENT-DESK',
      role: 'Admin',
      action: `ACCESS_REQUEST_${status.toUpperCase()}`,
      category: 'Access Control',
      resource: row.id,
      outcome: status === 'Approved' ? 'SUCCESS' : 'WARNING',
      severity: 'Medium',
      details: `Updated request ${row.id} status to ${status}. Notes: ${reviewNotes || 'None'}`,
      associatedRecordId: row.id,
    });

    const updated = db.prepare('SELECT * FROM access_requests WHERE id = ?').get(row.id) as any;
    res.json({
      ...updated,
      categories: JSON.parse(updated.categories),
    });
  });

  app.put('/api/access-requests/:id/revoke', (req: Request, res: Response) => {
    const row = db.prepare('SELECT * FROM access_requests WHERE id = ?').get(req.params.id) as any;
    if (!row) {
      return res.status(404).json({ error: `Access request ${req.params.id} not found` });
    }

    db.prepare("UPDATE access_requests SET status = 'Revoked' WHERE id = ?").run(row.id);

    dbService.logAudit({
      actor: 'ADMIN-CONSENT-DESK',
      role: 'Admin',
      action: 'ACCESS_PERMISSION_REVOKED',
      category: 'Access Control',
      resource: row.id,
      outcome: 'WARNING',
      severity: 'Medium',
      details: `Revoked active access grant for ${row.doctorName}`,
      associatedRecordId: row.id,
    });

    const updated = db.prepare('SELECT * FROM access_requests WHERE id = ?').get(row.id) as any;
    res.json({
      ...updated,
      categories: JSON.parse(updated.categories),
    });
  });

  // --- Emergency Access (Break-Glass) API ---
  app.get('/api/emergency-grants', (req: Request, res: Response) => {
    const rows = db.prepare('SELECT * FROM emergency_grants ORDER BY grantedAt DESC').all() as any[];
    res.json(rows.map(r => ({
      ...r,
      dataScope: JSON.parse(r.dataScope || '[]'),
    })));
  });

  app.post('/api/emergency-grants', (req: Request, res: Response) => {
    const { patientId, patientName, doctorId, doctorName, hospitalLocation, reason, dataScope, durationMinutes, supervisorNotified } = req.body;
    if (!patientId) {
      return res.status(400).json({ error: 'patientId is required' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Clinical emergency justification is mandatory' });
    }

    const duration = Number(durationMinutes || 30);
    const newId = `EMG-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const grantedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + duration * 60 * 1000).toISOString();
    const auditTxHash = `0x${sha256(`${newId}:${patientId}:${doctorId}:${grantedAt}:BREAK_GLASS`).slice(0, 32)}`;
    const scope = Array.isArray(dataScope) ? dataScope : ['Emergency Medical History', 'Prescription Ledger Override'];

    db.prepare(`
      INSERT INTO emergency_grants (id, patientId, patientName, doctorId, doctorName, hospitalLocation, reason, dataScope, grantedAt, expiresAt, durationMinutes, status, supervisorNotified, auditTxHash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId,
      patientId,
      patientName || 'David K. O\'Connor',
      doctorId || 'DR-999',
      doctorName || 'Dr. Alexander Vance',
      hospitalLocation || 'Academic Trauma Center - Resuscitation Bay 1',
      reason.trim(),
      JSON.stringify(scope),
      grantedAt,
      expiresAt,
      duration,
      'Active',
      supervisorNotified || 'Chief Medical Officer / ER Attending on call',
      auditTxHash
    );

    dbService.logAudit({
      actor: `${doctorId || 'DR-999'} ${doctorName || 'Dr. Alexander Vance'}`,
      role: 'Doctor',
      action: 'EMERGENCY_BREAK_GLASS_TRIGGERED',
      category: 'Emergency',
      resource: `${patientId} Gateway`,
      outcome: 'ALERT',
      severity: 'Critical',
      details: `CRITICAL BREAK-GLASS ACCESS GRANTED for ${duration} min. Clinical justification: "${reason.trim()}". Supervisor notified: ${supervisorNotified}. Hash: ${auditTxHash}`,
      associatedRecordId: newId,
    });

    const created = db.prepare('SELECT * FROM emergency_grants WHERE id = ?').get(newId) as any;
    res.status(201).json({
      ...created,
      dataScope: JSON.parse(created.dataScope),
    });
  });

  const handleTerminateGrant = (req: Request, res: Response) => {
    const row = db.prepare('SELECT * FROM emergency_grants WHERE id = ?').get(req.params.id) as any;
    if (!row) {
      return res.status(404).json({ error: `Emergency grant ${req.params.id} not found` });
    }

    db.prepare("UPDATE emergency_grants SET status = 'Revoked' WHERE id = ?").run(row.id);

    dbService.logAudit({
      actor: 'SOC-CHIEF-ADMIN',
      role: 'Admin',
      action: 'EMERGENCY_ACCESS_TERMINATED',
      category: 'Emergency',
      resource: row.id,
      outcome: 'WARNING',
      severity: 'High',
      details: `Terminated emergency access session ${row.id} for ${row.doctorName}. Access channels closed.`,
      associatedRecordId: row.id,
    });

    const updated = db.prepare('SELECT * FROM emergency_grants WHERE id = ?').get(row.id) as any;
    res.json({
      ...updated,
      dataScope: JSON.parse(updated.dataScope),
    });
  };

  app.put('/api/emergency-grants/:id/terminate', handleTerminateGrant);
  app.post('/api/emergency-grants/:id/terminate', handleTerminateGrant);

  // --- System Audit Ledger API ---
  app.get('/api/audit-logs', (req: Request, res: Response) => {
    const { search, category, severity, limit = 100 } = req.query;
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];

    if (category && category !== 'ALL') {
      query += ' AND category = ?';
      params.push(category);
    }
    if (severity && severity !== 'ALL') {
      query += ' AND severity = ?';
      params.push(severity);
    }
    if (search && typeof search === 'string' && search.trim()) {
      query += ' AND (actor LIKE ? OR action LIKE ? OR resource LIKE ? OR details LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(Number(limit));

    const rows = db.prepare(query).all(...params);
    res.json(rows);
  });

  app.post('/api/audit-logs', (req: Request, res: Response) => {
    const { actor, role, action, category, resource, outcome, severity, details, associatedRecordId } = req.body;
    if (!actor || !action) {
      return res.status(400).json({ error: 'actor and action are required' });
    }

    dbService.logAudit({
      actor,
      role: role || 'System Gateway',
      action,
      category: category || 'Security Incident',
      resource: resource || 'GATEWAY',
      outcome: outcome || 'SUCCESS',
      severity: severity || 'Low',
      details: details || 'Manual audit entry created',
      associatedRecordId,
    });

    const created = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 1').get();
    res.status(201).json(created);
  });

  // --- Reset System Baseline ---
  app.post('/api/system/reset', (req: Request, res: Response) => {
    dbService.resetData();
    res.json({
      success: true,
      message: 'Database reset to default authentic baseline state.',
    });
  });

  // --- Global 404 & Error Handler ---
  app.use('/api', (req: Request, res: Response) => {
    res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
  });

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('API Error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  });

  return app;
}
