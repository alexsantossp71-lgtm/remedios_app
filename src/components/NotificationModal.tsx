
import React from 'react';
import { Reminder, ReminderStatus } from '../types';
import { CheckCircleIcon, XCircleIcon, BellIcon } from '../constants';

interface Props {
    reminder: Reminder;
    time: string;
    onAction: (reminderId: string, time: string, status: ReminderStatus) => void;
}

const NotificationModal: React.FC<Props> = ({ reminder, time, onAction }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-brand-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center transform transition-all animate-slide-up">
                <BellIcon className="w-16 h-16 text-brand-yellow mx-auto mb-4 animate-pulse" />

                <h2 className="text-2xl font-bold text-brand-gray-900 dark:text-white">Hora do Remédio!</h2>
                
                <p className="text-brand-gray-600 dark:text-brand-gray-300 mt-2">
                    Está na hora de tomar seu medicamento:
                </p>

                <div className="my-6 p-4 bg-brand-gray-100 dark:bg-brand-gray-700 rounded-lg">
                    <p className="text-xl font-semibold text-brand-blue">{reminder.medicationName}</p>
                    <p className="text-3xl font-bold text-brand-gray-800 dark:text-white mt-1">{time}</p>
                </div>
                
                <div className="flex flex-col space-y-3">
                    <button
                        onClick={() => onAction(reminder.id, time, ReminderStatus.TAKEN)}
                        className="w-full flex items-center justify-center bg-brand-green text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-green-600 transition-transform transform hover:scale-105"
                    >
                        <CheckCircleIcon className="w-6 h-6 mr-2" />
                        Confirmar que tomei
                    </button>
                    <button
                        onClick={() => onAction(reminder.id, time, ReminderStatus.SKIPPED)}
                        className="w-full flex items-center justify-center bg-brand-red text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-red-600 transition-transform transform hover:scale-105"
                    >
                        <XCircleIcon className="w-6 h-6 mr-2" />
                        Ignorar dose
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

export default NotificationModal;
