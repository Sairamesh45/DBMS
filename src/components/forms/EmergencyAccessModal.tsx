import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Patient } from '../../types';
import { dataService } from '../../services/dataService';
import { useToast } from '../../context/ToastContext';
import { ShieldAlert } from 'lucide-react';

interface EmergencyAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  onGrantCreated: () => void;
}

export const EmergencyAccessModal: React.FC<EmergencyAccessModalProps> = ({
  isOpen,
  onClose,
  patients,
  onGrantCreated,
}) => {
  const { showToast } = useToast();
  const [localPatients, setLocalPatients] = useState<Patient[]>(patients);
  const [patientId, setPatientId] = useState('');
  const [doctorId] = useState('DR-999');
  const [doctorName] = useState('Dr. Alexander Vance');
  const [hospitalLocation, setHospitalLocation] = useState('Academic Trauma Center - Resuscitation Bay 1');
  const [reason, setReason] = useState('Acute cardiorespiratory decompensation; patient unresponsive, immediate telemetry required');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [supervisorNotified, setSupervisorNotified] = useState('Chief Medical Officer / ER Attending on call');
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setError('');

    const resolvePatients = async () => {
      let activeList = patients;
      if (!activeList || activeList.length === 0) {
        try {
          activeList = await dataService.getPatients();
        } catch (e) {
          console.warn('Could not load patients list:', e);
          activeList = [];
        }
      }
      setLocalPatients(activeList);
      if (activeList.length > 0) {
        setPatientId(prev => (prev && activeList.some(p => p.id === prev) ? prev : activeList[0].id));
      }
    };

    resolvePatients();
  }, [isOpen, patients]);

  const activePatients = localPatients.length > 0 ? localPatients : patients;
  const targetPatient = activePatients.find(p => p.id === patientId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientId) {
      setError('Please select a target patient');
      return;
    }
    if (!reason.trim()) {
      setError('Clinical emergency justification is mandatory');
      return;
    }
    if (!acknowledged) {
      setError('You must acknowledge emergency break-glass legal and audit terms');
      return;
    }

    setIsSubmitting(true);

    try {
      const grant = await dataService.createEmergencyAccess({
        patientId,
        patientName: targetPatient ? targetPatient.name : 'Unknown Patient',
        doctorId,
        doctorName,
        hospitalLocation,
        reason: reason.trim(),
        dataScope: ['Emergency Medical History', 'Prescription Ledger Override', 'Critical Allergy Profile'],
        durationMinutes,
        supervisorNotified,
      });

      showToast({
        type: 'warning',
        title: 'BREAK-GLASS OVERRIDE ACTIVATED',
        message: `Temporary emergency session (${durationMinutes} min) granted for ${grant.patientName}. Immutable audit log committed to blockchain!`,
        duration: 7000,
      });

      onGrantCreated();
      onClose();
      setError('');
    } catch (err: any) {
      console.error(err);
      const serverMsg = err.message || 'Could not grant emergency break-glass permission.';
      setError(serverMsg);
      showToast({
        type: 'error',
        title: 'Emergency Override Failed',
        message: serverMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Initiate Emergency Break-Glass Override"
      subtitle="Immediate temporary clinical bypass protocol for life-threatening emergencies"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Warning Callout */}
        <div className="p-3.5 rounded-xl bg-[#fdf3f3] border border-[#f5cacc] text-[#9e2a2b] text-xs flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-[#9e2a2b] shrink-0 mt-0.5 animate-pulse" />
          <div className="leading-relaxed">
            <span className="font-bold">CRITICAL REGULATORY NOTICE:</span> Break-glass access bypasses normal
            patient consent check. Every telemetry packet accessed under this emergency token is cryptographically
            signed and immediately committed to the hospital blockchain audit ledger.
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#2c2623] mb-1">Target Patient *</label>
            <select
              value={patientId}
              onChange={e => {
                setPatientId(e.target.value);
                if (error) setError('');
              }}
              className="w-full px-3 py-2 rounded-xl bg-[#faf7f2] border border-[#d8cfc2] text-[#2c2623] text-xs focus:outline-hidden cursor-pointer"
            >
              {activePatients.length === 0 ? (
                <option value="">Loading patients...</option>
              ) : (
                activePatients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id}) • {p.ward}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2c2623] mb-1">Emergency Attending Doctor</label>
            <input
              type="text"
              value={`${doctorName} (${doctorId})`}
              disabled
              className="w-full px-3 py-2 rounded-xl bg-[#f5efeb] border border-[#e6dfd5] text-[#78716c] text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#2c2623] mb-1">Clinical Override Justification *</label>
          <textarea
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#faf7f2] border border-[#d8cfc2] text-[#2c2623] text-xs focus:outline-hidden font-sans"
            placeholder="Document clinical necessity (e.g. cardiac arrest, trauma resuscitation)..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#2c2623] mb-1">Session Duration</label>
            <select
              value={durationMinutes}
              onChange={e => setDurationMinutes(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 rounded-xl bg-[#faf7f2] border border-[#d8cfc2] text-[#2c2623] text-xs focus:outline-hidden cursor-pointer"
            >
              <option value={15}>15 Minutes (Rapid Triage)</option>
              <option value={30}>30 Minutes (Standard Trauma Bay)</option>
              <option value={60}>60 Minutes (Operating Suite Extended)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2c2623] mb-1">ER Supervisor Notified</label>
            <input
              type="text"
              value={supervisorNotified}
              onChange={e => setSupervisorNotified(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#faf7f2] border border-[#d8cfc2] text-[#2c2623] text-xs focus:outline-hidden"
            />
          </div>
        </div>

        {/* Legal Acknowledgment */}
        <div className="p-3 rounded-xl bg-[#faf7f2] border border-[#e6dfd5] flex items-start gap-2.5">
          <input
            type="checkbox"
            id="acknowledge"
            checked={acknowledged}
            onChange={e => setAcknowledged(e.target.checked)}
            className="mt-0.5 accent-[#9e2a2b] cursor-pointer"
          />
          <label htmlFor="acknowledge" className="text-[11px] text-[#2c2623] cursor-pointer">
            I certify that this break-glass override is medically required under emergency clinical protocol.
            I understand this session is immutably timestamped on the consortium blockchain and subject to immediate
            audit review.
          </label>
        </div>

        {error && <p className="text-xs text-[#9e2a2b] font-medium">{error}</p>}

        <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#e6dfd5]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#faf7f2] hover:bg-[#f5efeb] text-[#78716c] border border-[#d8cfc2] text-xs font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#9e2a2b] hover:bg-[#7e1f20] text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Authorize Break-Glass Override</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
