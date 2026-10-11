# MEDGUARD | Medical Data Trust Gateway
### Blockchain-Enabled Hardware Trust Gateway for Tamper-Proof Electronic Health Monitoring
**BCSE302P – Database Systems Lab Project**

---

## 🏥 Overview

**MEDGUARD** is a cyber-clinical data trust gateway prototype engineered for tamper-proof continuous health monitoring. In critical electronic health systems, patient biometric streams (such as ECG, pulse oximetry, blood pressure, and core temperature) must be authenticated at the hardware boundary, mathematically evaluated for trustworthiness, adaptively compressed or preserved, and immutably anchored to a blockchain ledger.

This prototype provides an interactive clinical workstation and Security Operations Center (SOC) dashboard demonstrating:
1. **Hardware Identity & Physical Unclonable Function (PUF) Authentication**
2. **Multi-Dimensional Medical Data Trust Scoring (MDTS)**
3. **Cryptographic SHA-256 Data Provenance & Chain Linkage**
4. **Live Data Tampering Detection (Browser-side Web Crypto API Verification)**
5. **Hierarchical Merkle Tree Construction & Consortium Blockchain Anchoring**
6. **Life-Critical Emergency Break-Glass Access Protocol**
7. **Role-Based Access Control (RBAC) & Verifiable Audit Logging**

---

## 🛠️ Technology Stack

- **Framework**: React 19 with Vite 8 & TypeScript
- **Styling**: Tailwind CSS v4 (Clinical SOC Dark Mode Theme)
- **Icons**: Lucide React
- **Visualization**: Recharts (Radar charts, distribution bars) & Custom HTML5 Canvas (Phosphor 500Hz ECG sweep)
- **Cryptography**: Web Crypto API (`window.crypto.subtle.digest` SHA-256)
- **Persistence**: Centralized Typed Data-Service Layer with LocalStorage synchronizer

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open **[http://127.0.0.1:5173/](http://127.0.0.1:5173/)** in your browser.

### 3. Build for Production
```bash
npm run build
```

---

## 🧭 Live Demonstration Walkthrough for Lab Evaluation

### 1. Overview Dashboard (`/dashboard`)
- **Key Metrics**: 6 Registered demo patients, 11 medical hardware sensors, active MDTS trust gauge, provenance records, and blockchain block height.
- **Continuous 12-Lead ECG Waveform**: Real-time canvas oscilloscope rendering P-Q-R-S-T waves with medical grid lines.
- **Top Bar Controls**: Toggle streaming (`Pause / Resume`), switch between **Doctor**, **Admin**, **Auditor**, and **Patient** roles.

### 2. Live Monitoring Workstation (`/monitoring`)
- Select patient (e.g., **Eleanor Vance - PT-1042** or **David K. O'Connor - PT-1140**).
- Click **"Simulate Abnormal Reading"**:
  - Telemetry triggers acute ventricular tachycardia and hypoxic desaturation (SpO2 drops to 87%).
  - Anomaly Value ($AV$) drops, MDTS updates, and diagnostic waveform is flagged.
  - Immediate emergency alert banner triggers.
- Click **"Simulate Signal Noise"**:
  - Drops Signal Quality ($SQ < 65\%$), triggering the gateway's reacquisition challenge.
- Click **"Reset Baseline"** to return to normal sinus rhythm.

### 3. Mathematical Trust Engine (`/trust-analysis`)
Demonstrates the proposed formula:
$$\text{MDTS} = (w_{DT} \cdot \text{DT}) + (w_{SQ} \cdot \text{SQ}) + (w_{AV} \cdot \text{AV}) + (w_{TC} \cdot \text{TC}) + (w_{PH} \cdot \text{PH})$$
- **DT (Device Trust)**: Hardware PUF challenge-response validation score.
- **SQ (Signal Quality)**: Electrode impedance and SNR check.
- **AV (Anomaly Value)**: Physiological deviation from normal boundaries.
- **TC (Temporal Consistency)**: Dynamic inter-packet rate-of-change check.
- **PH (Patient-History Consistency)**: Chronic condition EHR correlation.
- **Interactive Weight Sliders**: Adjust weights in real time and inspect the 5-vector Radar chart and deterministic Gateway decision rules.

### 4. Data Provenance & Tamper Detection (`/provenance`)
- Inspect the visual 7-stage processing pipeline.
- View the provenance ledger containing genuine SHA-256 payload digests and previous-record chain pointers.
- **Demonstrate Data Tampering**:
  1. Click **"Verify Hash"** on any record to view its canonical JSON payload and Web Crypto SHA-256 digest.
  2. Click **"Inject Fake Telemetry"** (changes Heart Rate from 74 to 150 bpm).
  3. **Result**: The recomputed SHA-256 diverges from the anchored hash. An immediate **CRITICAL INTEGRITY FAILURE: TAMPERED** banner appears!
  4. Click **"Restore Authentic Payload"** to demonstrate cryptographic verification recovery.

### 5. Blockchain Explorer & Merkle Tree (`/blockchain`)
- Visual hierarchical **Merkle Tree**:
  - 4 Provenance Leaf Hashes ($H_1, H_2, H_3, H_4$).
  - Intermediate Branch Hashes ($H_{12}, H_{34}$).
  - Blockchain Anchored Root ($H_{ROOT}$).
- Click **"Anchor Current Batch Now"** to simulate Proof-of-Authority (PoA) consortium rollup and block generation.

### 6. Emergency Break-Glass Protocol (`/emergency-access`)
- Displays active temporary access grants with live countdown timers.
- Click **"Initiate Break-Glass Request"** to launch the life-critical override wizard:
  - Select trauma patient, attending physician, and clinical justification.
  - Acknowledges audit terms and issues a 30-minute time-bounded temporary token.
  - Automatically commits an immutable event to the blockchain audit log.

### 7. Access Control & Patient Consent (`/access-control`)
- Manage doctor telemetry access requests with interactive **Approve**, **Reject**, and **Revoke** controls.
- View global GDPR/HIPAA patient consent master policies.

### 8. System Audit Ledger (`/audit-logs`)
- Search and filter events across **Authentication**, **Telemetry**, **Access Control**, **Emergency**, and **Security Incident** categories.
- Click **"Export Audit Log"** to download verifiable JSON compliance reports.

---

## 🗄️ Database Architecture Readiness (For Next Stage)

All domain entities in `src/types/index.ts` and `src/services/dataService.ts` are cleanly isolated into relational entities ready for backend persistence:
- `Patients`
- `Sensors`
- `MedicalMeasurements`
- `TrustEvaluations`
- `ProvenanceRecords`
- `BlockchainAnchoringEvents`
- `AccessRequests`
- `EmergencyAccessGrants`
- `AuditLogs`

---

## ⚠️ Academic Disclaimer
*This project is an academic simulation built for the BCSE302P Database Systems Lab. Hardware PUF tokens, medical measurements, and blockchain anchoring are simulated for educational demonstration.*
