import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Patient } from '../../types';
import { dataService } from '../../services/dataService';
import { useToast } from '../../context/ToastContext';
import { Flame, ShieldAlert } from 'lucide-react';

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
  const [patientId, setPatientId] = useState(patients[0]?.id || 'PT-1140');
  const [doctorId] = useState('DR-999');
  const [doctorName] = useState('Dr. Alexander Vance');
  const [hospitalLocation, setHospitalLocation] = useState('Academic Trauma Center - Resuscitation Bay 1');
  const [reason, setReason] = useState('Acute cardiorespiratory decompensation; patient unresponsive, immediate telemetry required');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [supervisorNotified, setSupervisorNotified] = useState('Chief Medical Officer / ER Attending on call');
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');

  const targetPatient = patients.find(p => p.id === patientId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Clinical emergency justification is mandatory');
      return;
    }
    if (!acknowledged) {
      setError('You must acknowledge emergency break-glass legal and audit terms');
      return;
    }

    try {
      const grant = await dataService.createEmergencyAccess({
        patientId,
        patientName: targetPatient ? targetPatient.name : 'Unknown',
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
      showToast({
        type: 'error',
        title: 'Emergency Override Failed',
        message: 'Could not grant emergency break-glass permission.',
      });
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
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
          <div className="leading-relaxed">
            <span className="font-bold">CRITICAL REGULATORY NOTICE:</span> Break-glass access bypasses normal
            patient consent check. Every telemetry packet accessed under this emergency token is cryptographically
            signed and immediately committed to the hospital blockchain audit ledger.
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Patient *</label>
            <select
              value={patientId}
              onChange={e => setPatientId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:border-rose-500 focus:outline-hidden cursor-pointer"
            >
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id}) — {p.ward} [{p.monitoringStatus}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Temporary Session Window</label>
            <select
              value={durationMinutes}
              onChange={e => setDurationMinutes(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:border-rose-500 focus:outline-hidden cursor-pointer"
            >
              <option value={15}>15 Minutes (Immediate Resuscitation)</option>
              <option value={30}>30 Minutes (Standard Code Blue Window)</option>
              <option value={60}>60 Minutes (Trauma Surgery Stabilization)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Attending Physician</label>
            <input
              type="text"
              value={`${doctorId} • ${doctorName}`}
              disabled
              className="w-full px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Hospital Trauma Location</label>
            <input
              type="text"
              value={hospitalLocation}
              onChange={e => setHospitalLocation(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:border-rose-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Clinical Emergency Justification *
          </label>
          <textarea
            rows={2}
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:border-rose-500 focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Supervisor Notification Channel</label>
          <input
            type="text"
            value={supervisorNotified}
            onChange={e => setSupervisorNotified(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:border-rose-500 focus:outline-hidden"
          />
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
          <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={e => setAcknowledged(e.target.checked)}
              className="accent-rose-600 mt-0.5"
            />
            <span>
              I certify under hospital clinical emergency regulations that this override is necessary to prevent imminent
              patient mortality, and I accept full audit accountability.
            </span>
          </label>
        </div>

        {error && <p className="text-[11px] text-rose-600 font-semibold">{error}</p>}

        <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Flame className="w-4 h-4" />
            <span>AUTHORIZE BREAK-GLASS</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
