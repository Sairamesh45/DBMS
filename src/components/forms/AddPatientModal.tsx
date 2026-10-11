import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Sensor } from '../../types';
import { dataService } from '../../services/dataService';
import { useToast } from '../../context/ToastContext';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableSensors: Sensor[];
  onPatientAdded: () => void;
}

export const AddPatientModal: React.FC<AddPatientModalProps> = ({
  isOpen,
  onClose,
  availableSensors,
  onPatientAdded,
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [condition, setCondition] = useState('');
  const [ward, setWard] = useState('');
  const [selectedSensors, setSelectedSensors] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleSensor = (sensorId: string) => {
    setSelectedSensors(prev =>
      prev.includes(sensorId) ? prev.filter(id => id !== sensorId) : [...prev, sensorId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Patient name is required';
    const ageNum = parseInt(age, 10);
    if (!age || isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
      newErrors.age = 'Valid age (1-120) is required';
    }
    if (!condition.trim()) newErrors.condition = 'Clinical condition diagnosis is required';
    if (!ward.trim()) newErrors.ward = 'Hospital ward/bed assignment is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const created = await dataService.createPatient({
        name: name.trim(),
        age: ageNum,
        gender,
        bloodGroup,
        condition: condition.trim(),
        ward: ward.trim(),
        assignedSensors: selectedSensors,
        monitoringStatus: 'Active',
        notes: notes.trim() || 'Admitted for gateway telemetry monitoring.',
      });

      showToast({
        type: 'success',
        title: 'Patient Enrolled',
        message: `${created.name} registered as ${created.id} with ${selectedSensors.length} assigned sensor(s).`,
      });

      onPatientAdded();
      onClose();
      // Reset form
      setName('');
      setAge('');
      setCondition('');
      setWard('');
      setSelectedSensors([]);
      setNotes('');
      setErrors({});
    } catch (err: any) {
      console.error(err);
      showToast({
        type: 'error',
        title: 'Enrollment Error',
        message: 'Failed to create patient record.',
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enroll New Patient into Telemetry Gateway"
      subtitle="Register electronic health profile and bind hardware medical sensors"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              placeholder="e.g. Robert Hansen"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:border-blue-500 focus:outline-hidden"
            />
            {errors.name && <p className="text-[11px] text-rose-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Age *</label>
            <input
              type="number"
              placeholder="e.g. 58"
              value={age}
              onChange={e => setAge(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:border-blue-500 focus:outline-hidden"
            />
            {errors.age && <p className="text-[11px] text-rose-600 mt-1">{errors.age}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
            <select
              value={gender}
              onChange={e => setGender(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:border-blue-500 focus:outline-hidden cursor-pointer"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
            <select
              value={bloodGroup}
              onChange={e => setBloodGroup(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:border-blue-500 focus:outline-hidden cursor-pointer"
            >
              {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Condition / Diagnosis *</label>
          <input
            type="text"
            placeholder="e.g. Congestive Heart Failure, NYHA Class II"
            value={condition}
            onChange={e => setCondition(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:border-blue-500 focus:outline-hidden"
          />
          {errors.condition && <p className="text-[11px] text-rose-600 mt-1">{errors.condition}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Hospital Ward & Bed *</label>
          <input
            type="text"
            placeholder="e.g. Cardio-Thoracic Ward Bed 09"
            value={ward}
            onChange={e => setWard(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:border-blue-500 focus:outline-hidden"
          />
          {errors.ward && <p className="text-[11px] text-rose-600 mt-1">{errors.ward}</p>}
        </div>

        {/* Assigned sensors */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Assign Available Medical Hardware Sensors
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 rounded-lg bg-slate-50 border border-slate-200">
            {availableSensors.map(sensor => {
              const isSelected = selectedSensors.includes(sensor.id);
              return (
                <div
                  key={sensor.id}
                  onClick={() => toggleSensor(sensor.id)}
                  className={`cursor-pointer flex items-center justify-between p-2 rounded border text-xs transition-colors ${
                    isSelected
                      ? 'bg-blue-50 border-blue-500 text-blue-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="truncate">
                    <div className="font-semibold text-slate-900">{sensor.id}</div>
                    <div className="text-[10px] text-slate-500">{sensor.type}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="accent-blue-600 pointer-events-none"
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Notes (Optional)</label>
          <textarea
            rows={2}
            placeholder="Additional baseline notes or precautions..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:border-blue-500 focus:outline-hidden"
          />
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
            Register Patient
          </button>
        </div>
      </form>
    </Modal>
  );
};
