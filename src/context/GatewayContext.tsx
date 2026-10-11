import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ActorRole, Patient, Sensor } from '../types';
import { dataService } from '../services/dataService';

interface GatewayContextType {
  activeRole: ActorRole;
  setActiveRole: (role: ActorRole) => void;
  selectedPatientId: string;
  setSelectedPatientId: (id: string) => void;
  selectedSensorId: string;
  setSelectedSensorId: (id: string) => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
  currentPatient?: Patient;
  currentSensor?: Sensor;
}

const GatewayContext = createContext<GatewayContextType | undefined>(undefined);

export const GatewayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeRole, setActiveRole] = useState<ActorRole>('Doctor');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('PT-1042');
  const [selectedSensorId, setSelectedSensorId] = useState<string>('SNR-ECG-01');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    dataService.getPatients().then(setPatients);
    dataService.getSensors().then(setSensors);
  }, [refreshTrigger]);

  const currentPatient = patients.find(p => p.id === selectedPatientId);
  const currentSensor = sensors.find(s => s.id === selectedSensorId);

  useEffect(() => {
    if (currentPatient && currentPatient.assignedSensors.length > 0) {
      if (!currentPatient.assignedSensors.includes(selectedSensorId)) {
        setSelectedSensorId(currentPatient.assignedSensors[0]);
      }
    }
  }, [selectedPatientId, currentPatient, selectedSensorId]);

  return (
    <GatewayContext.Provider
      value={{
        activeRole,
        setActiveRole,
        selectedPatientId,
        setSelectedPatientId,
        selectedSensorId,
        setSelectedSensorId,
        refreshTrigger,
        triggerRefresh,
        currentPatient,
        currentSensor,
      }}
    >
      {children}
    </GatewayContext.Provider>
  );
};

export const useGateway = () => {
  const ctx = useContext(GatewayContext);
  if (!ctx) throw new Error('useGateway must be used within GatewayProvider');
  return ctx;
};
