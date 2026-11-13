
import React from 'react';
import { ReminderStatus } from '../types';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '../constants';
import { MissedDose } from '../utils/missedDoses';

interface Props {
    doses: MissedDose[];
    /** Marca a dose como tomada ou ignorada (grava no histórico). */
    onMark: (reminderId: string, time: string, status: ReminderStatus) => void;
    /** Fecha sem responder; as doses seguem pendentes no calendário. */
    onClose: () => void;
}

/**
 * Aparece ao reabrir o app quando há doses de hoje que passaram do horário
 * sem resposta (o alarme tocou com o app fechado ou em segundo plano).
 */
const MissedDosesModal: React.FC<Props> = ({ doses, onMark, onClose }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4 animate-fade-in">
            <div className="w-full max-w-md rounded-t-3xl border border-white/70 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-3xl animate-slide-up">
                <div className="flex items-center gap-3 mb-1">
                    <ClockIcon className="w-8 h-8 text-brand-yellow flex-shrink-0" />
                    <h2 className="text-xl font-bold text-brand-gray-900 dark:text-white">
                        {doses.length === 1 ? 'Dose atrasada' : `${doses.length} doses atrasadas`}
                    </h2>
                </div>
                <p className="text-sm text-brand-gray-600 dark:text-brand-gray-300 mb-4">
                    Estas doses de hoje passaram do horário sem resposta:
                </p>

                <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {doses.map(({ reminder, time }) => (
                        <li
                            key={`${reminder.id}-${time}`}
                            className="flex items-center gap-2 bg-brand-gray-100 dark:bg-brand-gray-700 rounded-lg p-3"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-brand-gray-900 dark:text-white truncate">
                                    {reminder.medicationName}
                                </p>
                                <p className="text-sm text-brand-gray-500 dark:text-brand-gray-300">
                                    Horário: {time}
                                </p>
                            </div>
                            <button
                                onClick={() => onMark(reminder.id, time, ReminderStatus.TAKEN)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold bg-brand-green text-white hover:bg-green-600 transition-colors"
                                aria-label={`Marcar ${reminder.medicationName} das ${time} como tomada`}
                            >
                                <CheckCircleIcon className="w-4 h-4" />
                                Tomei
                            </button>
                            <button
                                onClick={() => onMark(reminder.id, time, ReminderStatus.SKIPPED)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold bg-brand-red text-white hover:bg-red-600 transition-colors"
                                aria-label={`Marcar ${reminder.medicationName} das ${time} como ignorada`}
                            >
                                <XCircleIcon className="w-4 h-4" />
                                Pular
                            </button>
                        </li>
                    ))}
                </ul>

                <button
                    onClick={onClose}
                    className="mt-5 w-full px-4 py-2 rounded-md text-sm font-semibold border border-brand-gray-300 dark:border-brand-gray-600 text-brand-gray-600 dark:text-brand-gray-300 hover:bg-brand-gray-100 dark:hover:bg-brand-gray-700 transition-colors"
                >
                    Responder depois
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

export default MissedDosesModal;
