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
import { DEFAULT_TRUST_WEIGHTS } from './trustEngine';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errMsg = `Request failed: ${res.status} ${res.statusText}`;
    try {
      const errObj = await res.json();
      if (errObj.error) errMsg = errObj.error;
    } catch {}
    throw new Error(errMsg);
  }

  return res.json();
}

export interface SystemStats {
  patientCount: number;
  sensorCount: number;
  activeSensors: number;
  measurementCount: number;
  provenanceCount: number;
  tamperedCount: number;
  databaseIntegrityPercentage: number;
  consortiumBlockHeight: number;
  blockCount: number;
  activeEmergencySessions: number;
  pendingAccessRequests: number;
  abnormalReadingsCount: number;
  storageMismatches: number;
}

export class DataService {
  // --- System Stats ---
  async getStats(): Promise<SystemStats> {
    return fetchJson<SystemStats>(`${API_BASE}/stats`);
  }

  // --- Patients API ---
  async getPatients(): Promise<Patient[]> {
    return fetchJson<Patient[]>(`${API_BASE}/patients`);
  }

  async getPatientById(id: string): Promise<Patient | undefined> {
    try {
      return await fetchJson<Patient>(`${API_BASE}/patients/${id}`);
    } catch {
      return undefined;
    }
  }

  async createPatient(data: Omit<Patient, 'id' | 'latestTrustScore' | 'latestMeasurementTime'>): Promise<Patient> {
    return fetchJson<Patient>(`${API_BASE}/patients`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePatient(id: string, data: Partial<Patient>): Promise<Patient> {
    return fetchJson<Patient>(`${API_BASE}/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePatient(id: string): Promise<void> {
    await fetchJson(`${API_BASE}/patients/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Sensors API ---
  async getSensors(): Promise<Sensor[]> {
    return fetchJson<Sensor[]>(`${API_BASE}/sensors`);
  }

  async getSensorById(id: string): Promise<Sensor | undefined> {
    try {
      return await fetchJson<Sensor>(`${API_BASE}/sensors/${id}`);
    } catch {
      return undefined;
    }
  }

  async createSensor(sensorData: Omit<Sensor, 'id'>): Promise<Sensor> {
    return fetchJson<Sensor>(`${API_BASE}/sensors`, {
      method: 'POST',
      body: JSON.stringify(sensorData),
    });
  }

  async authenticateSensor(id: string): Promise<{ success: boolean; latencyMs: number; message: string; sensor: Sensor }> {
    return fetchJson<{ success: boolean; latencyMs: number; message: string; sensor: Sensor }>(
      `${API_BASE}/sensors/${id}/authenticate`,
      { method: 'POST' }
    );
  }

  async quarantineSensor(id: string): Promise<Sensor> {
    const res = await fetchJson<{ success: boolean; sensor: Sensor }>(
      `${API_BASE}/sensors/${id}/quarantine`,
      { method: 'POST' }
    );
    return res.sensor;
  }

  // --- Telemetry & Measurements API ---
  async getMeasurements(patientId?: string, limit?: number): Promise<MedicalMeasurement[]> {
    let url = `${API_BASE}/measurements`;
    const params = new URLSearchParams();
    if (patientId) params.append('patientId', patientId);
    if (limit) params.append('limit', limit.toString());
    if (params.toString()) url += `?${params.toString()}`;
    return fetchJson<MedicalMeasurement[]>(url);
  }

  async recordMeasurement(data: Omit<MedicalMeasurement, 'id' | 'timestamp'>): Promise<{
    measurement: MedicalMeasurement;
    evaluation: TrustEvaluation;
    provenance: ProvenanceRecord;
    priorityBlock?: BlockchainAnchoringEvent;
  }> {
    return fetchJson(`${API_BASE}/measurements`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- Provenance & Tampering Demo API ---
  async getProvenanceRecords(): Promise<ProvenanceRecord[]> {
    return fetchJson<ProvenanceRecord[]>(`${API_BASE}/provenance`);
  }

  async verifyProvenance(recordId: string): Promise<{
    isValid: boolean;
    computedHash: string;
    expectedHash: string;
    isTampered: boolean;
  }> {
    return fetchJson(`${API_BASE}/provenance/${recordId}/verify`, {
      method: 'POST',
    });
  }

  async simulateTampering(recordId: string, tamperedField: string, fakeValue: any): Promise<{
    record: ProvenanceRecord;
    computedHash: string;
  }> {
    return fetchJson(`${API_BASE}/provenance/${recordId}/tamper`, {
      method: 'POST',
      body: JSON.stringify({ field: tamperedField, value: fakeValue }),
    });
  }

  async restoreOriginalPayload(recordId: string): Promise<ProvenanceRecord> {
    const res = await fetchJson<{ record: ProvenanceRecord }>(
      `${API_BASE}/provenance/${recordId}/restore`,
      { method: 'POST' }
    );
    return res.record;
  }

  // --- Blockchain Anchoring API ---
  async getBlockchainEvents(): Promise<BlockchainAnchoringEvent[]> {
    return fetchJson<BlockchainAnchoringEvent[]>(`${API_BASE}/blockchain/blocks`);
  }

  async anchorPendingBatch(): Promise<BlockchainAnchoringEvent> {
    const res = await fetchJson<{ block: BlockchainAnchoringEvent }>(
      `${API_BASE}/blockchain/anchor`,
      { method: 'POST' }
    );
    return res.block;
  }

  async getMerkleTree(): Promise<{
    tree: { root: string; layers: string[][]; leaves: string[] };
    leaves: Array<{ id: string; label: string; hash: string }>;
  }> {
    return fetchJson(`${API_BASE}/blockchain/merkle-tree`);
  }

  // --- Access Control API ---
  async getAccessRequests(): Promise<AccessRequest[]> {
    return fetchJson<AccessRequest[]>(`${API_BASE}/access-requests`);
  }

  async createAccessRequest(data: Omit<AccessRequest, 'id' | 'status' | 'requestedAt'>): Promise<AccessRequest> {
    return fetchJson<AccessRequest>(`${API_BASE}/access-requests`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async approveAccessRequest(id: string): Promise<AccessRequest> {
    return fetchJson<AccessRequest>(`${API_BASE}/access-requests/${id}/approve`, {
      method: 'PUT',
    });
  }

  async rejectAccessRequest(id: string): Promise<AccessRequest> {
    return fetchJson<AccessRequest>(`${API_BASE}/access-requests/${id}/reject`, {
      method: 'PUT',
    });
  }

  async revokeAccess(id: string): Promise<AccessRequest> {
    return fetchJson<AccessRequest>(`${API_BASE}/access-requests/${id}/revoke`, {
      method: 'PUT',
    });
  }

  // --- Emergency Access (Break-Glass) API ---
  async getEmergencyGrants(): Promise<EmergencyAccessGrant[]> {
    return fetchJson<EmergencyAccessGrant[]>(`${API_BASE}/emergency-grants`);
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
    return fetchJson<EmergencyAccessGrant>(`${API_BASE}/emergency-grants`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async revokeEmergencyAccess(id: string): Promise<EmergencyAccessGrant> {
    return fetchJson<EmergencyAccessGrant>(`${API_BASE}/emergency-grants/${id}/terminate`, {
      method: 'PUT',
    });
  }

  // --- Audit Logs API ---
  async getAuditLogs(filters?: { search?: string; category?: string; severity?: string; limit?: number }): Promise<AuditLog[]> {
    let url = `${API_BASE}/audit-logs`;
    if (filters) {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (params.toString()) url += `?${params.toString()}`;
    }
    return fetchJson<AuditLog[]>(url);
  }

  async logAudit(entry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    return fetchJson<AuditLog>(`${API_BASE}/audit-logs`, {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  }

  // --- Weights & Config ---
  async getTrustWeights(): Promise<TrustWeights> {
    try {
      return await fetchJson<TrustWeights>(`${API_BASE}/trust/weights`);
    } catch {
      return DEFAULT_TRUST_WEIGHTS;
    }
  }

  async setTrustWeights(weights: TrustWeights): Promise<TrustWeights> {
    return fetchJson<TrustWeights>(`${API_BASE}/trust/weights`, {
      method: 'PUT',
      body: JSON.stringify(weights),
    });
  }

  async calculateTrust(params: { dt: number; sq: number; av: number; tc: number; ph: number }): Promise<{
    mdts: number;
    decision: GatewayDecision;
    alertLevel: string;
    weights: TrustWeights;
    parameters: { dt: number; sq: number; av: number; tc: number; ph: number };
  }> {
    return fetchJson(`${API_BASE}/trust/calculate`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async resetDemoData(): Promise<void> {
    await fetchJson(`${API_BASE}/system/reset`, {
      method: 'POST',
    });
  }
}

// Central singleton instance
export const dataService = new DataService();
