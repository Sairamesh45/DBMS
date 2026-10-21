import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { GatewayProvider } from './context/GatewayContext';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { PatientsPage } from './pages/PatientsPage';
import { SensorsPage } from './pages/SensorsPage';
import { TrustAnalysisPage } from './pages/TrustAnalysisPage';
import { ProvenancePage } from './pages/ProvenancePage';
import { BlockchainPage } from './pages/BlockchainPage';
import { AccessControlPage } from './pages/AccessControlPage';
import { EmergencyAccessPage } from './pages/EmergencyAccessPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { MonitoringPage } from './pages/MonitoringPage';

export function App() {
  return (
    <ToastProvider>
      <GatewayProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="monitoring" element={<MonitoringPage />} />
              <Route path="patients" element={<PatientsPage />} />
              <Route path="sensors" element={<SensorsPage />} />
              <Route path="trust-analysis" element={<TrustAnalysisPage />} />
              <Route path="provenance" element={<ProvenancePage />} />
              <Route path="blockchain" element={<BlockchainPage />} />
              <Route path="access-control" element={<AccessControlPage />} />
              <Route path="emergency-access" element={<EmergencyAccessPage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </GatewayProvider>
    </ToastProvider>
  );
}

export default App;
