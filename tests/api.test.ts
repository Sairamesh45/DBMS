import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createServer } from '../server/server';
import { DatabaseService } from '../server/db';
import { canonicalStringify, sha256, buildMerkleTree, simulatePUFChallengeResponse } from '../server/crypto';
import { evaluateMeasurementTrust, DEFAULT_TRUST_WEIGHTS } from '../server/trustEngine';

describe('MEDGUARD Trust Gateway & Cryptographic Engine', () => {
  let dbService: DatabaseService;
  let app: ReturnType<typeof createServer>;

  beforeEach(() => {
    // Isolated in-memory SQLite database for deterministic, non-destructive testing
    dbService = new DatabaseService(':memory:');
    app = createServer(dbService);
  });

  describe('1. Cryptographic Primitive Suite', () => {
    it('canonicalStringify produces deterministic, key-sorted JSON regardless of insertion order', () => {
      const objA = { z: 1, a: 'hello', m: [3, 2, 1] };
      const objB = { a: 'hello', m: [3, 2, 1], z: 1 };
      expect(canonicalStringify(objA)).toEqual(canonicalStringify(objB));
    });

    it('sha256 generates a valid 64-character hexadecimal digest', () => {
      const hash = sha256('MEDGUARD_ACADEMIC_TEST_PAYLOAD');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      // Deterministic check
      expect(sha256('MEDGUARD_ACADEMIC_TEST_PAYLOAD')).toBe(hash);
    });

    it('buildMerkleTree constructs a valid tree and cryptographic root', () => {
      const leaves = [
        sha256('leaf-1'),
        sha256('leaf-2'),
        sha256('leaf-3'),
        sha256('leaf-4'),
      ];
      const tree = buildMerkleTree(leaves);
      expect(tree.root).toBeDefined();
      expect(tree.root).toHaveLength(64);
      expect(tree.leaves.length).toBe(4);
      expect(tree.layers.length).toBeGreaterThanOrEqual(2);
    });

    it('simulatePUFChallengeResponse accepts authentic challenges and produces verification signature', async () => {
      const fingerprint = 'PUF-TOKEN-TEST-0x8892A';
      const nonce = 'NONCE_VERIFY_99482';
      const response = await simulatePUFChallengeResponse(fingerprint, nonce);
      expect(response.success).toBe(true);
      expect(response.signature).toBeDefined();
      expect(response.latencyMs).toBeGreaterThan(0);
    });
  });

  describe('2. MDTS 5-Vector Trust Engine', () => {
    const mockSensor = {
      id: 'SNR-ECG-01',
      type: '12-Lead ECG',
      hardwareFingerprint: 'PUF-ECG-01',
      authStatus: 'Authenticated',
      deviceTrust: 95,
      signalQuality: 98,
    };

    const mockPatient = {
      id: 'PT-1042',
      name: 'Eleanor Vance',
      condition: 'Post-CABG Recovery',
    };

    it('evaluates normal clinical vitals with a high trust score (>=85)', () => {
      const evaluation = evaluateMeasurementTrust(
        {
          patientId: 'PT-1042',
          sensorId: 'SNR-ECG-01',
          heartRate: 72,
          spo2: 98,
          systolicBP: 120,
          diastolicBP: 80,
          temperature: 36.8,
          respirationRate: 16,
          signalQuality: 98,
        },
        mockSensor,
        mockPatient,
        undefined,
        DEFAULT_TRUST_WEIGHTS
      );

      expect(evaluation.mdts).toBeGreaterThanOrEqual(85);
      expect(evaluation.dt).toBe(95);
      expect(evaluation.sq).toBe(98);
      expect(evaluation.decision).toBe('Normal - Compress & Batch');
    });

    it('detects extreme clinical anomalies and assigns raw preservation alert', () => {
      const evaluation = evaluateMeasurementTrust(
        {
          patientId: 'PT-1042',
          sensorId: 'SNR-ECG-01',
          heartRate: 185, // Severe tachycardia
          spo2: 78, // Severe hypoxia
          systolicBP: 210, // Hypertensive emergency
          diastolicBP: 125,
          temperature: 40.5,
          respirationRate: 36,
          signalQuality: 90,
          isAbnormal: true,
        },
        mockSensor,
        mockPatient,
        undefined,
        DEFAULT_TRUST_WEIGHTS
      );

      expect(evaluation.av).toBeLessThan(60);
      expect(evaluation.decision).toContain('Abnormal');
    });
  });

  describe('3. Health and Operational Statistics API', () => {
    it('GET /api/health returns 200 OK and SQLite engine status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.database).toContain('SQLite');
    });

    it('GET /api/stats returns comprehensive system metrics', async () => {
      const res = await request(app).get('/api/stats');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('patientCount');
      expect(res.body).toHaveProperty('sensorCount');
      expect(res.body).toHaveProperty('measurementCount');
      expect(res.body).toHaveProperty('provenanceCount');
      expect(res.body).toHaveProperty('databaseIntegrityPercentage');
      expect(res.body.databaseIntegrityPercentage).toBeGreaterThanOrEqual(0);
      expect(res.body.databaseIntegrityPercentage).toBeLessThanOrEqual(100);
    });
  });

  describe('4. Patient Management (CRUD)', () => {
    it('GET /api/patients returns patient registry list', async () => {
      const res = await request(app).get('/api/patients');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('GET /api/patients/:id returns individual patient details', async () => {
      const res = await request(app).get('/api/patients/PT-1042');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('PT-1042');
      expect(res.body.name).toBe('Eleanor Vance');
    });

    it('GET /api/patients/:id returns 404 for unknown patient', async () => {
      const res = await request(app).get('/api/patients/NON_EXISTENT_ID');
      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });

    it('POST /api/patients registers a new patient with valid validation', async () => {
      const newPatient = {
        name: 'Dr. Johnathan Edwards',
        age: 58,
        gender: 'Male',
        bloodGroup: 'B+',
        condition: 'Cardiac Arrhythmia Post-Op',
        ward: 'Ward 4B - ICU',
        assignedSensors: ['SNR-ECG-01'],
        notes: 'Enrolled under surgical monitoring protocol.',
      };

      const res = await request(app).post('/api/patients').send(newPatient);
      expect(res.status).toBe(201);
      expect(res.body.name).toBe(newPatient.name);
      expect(res.body.id).toMatch(/^PT-/);

      // Verify persistence in DB
      const getRes = await request(app).get(`/api/patients/${res.body.id}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.condition).toBe(newPatient.condition);
    });

    it('POST /api/patients rejects submission when missing required fields', async () => {
      const res = await request(app).post('/api/patients').send({ name: 'Incomplete Patient' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('5. Sensor Provisioning & Hardware PUF Security', () => {
    it('GET /api/sensors returns all IoT nodes', async () => {
      const res = await request(app).get('/api/sensors');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('POST /api/sensors registers a new biometric device', async () => {
      const newSensor = {
        type: 'Continuous SpO2 Pulse Oximeter',
        patientId: 'PT-1042',
        patientName: 'Eleanor Vance',
      };

      const res = await request(app).post('/api/sensors').send(newSensor);
      expect(res.status).toBe(201);
      expect(res.body.id).toMatch(/^SNR-/);
      expect(res.body.hardwareFingerprint).toBeDefined();
    });

    it('POST /api/sensors/:id/authenticate runs hardware challenge-response', async () => {
      const res = await request(app).post('/api/sensors/SNR-ECG-01/authenticate');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.sensor.authStatus).toBe('Authenticated');
    });

    it('POST /api/sensors/:id/quarantine blocks a rogue device', async () => {
      const res = await request(app).post('/api/sensors/SNR-ECG-01/quarantine');
      expect(res.status).toBe(200);
      expect(res.body.sensor.authStatus).toBe('Quarantined');
      expect(res.body.sensor.deviceTrust).toBe(10);
    });
  });

  describe('6. Telemetry Ingestion, MDTS Scoring & Anomaly Anchoring', () => {
    it('POST /api/measurements ingests vitals, computes MDTS, and creates provenance hash', async () => {
      const payload = {
        patientId: 'PT-1042',
        sensorId: 'SNR-ECG-01',
        heartRate: 75,
        spo2: 98,
        systolicBP: 122,
        diastolicBP: 78,
        temperature: 36.9,
        respirationRate: 15,
        signalQuality: 95,
      };

      const res = await request(app).post('/api/measurements').send(payload);
      expect(res.status).toBe(201);
      expect(res.body.measurement).toBeDefined();
      expect(res.body.evaluation).toBeDefined();
      expect(res.body.provenance).toBeDefined();
      expect(res.body.provenance.dataHash).toHaveLength(64);
      expect(res.body.evaluation.mdts).toBeGreaterThanOrEqual(80);
    });

    it('POST /api/measurements triggers immediate priority block anchoring upon critical anomaly', async () => {
      const anomalyPayload = {
        patientId: 'PT-1042',
        sensorId: 'SNR-ECG-01',
        heartRate: 195, // Critical V-Tach
        spo2: 74, // Severe Hypoxia
        systolicBP: 215,
        diastolicBP: 130,
        temperature: 39.8,
        respirationRate: 34,
        signalQuality: 92,
        isAbnormal: true,
        anomalyNotes: 'Ventricular Tachycardia identified by gateway filter',
      };

      const res = await request(app).post('/api/measurements').send(anomalyPayload);
      expect(res.status).toBe(201);
      expect(res.body.measurement.isAbnormal).toBe(true);
      expect(res.body.priorityBlock).toBeDefined();
      expect(res.body.priorityBlock.eventType).toBe('Emergency Priority Anchor');
    });
  });

  describe('7. Provenance Verification, Tamper Detection & Restoration', () => {
    it('detects byte-level tampering and invalidates SHA-256 integrity', async () => {
      // 1. Get first provenance record
      const listRes = await request(app).get('/api/provenance');
      expect(listRes.status).toBe(200);
      const targetRecord = listRes.body[0];
      expect(targetRecord).toBeDefined();

      // 2. Tamper the record payload
      const tamperRes = await request(app)
        .post(`/api/provenance/${targetRecord.id}/tamper`)
        .send({
          field: 'prescription',
          value: 'Morphine 100mg IV STAT (Overdose Tampered!)',
        });

      expect(tamperRes.status).toBe(200);
      expect(tamperRes.body.record.isTampered).toBe(true);
      expect(tamperRes.body.computedHash).not.toEqual(targetRecord.dataHash);

      // 3. Verify that stats reflects the compromised record
      const statsRes = await request(app).get('/api/stats');
      expect(statsRes.body.tamperedCount).toBeGreaterThan(0);

      // 4. Restore original authentic payload
      const restoreRes = await request(app).post(`/api/provenance/${targetRecord.id}/restore`);
      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.record.isTampered).toBe(false);
      expect(restoreRes.body.originalHash).toEqual(targetRecord.dataHash);
    });
  });

  describe('8. Blockchain Merkle Batch Anchoring', () => {
    it('POST /api/blockchain/anchor aggregates unanchored records into a Merkle root block', async () => {
      const res = await request(app).post('/api/blockchain/anchor').send({
        author: 'Consortium Consensus Node #1',
      });

      expect(res.status).toBe(201);
      expect(res.body.block).toBeDefined();
      expect(res.body.block.merkleRoot).toHaveLength(64);
      expect(res.body.block.blockHeight).toBeGreaterThan(0);
      expect(res.body.block.transactionHash).toBeDefined();
    });

    it('GET /api/blockchain returns the immutable consortium ledger chain', async () => {
      const res = await request(app).get('/api/blockchain');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('9. Access Control & Emergency Break-Glass Protocol', () => {
    it('creates and approves an access request', async () => {
      const reqPayload = {
        doctorId: 'DOC-551',
        doctorName: 'Dr. Sarah Connor',
        doctorSpecialty: 'Chief of Cardiology',
        patientId: 'PT-1042',
        patientName: 'Eleanor Vance',
        requestedDurationHours: 12,
        purpose: 'Cardiology surgical pre-op evaluation',
      };

      const createRes = await request(app).post('/api/access-requests').send(reqPayload);
      expect(createRes.status).toBe(201);
      const requestId = createRes.body.id;
      expect(createRes.body.status).toBe('Pending');

      // Approve request via PATCH
      const updateRes = await request(app)
        .patch(`/api/access-requests/${requestId}`)
        .send({ status: 'Approved', reviewNotes: 'Granted by Medical Ethics Board' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.status).toBe('Approved');
    });

    it('activates and terminates an emergency break-glass grant', async () => {
      const emergencyPayload = {
        doctorId: 'DR-778',
        doctorName: 'Dr. Robert House',
        patientId: 'PT-1042',
        patientName: 'Eleanor Vance',
        reason: 'Acute cardiac arrest in ICU, immediate override required',
      };

      const grantRes = await request(app).post('/api/emergency-grants').send(emergencyPayload);
      expect(grantRes.status).toBe(201);
      const grantId = grantRes.body.id;
      expect(grantRes.body.status).toBe('Active');

      // Terminate early via POST
      const termRes = await request(app).post(`/api/emergency-grants/${grantId}/terminate`);
      expect(termRes.status).toBe(200);
      expect(termRes.body.status).toBe('Revoked');
    });
  });

  describe('10. Audit Logging & System Baseline Reset', () => {
    it('GET /api/audit-logs returns complete forensic log records', async () => {
      const res = await request(app).get('/api/audit-logs');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('POST /api/system/reset restores baseline seeded dataset', async () => {
      const res = await request(app).post('/api/system/reset');
      expect(res.status).toBe(200);
      expect(res.body.message.toLowerCase()).toContain('reset');
    });
  });
});
