
import React from 'react';
import { Appointment } from '../types';
import { CalendarIcon, MapPinIcon, PhoneIcon } from '../constants';
import { describeReminderOffset, formatDateTimeBR } from '../utils/datetime';

interface Props {
    appointment: Appointment;
    offsetMinutes: number;
    /** Telefone do médico vinculado, se houver, para o botão "Ligar". */
    doctorPhone?: string;
    onDismiss: (appointmentId: string, offsetMinutes: number) => void;
}

const AppointmentNotificationModal: React.FC<Props> = ({ appointment, offsetMinutes, doctorPhone, onDismiss }) => {
    const close = () => onDismiss(appointment.id, offsetMinutes);

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4 animate-fade-in">
            <div className="w-full max-w-md rounded-t-3xl border border-white/70 bg-white p-6 text-center shadow-2xl transition-all dark:border-slate-700 dark:bg-slate-900 sm:rounded-3xl animate-slide-up relative">
                <button onClick={close} className="absolute top-3 right-3 rounded-xl bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700" aria-label="Fechar lembrete">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
                </button>

                <CalendarIcon className="w-16 h-16 text-brand-blue mx-auto mb-4 animate-pulse" />

                <h2 className="text-2xl font-bold text-brand-gray-900 dark:text-white">Lembrete de Consulta!</h2>

                <p className="text-brand-gray-600 dark:text-brand-gray-300 mt-2">
                    Sua consulta é {describeReminderOffset(offsetMinutes).toLowerCase()}:
                </p>

                <div className="my-6 p-4 bg-brand-gray-100 dark:bg-brand-gray-700 rounded-lg space-y-1">
                    <p className="text-xl font-semibold text-brand-blue">{appointment.doctorName}</p>
                    <p className="text-lg font-bold text-brand-gray-800 dark:text-white">{formatDateTimeBR(appointment.dateTime)}</p>
                    {appointment.location && (
                        <p className="text-sm text-brand-gray-600 dark:text-brand-gray-300 flex items-center justify-center">
                            <MapPinIcon className="w-4 h-4 mr-1.5 flex-shrink-0" />
                            {appointment.location}
                        </p>
                    )}
                    {appointment.reason && (
                        <p className="text-sm text-brand-gray-600 dark:text-brand-gray-300">{appointment.reason}</p>
                    )}
                </div>

                <div className="flex flex-col space-y-3">
                    {doctorPhone && (
                        <a
                            href={`tel:${doctorPhone.replace(/[^\d+]/g, '')}`}
                            className="w-full flex items-center justify-center bg-brand-gray-200 dark:bg-brand-gray-600 text-brand-gray-800 dark:text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-brand-gray-300 dark:hover:bg-brand-gray-500 transition-transform transform hover:scale-105"
                        >
                            <PhoneIcon className="w-5 h-5 mr-2" />
                            Ligar para a clínica
                        </a>
                    )}
                    <button
                        onClick={close}
                        className="w-full flex items-center justify-center bg-brand-blue text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-blue-600 transition-transform transform hover:scale-105"
                    >
                        Entendi
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }

                @keyframes slide-up {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slide-up { animation: slide-up 0.4s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default AppointmentNotificationModal;
