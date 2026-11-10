
import React, { useState } from 'react';
import { Appointment, AppointmentReminderOffset, Doctor } from '../types';
import { FieldError, FormModalShell, FormSection, helperClass, inputClass, labelClass } from './formFields';
import { parseLocalDateTime, toDateTimeInputValue } from '../utils/datetime';

interface Props {
    onClose: () => void;
    onSave: (appointment: Omit<Appointment, 'id' | 'notifiedOffsets'>) => void;
    doctors: Doctor[];
    /** Consulta em edição; `null`/ausente = novo agendamento. */
    editing?: Appointment | null;
}

const OTHER = '__other__';

/** Primeiro horário cheio seguinte ao agora, como valor padrão amigável. */
const defaultDateTime = (): string => {
    const date = new Date();
    date.setMinutes(0, 0, 0);
    date.setHours(date.getHours() + 1);
    return toDateTimeInputValue(date);
};

const reminderOptions: { value: AppointmentReminderOffset; label: string }[] = [
    { value: 60, label: '1 h antes' },
    { value: 1440, label: '1 dia antes' },
    { value: 0, label: 'Sem lembrete' },
];

type Errors = Partial<Record<'doctorName' | 'dateTime', string>>;

const AppointmentFormModal: React.FC<Props> = ({ onClose, onSave, doctors, editing }) => {
    const [doctorId, setDoctorId] = useState(editing?.doctorId && doctors.some(d => d.id === editing.doctorId) ? editing.doctorId : OTHER);
    const [typedName, setTypedName] = useState(editing?.doctorName ?? '');
    const [dateTime, setDateTime] = useState(editing?.dateTime ?? defaultDateTime());
    const [location, setLocation] = useState(editing?.location ?? '');
    const [reason, setReason] = useState(editing?.reason ?? '');
    const [notes, setNotes] = useState(editing?.notes ?? '');
    const [reminderOffset, setReminderOffset] = useState<AppointmentReminderOffset>(editing?.reminderOffset ?? 60);
    const [errors, setErrors] = useState<Errors>({});

    const selectedDoctor = doctors.find(d => d.id === doctorId);
    const doctorName = selectedDoctor ? selectedDoctor.name : typedName;

    const validate = (): Errors => {
        const next: Errors = {};
        if (!doctorName.trim()) next.doctorName = 'Informe o médico da consulta.';
        if (!parseLocalDateTime(dateTime)) next.dateTime = 'Informe uma data e hora válidas.';
        return next;
    };

    const clearError = (field: keyof Errors) =>
        setErrors(prev => (prev[field] ? { ...prev, [field]: undefined } : prev));

    const handleSave = () => {
        const nextErrors = validate();
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;
        onSave({
            doctorId: selectedDoctor ? selectedDoctor.id : '',
            doctorName: doctorName.trim(),
            dateTime,
            location: location.trim(),
            reason: reason.trim(),
            notes: notes.trim(),
            reminderOffset,
        });
    };

    return (
        <FormModalShell
            title={editing ? 'Editar consulta' : 'Nova consulta'}
            onClose={onClose}
            onSubmit={handleSave}
        >
            <FormSection title="Consulta">
                <div>
                    <label htmlFor="appointment-doctor" className={labelClass}>Médico *</label>
                    {doctors.length > 0 && (
                        <select
                            id="appointment-doctor"
                            value={doctorId}
                            onChange={(e) => { setDoctorId(e.target.value); clearError('doctorName'); }}
                            className={inputClass()}
                        >
                            {doctors.map(doctor => (
                                <option key={doctor.id} value={doctor.id}>
                                    {doctor.name}{doctor.specialty ? ` — ${doctor.specialty}` : ''}
                                </option>
                            ))}
                            <option value={OTHER}>Outro médico (digitar nome)</option>
                        </select>
                    )}
                    {doctors.length === 0 && (
                        <p className={helperClass}>
                            Dica: cadastre médicos na aba "Médicos" para selecioná-los aqui.
                        </p>
                    )}
                    {(!selectedDoctor || doctors.length === 0) && (
                        <input
                            type="text"
                            value={typedName}
                            onChange={(e) => { setTypedName(e.target.value); clearError('doctorName'); }}
                            className={inputClass(Boolean(errors.doctorName))}
                            aria-invalid={Boolean(errors.doctorName)}
                            aria-describedby={errors.doctorName ? 'appointment-doctor-error' : undefined}
                            placeholder="Ex.: Dr. Ana Ribeiro (cardiologista)"
                        />
                    )}
                    <FieldError id="appointment-doctor-error" message={errors.doctorName} />
                </div>
                <div>
                    <label htmlFor="appointment-datetime" className={labelClass}>Data e hora *</label>
                    <input
                        id="appointment-datetime"
                        type="datetime-local"
                        value={dateTime}
                        onChange={(e) => { setDateTime(e.target.value); clearError('dateTime'); }}
                        className={inputClass(Boolean(errors.dateTime))}
                        aria-invalid={Boolean(errors.dateTime)}
                        aria-describedby={errors.dateTime ? 'appointment-datetime-error' : undefined}
                    />
                    <FieldError id="appointment-datetime-error" message={errors.dateTime} />
                </div>
                <div>
                    <label htmlFor="appointment-location" className={labelClass}>Local</label>
                    <input
                        id="appointment-location"
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className={inputClass()}
                        placeholder="Ex.: Clínica Bem Viver — Av. Paulista, 1000"
                    />
                </div>
                <div>
                    <label htmlFor="appointment-reason" className={labelClass}>Motivo</label>
                    <input
                        id="appointment-reason"
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className={inputClass()}
                        placeholder="Ex.: Consulta de rotina / retorno"
                    />
                </div>
            </FormSection>

            <FormSection title="Lembrete">
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Lembrete">
                    {reminderOptions.map(option => (
                        <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={reminderOffset === option.value}
                            onClick={() => setReminderOffset(option.value)}
                            className={`px-2 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                reminderOffset === option.value
                                    ? 'bg-brand-blue text-white shadow-sm'
                                    : 'bg-brand-gray-100 dark:bg-brand-gray-700 text-brand-gray-600 dark:text-brand-gray-300 hover:bg-brand-gray-200 dark:hover:bg-brand-gray-600'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
                <p className={helperClass}>
                    O alarme toca com o app aberto, como nos lembretes de remédio.
                </p>
            </FormSection>

            <FormSection title="Observações">
                <div>
                    <label htmlFor="appointment-notes" className={labelClass}>Notas</label>
                    <textarea
                        id="appointment-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className={inputClass()}
                        rows={2}
                        placeholder="Ex.: levar exames anteriores, estar em jejum..."
                    />
                </div>
            </FormSection>
        </FormModalShell>
    );
};

export default AppointmentFormModal;
