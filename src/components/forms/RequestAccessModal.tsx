import React, { useState, useEffect } from 'react';
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
  const [doctorSpecialty] = useState('Attending Cardiologist');
  const [localPatients, setLocalPatients] = useState<Patient[]>(patients);
  const [patientId, setPatientId] = useState('');
  const [categories, setCategories] = useState<string[]>([
    'Clinical Prescription Ledger',
    'Diagnostic Lab Reports',
  ]);
  const [purpose, setPurpose] = useState('');
  const [durationHours, setDurationHours] = useState(24);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync and ensure patients list is loaded
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
    if (error) setError('');
  };

  const activePatients = localPatients.length > 0 ? localPatients : patients;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientId) {
      setError('Target patient is required. Please select a patient.');
      return;
    }
    if (!purpose.trim()) {
      setError('Clinical justification / purpose is required');
      return;
    }
    if (categories.length === 0) {
      setError('Select at least one medical data category');
      return;
    }

    const patient = activePatients.find(p => p.id === patientId);
    setIsSubmitting(true);

    try {
      const created = await dataService.createAccessRequest({
        doctorId,
        doctorName,
        doctorSpecialty,
        patientId,
        patientName: patient ? patient.name : 'Unknown Patient',
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
      const serverMsg = err.message || 'Could not submit access request.';
      setError(serverMsg);
      showToast({
        type: 'error',
        title: 'Request Error',
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
      title="File Clinical Telemetry Access Request"
      subtitle="Role-based cryptographic consent protocol for patient medical stream access"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#2c2623] mb-1">Requesting Physician</label>
            <input
              type="text"
              value={`${doctorName}`}
              disabled
              className="w-full px-3 py-2 rounded-xl bg-[#f5efeb] border border-[#e6dfd5] text-[#78716c] text-xs font-semibold"
            />
          </div>

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
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#2c2623] mb-1.5">
            Requested Data Categories *
          </label>
          <div className="space-y-1.5 p-3 rounded-xl bg-[#faf7f2] border border-[#e6dfd5]">
            {availableCategories.map(cat => {
              const checked = categories.includes(cat);
              return (
                <label
                  key={cat}
                  className={`flex items-center gap-2.5 p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                    checked ? 'bg-[#f5efeb] font-semibold text-[#2c2623]' : 'text-[#78716c]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCategory(cat)}
                    className="accent-[#8c6d46]"
                  />
                  <span>{cat}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#2c2623] mb-1">Requested Duration</label>
          <select
            value={durationHours}
            onChange={e => setDurationHours(parseInt(e.target.value, 10))}
            className="w-full px-3 py-2 rounded-xl bg-[#faf7f2] border border-[#d8cfc2] text-[#2c2623] text-xs focus:outline-hidden cursor-pointer"
          >
            <option value={12}>12 Hours (Single Shift)</option>
            <option value={24}>24 Hours (Full Inpatient Day)</option>
            <option value={48}>48 Hours (Observation Period)</option>
            <option value={168}>7 Days (Extended Specialist Consultation)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#2c2623] mb-1">Clinical Justification & Purpose *</label>
          <textarea
            rows={2}
            placeholder="Document why access to telemetry and clinical records is medically necessary..."
            value={purpose}
            onChange={e => {
              setPurpose(e.target.value);
              if (error) setError('');
            }}
            className="w-full px-3 py-2 rounded-xl bg-[#faf7f2] border border-[#d8cfc2] text-[#2c2623] text-xs focus:outline-hidden font-sans"
          />
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
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-[#8c6d46] hover:bg-[#745733] text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Access Request'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
