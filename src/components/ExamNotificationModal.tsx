
import React from 'react';
import { Exam } from '../types';
import { FlaskIcon, MapPinIcon } from '../constants';
import { formatDateTimeBR } from '../utils/datetime';

interface Props {
    exam: Exam;
    onDismiss: (examId: string, offsetMinutes: number) => void;
}

/**
 * Lembrete de exame agendado — reaproveita o mesmo disparo dos lembretes de
 * consulta (offset em minutos antes da hora marcada).
 */
const ExamNotificationModal: React.FC<Props> = ({ exam, onDismiss }) => {
    const close = () => onDismiss(exam.id, exam.reminderOffset ?? 0);
    const hasTime = Boolean(exam.time);
    const when = hasTime ? formatDateTimeBR(`${exam.date}T${exam.time}`) : formatDateTimeBR(exam.date);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-brand-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center transform transition-all animate-slide-up relative">
                <button onClick={close} className="absolute top-3 right-3 text-brand-gray-400 hover:text-brand-gray-600 dark:hover:text-brand-gray-200" aria-label="Fechar lembrete">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
                </button>

                <FlaskIcon className="w-16 h-16 text-brand-blue mx-auto mb-4 animate-pulse" />

                <h2 className="text-2xl font-bold text-brand-gray-900 dark:text-white">Lembrete de Exame!</h2>

                <p className="text-brand-gray-600 dark:text-brand-gray-300 mt-2">Exame agendado:</p>

                <div className="my-6 p-4 bg-brand-gray-100 dark:bg-brand-gray-700 rounded-lg space-y-1">
                    <p className="text-xl font-semibold text-brand-blue">{exam.name}</p>
                    <p className="text-lg font-bold text-brand-gray-800 dark:text-white">{when}</p>
                    {!hasTime && (
                        <p className="text-xs text-brand-gray-500 dark:text-brand-gray-400">
                            Sem horário definido — confirme no laboratório
                        </p>
                    )}
                    {exam.place && (
                        <p className="text-sm text-brand-gray-600 dark:text-brand-gray-300 flex items-center justify-center">
                            <MapPinIcon className="w-4 h-4 mr-1.5 flex-shrink-0" />
                            {exam.place}
                        </p>
                    )}
                    {exam.doctorName && (
                        <p className="text-sm text-brand-gray-600 dark:text-brand-gray-300">Médico: {exam.doctorName}</p>
                    )}
                    {exam.results && (
                        <p className="text-sm text-brand-gray-600 dark:text-brand-gray-300">{exam.results}</p>
                    )}
                </div>

                <button
                    onClick={close}
                    className="w-full flex items-center justify-center bg-brand-blue text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-blue-600 transition-transform transform hover:scale-105"
                >
                    Entendi
                </button>
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

export default ExamNotificationModal;
