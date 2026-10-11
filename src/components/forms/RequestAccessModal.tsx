import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Patient } from '../../types';
import { dataService } from '../../services/dataService';
import { useToast } from '../../context/ToastContext';

interface RequestAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  onRequestSubmitted: () => void;
}

export const RequestAccessModal: React.FC<RequestAccessModalProps> = ({
  isOpen,
  onClose,
  patients,
  onRequestSubmitted,
}) => {
  const { showToast } = useToast();
  const [doctorId] = useState('DR-881');
  const [doctorName] = useState('Dr. Sarah Jenkins');
  const [doctorSpecialty, setDoctorSpecialty] = useState('Attending Cardiologist');
  const [patientId, setPatientId] = useState(patients[0]?.id || 'PT-1042');
  const [categories, setCategories] = useState<string[]>([
    'Clinical Prescription Ledger',
    'Diagnostic Lab Reports',
  ]);
  const [purpose, setPurpose] = useState('');
  const [durationHours, setDurationHours] = useState(24);
  const [error, setError] = useState('');

  const availableCategories = [
    'Clinical Prescription Ledger',
    'Diagnostic Lab Reports',
    'Provenance Proofs',
    'Electronic Health Records',
    'Allergy & Medication Profile',
  ];

  const toggleCategory = (cat: string) => {
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose.trim()) {
      setError('Clinical justification / purpose is required');
      return;
    }
    if (categories.length === 0) {
      setError('Select at least one medical data category');
      return;
    }

    const patient = patients.find(p => p.id === patientId);

    try {
      const created = await dataService.createAccessRequest({
        doctorId,
        doctorName,
        doctorSpecialty,
        patientId,
        patientName: patient ? patient.name : 'Unknown',
        categories,
        purpose: purpose.trim(),
        requestedDurationHours: durationHours,
      });

      showToast({
        type: 'info',
        title: 'Access Request Submitted',
        message: `Request ${created.id} filed for ${created.patientName} (${durationHours}h access). Awaiting supervisor sign-off.`,
      });

      onRequestSubmitted();
      onClose();
      setPurpose('');
      setError('');
    } catch (err: any) {
      console.error(err);
      showToast({
        type: 'error',
        title: 'Request Error',
        message: 'Could not submit access request.',
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="File Clinical Telemetry Access Request"
      subtitle="Role-based cryptographic consent protocol for patient medical stream access"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Doctor ID & Name</label>
            <input
              type="text"
              value={`${doctorId} • ${doctorName}`}
              disabled
              className="w-full px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Specialty</label>
            <input
              type="text"
              value={doctorSpecialty}
              onChange={e => setDoctorSpecialty(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:border-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Target Patient *</label>
          <select
            value={patientId}
            onChange={e => setPatientId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:border-blue-500 focus:outline-hidden cursor-pointer"
          >
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.id}) — {p.condition} ({p.ward})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Requested Medical Data Categories *
          </label>
          <div className="space-y-1.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            {availableCategories.map(cat => {
              const checked = categories.includes(cat);
              return (
                <label
                  key={cat}
                  className="flex items-center gap-2.5 text-xs text-slate-700 hover:text-slate-900 cursor-pointer p-1 rounded hover:bg-slate-100"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCategory(cat)}
                    className="accent-blue-600"
                  />
                  <span>{cat}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Requested Access Window</label>
            <select
              value={durationHours}
              onChange={e => setDurationHours(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:border-blue-500 focus:outline-hidden cursor-pointer"
            >
              <option value={12}>12 Hours (Shift duration)</option>
              <option value={24}>24 Hours (Standard)</option>
              <option value={48}>48 Hours (Post-Op Window)</option>
              <option value={72}>72 Hours (Extended Observation)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Purpose & Rationale *</label>
          <textarea
            rows={2}
            placeholder="e.g. Pre-operative cardiac consultation and rhythm evaluation..."
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:border-blue-500 focus:outline-hidden"
          />
          {error && <p className="text-[11px] text-rose-600 mt-1">{error}</p>}
        </div>

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
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
          >
            Submit Access Request
          </button>
        </div>
      </form>
    </Modal>
  );
};
