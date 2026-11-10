
import React, { useState } from 'react';
import { Appointment, AppointmentReminderOffset, Doctor } from '../types';
import { XIcon } from '../constants';
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

const AppointmentFormModal: React.FC<Props> = ({ onClose, onSave, doctors, editing }) => {
    const [doctorId, setDoctorId] = useState(editing?.doctorId && doctors.some(d => d.id === editing.doctorId) ? editing.doctorId : OTHER);
    const [typedName, setTypedName] = useState(editing?.doctorName ?? '');
    const [dateTime, setDateTime] = useState(editing?.dateTime ?? defaultDateTime());
    const [location, setLocation] = useState(editing?.location ?? '');
    const [reason, setReason] = useState(editing?.reason ?? '');
    const [notes, setNotes] = useState(editing?.notes ?? '');
    const [reminderOffset, setReminderOffset] = useState<AppointmentReminderOffset>(editing?.reminderOffset ?? 60);

    const selectedDoctor = doctors.find(d => d.id === doctorId);
    const doctorName = selectedDoctor ? selectedDoctor.name : typedName;

    const handleSave = () => {
        if (!doctorName.trim()) {
            alert('Por favor, informe o médico da consulta.');
            return;
        }
        if (!parseLocalDateTime(dateTime)) {
            alert('Por favor, informe uma data e hora válidas.');
            return;
        }
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

    const inputClass = "mt-1 block w-full rounded-md border-brand-gray-300 shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm dark:bg-brand-gray-700 dark:border-brand-gray-600";
    const labelClass = "block text-sm font-medium text-brand-gray-700 dark:text-brand-gray-300";
    const radioClass = "focus:ring-brand-blue h-4 w-4 text-brand-blue border-brand-gray-300";

    const reminderOptions: { value: AppointmentReminderOffset; label: string }[] = [
        { value: 60, label: '1 hora antes' },
        { value: 1440, label: '1 dia antes' },
        { value: 0, label: 'Sem lembrete' },
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-brand-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-brand-gray-400 hover:text-brand-gray-600 dark:hover:text-brand-gray-200" aria-label="Fechar">
                    <XIcon className="w-6 h-6" />
                </button>

                <h3 className="text-lg font-medium leading-6 text-brand-gray-900 dark:text-white mb-4">
                    {editing ? 'Editar consulta' : 'Nova consulta'}
                </h3>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="appointment-doctor" className={labelClass}>Médico *</label>
                        {doctors.length > 0 ? (
                            <select
                                id="appointment-doctor"
                                value={doctorId}
                                onChange={(e) => setDoctorId(e.target.value)}
                                className={inputClass}
                            >
                                {doctors.map(doctor => (
                                    <option key={doctor.id} value={doctor.id}>
                                        {doctor.name}{doctor.specialty ? ` — ${doctor.specialty}` : ''}
                                    </option>
                                ))}
                                <option value={OTHER}>Outro médico (digitar nome)</option>
                            </select>
                        ) : (
                            <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400 mt-1">
                                Dica: cadastre médicos na aba "Médicos" para selecioná-los aqui.
                            </p>
                        )}
                        {(!selectedDoctor || doctors.length === 0) && (
                            <input
                                type="text"
                                value={typedName}
                                onChange={(e) => setTypedName(e.target.value)}
                                className={inputClass}
                                placeholder="Ex.: Dr. Ana Ribeiro (cardiologista)"
                            />
                        )}
                    </div>
                    <div>
                        <label htmlFor="appointment-datetime" className={labelClass}>Data e hora *</label>
                        <input
                            id="appointment-datetime"
                            type="datetime-local"
                            value={dateTime}
                            onChange={(e) => setDateTime(e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label htmlFor="appointment-location" className={labelClass}>Local</label>
                        <input
                            id="appointment-location"
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className={inputClass}
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
                            className={inputClass}
                            placeholder="Ex.: Consulta de rotina / retorno"
                        />
                    </div>
                    <div>
                        <label htmlFor="appointment-notes" className={labelClass}>Observações</label>
                        <textarea
                            id="appointment-notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className={inputClass}
                            rows={2}
                            placeholder="Ex.: levar exames anteriores, estar em jejum..."
                        />
                    </div>
                    <div>
                        <span className={labelClass}>Lembrete</span>
                        <div className="mt-2 space-y-2">
                            {reminderOptions.map(option => (
                                <label key={option.value} className="flex items-center">
                                    <input
                                        type="radio"
                                        name="appointment-reminder"
                                        checked={reminderOffset === option.value}
                                        onChange={() => setReminderOffset(option.value)}
                                        className={radioClass}
                                    />
                                    <span className="ml-3 text-sm dark:text-brand-gray-200">{option.label}</span>
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400 mt-1">
                            O alarme toca com o app aberto, como nos lembretes de remédio.
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-2">
                    <button onClick={onClose} className="px-4 py-2 bg-brand-gray-200 dark:bg-brand-gray-600 rounded-md hover:bg-brand-gray-300">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-brand-green text-white rounded-md hover:bg-green-600">Salvar</button>
                </div>
            </div>
        </div>
    );
};

export default AppointmentFormModal;
