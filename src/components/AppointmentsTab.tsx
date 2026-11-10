
import React from 'react';
import { Appointment, Doctor } from '../types';
import { TrashIcon, PencilIcon, MapPinIcon, ClockIcon, BellIcon, FileTextIcon, CalendarIcon } from '../constants';
import { describeReminderOffset, formatDateTimeBR, formatTimeBR, formatWeekdayBR, parseLocalDateTime } from '../utils/datetime';

interface Props {
    appointments: Appointment[];
    doctors: Doctor[];
    onEdit: (appointment: Appointment) => void;
    onDelete: (id: string) => void;
}

const AppointmentItem: React.FC<{
    appointment: Appointment;
    specialty?: string;
    onEdit: () => void;
    onDelete: () => void;
}> = ({ appointment, specialty, onEdit, onDelete }) => {
    const when = parseLocalDateTime(appointment.dateTime);
    const dayMonth = when ? formatDateTimeBR(appointment.dateTime).slice(0, 5) : '—';
    return (
    <div className="bg-brand-gray-100 dark:bg-brand-gray-700 p-4 rounded-lg shadow-sm relative">
        <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-14 text-center bg-white dark:bg-brand-gray-600 rounded-lg py-1.5 shadow-sm">
                <div className="text-xs uppercase text-brand-gray-500 dark:text-brand-gray-300">{formatWeekdayBR(appointment.dateTime)}</div>
                <div className="text-lg font-bold text-brand-blue leading-tight">{dayMonth}</div>
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-lg text-brand-gray-900 dark:text-white break-words pr-12">{appointment.doctorName}</h4>
                {specialty && <p className="text-sm text-brand-gray-500 dark:text-brand-gray-400 -mt-0.5">{specialty}</p>}
                {appointment.reason && <p className="text-sm text-brand-gray-600 dark:text-brand-gray-300 mt-1 break-words">{appointment.reason}</p>}
                <div className="text-sm text-brand-gray-600 dark:text-brand-gray-300 mt-1 space-y-1">
                    <div className="flex items-center">
                        <ClockIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>{formatDateTimeBR(appointment.dateTime)}</span>
                    </div>
                    {appointment.location && (
                        <div className="flex items-start">
                            <MapPinIcon className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="break-words">{appointment.location}</span>
                        </div>
                    )}
                    {appointment.notes && (
                        <div className="flex items-start">
                            <FileTextIcon className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="break-words">{appointment.notes}</span>
                        </div>
                    )}
                    {appointment.reminderOffset > 0 && (
                        <div className="flex items-center text-xs text-brand-gray-500 dark:text-brand-gray-400">
                            <BellIcon className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                            <span>Lembrete {describeReminderOffset(appointment.reminderOffset).toLowerCase()}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
        <div className="absolute top-2 right-2 flex space-x-1">
            <button
                onClick={onEdit}
                className="p-1 text-brand-gray-400 hover:text-brand-blue dark:hover:text-brand-blue transition-colors"
                aria-label={`Editar consulta com ${appointment.doctorName}`}
            >
                <PencilIcon className="w-5 h-5" />
            </button>
            <button
                onClick={onDelete}
                className="p-1 text-brand-gray-400 hover:text-brand-red dark:hover:text-brand-red transition-colors"
                aria-label={`Deletar consulta com ${appointment.doctorName}`}
            >
                <TrashIcon className="w-5 h-5" />
            </button>
        </div>
    </div>
    );
};

const AppointmentsTab: React.FC<Props> = ({ appointments, doctors, onEdit, onDelete }) => {
    if (appointments.length === 0) {
        return (
            <div className="text-center py-10 text-brand-gray-500">
                <CalendarIcon className="w-12 h-12 mx-auto mb-2" />
                <p>Nenhuma consulta agendada.</p>
                <p className="text-sm">Clique em "Adicionar" para registrar sua próxima ida ao médico.</p>
            </div>
        );
    }

    const specialtyOf = (appointment: Appointment): string | undefined =>
        doctors.find(d => d.id === appointment.doctorId)?.specialty;

    const now = Date.now();
    const upcoming = appointments
        .filter(a => (parseLocalDateTime(a.dateTime)?.getTime() ?? 0) >= now)
        .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
    const past = appointments
        .filter(a => (parseLocalDateTime(a.dateTime)?.getTime() ?? 0) < now)
        .sort((a, b) => b.dateTime.localeCompare(a.dateTime));

    return (
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
            {upcoming.length > 0 && (
                <>
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-brand-gray-500 dark:text-brand-gray-400">Próximas</h4>
                    {upcoming.map(a => (
                        <AppointmentItem
                            key={a.id}
                            appointment={a}
                            specialty={specialtyOf(a)}
                            onEdit={() => onEdit(a)}
                            onDelete={() => onDelete(a.id)}
                        />
                    ))}
                </>
            )}
            {past.length > 0 && (
                <>
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-brand-gray-500 dark:text-brand-gray-400 pt-2">Anteriores</h4>
                    {past.map(a => (
                        <div key={a.id} className="opacity-75">
                            <AppointmentItem
                                appointment={a}
                                specialty={specialtyOf(a)}
                                onEdit={() => onEdit(a)}
                                onDelete={() => onDelete(a.id)}
                            />
                        </div>
                    ))}
                </>
            )}
        </div>
    );
};

export default AppointmentsTab;
