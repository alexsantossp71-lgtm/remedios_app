
import React from 'react';
import { Reminder } from '../types';
import { TrashIcon, PillIcon, ClockIcon, CalendarIcon } from '../constants';

interface Props {
    reminders: Reminder[];
    onDelete: (id: string) => void;
}

const ReminderList: React.FC<Props> = ({ reminders, onDelete }) => {
    if (reminders.length === 0) {
        return <div className="text-center py-10 text-brand-gray-500">
            <PillIcon className="w-12 h-12 mx-auto mb-2"/>
            <p>Nenhum lembrete adicionado.</p>
            <p className="text-sm">Clique em "Adicionar" para começar.</p>
        </div>;
    }

    const formatFrequency = (reminder: Reminder) => {
        if (reminder.frequency.type === 'daily') return "Todos os dias";
        if (reminder.frequency.type === 'interval') return `A cada ${reminder.frequency.days} dias`;
        return "";
    };

    const formatDuration = (reminder: Reminder) => {
        if (reminder.duration.type === 'continuous') return "Uso contínuo";
        if (reminder.duration.type === 'days') return `Por ${reminder.duration.days} dias`;
        return "";
    };

    return (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {reminders.map(reminder => (
                <div key={reminder.id} className="bg-brand-gray-100 dark:bg-brand-gray-700 p-4 rounded-lg shadow-sm relative">
                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 pt-1">
                            <PillIcon className="w-6 h-6 text-brand-blue" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-lg text-brand-gray-900 dark:text-white">{reminder.medicationName}</h4>
                            <div className="text-sm text-brand-gray-600 dark:text-brand-gray-300 mt-1 space-y-1">
                                <div className="flex items-center">
                                    <ClockIcon className="w-4 h-4 mr-2" />
                                    <span>{reminder.times.join(', ')}</span>
                                </div>
                                <div className="flex items-center">
                                    <CalendarIcon className="w-4 h-4 mr-2" />
                                    <span>{formatFrequency(reminder)}</span>
                                </div>
                                <div className="flex items-center text-xs text-brand-gray-500 dark:text-brand-gray-400">
                                    <span>{formatDuration(reminder)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={() => onDelete(reminder.id)}
                        className="absolute top-2 right-2 p-1 text-brand-gray-400 hover:text-brand-red dark:hover:text-brand-red transition-colors"
                        aria-label={`Deletar lembrete para ${reminder.medicationName}`}
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default ReminderList;
